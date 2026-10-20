"use client";

import {
  Component,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import dynamic from "next/dynamic";
import { FlatView } from "@/components/FlatView";
import { HudOverlay } from "@/components/HudOverlay";
import { SidePanel } from "@/components/SidePanel";
import {
  getSceneQualityProfile,
  readClientDeviceEnvironment,
  resolveActiveViewMode,
  SMALL_SCREEN_MAX_WIDTH,
} from "@/lib/device";
import { useLocale } from "@/lib/locale";
import {
  resolveKeyboardAction,
  type SectionId,
} from "@/lib/solar-system";

function SceneLoadingFallback() {
  const { content: c } = useLocale();
  return (
    <div
      className="flex h-full w-full items-center justify-center bg-bg"
      aria-live="polite"
    >
      <span className="micro text-muted">{c.ui.loadingScene}</span>
    </div>
  );
}

const SolarCanvas3D = dynamic(() => import("@/components/SolarCanvas3D"), {
  ssr: false,
  loading: () => <SceneLoadingFallback />,
});

class CanvasErrorBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { onError: () => void; children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

function subscribeReducedMotion(onStoreChange: () => void): () => void {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return () => {};
  }
  const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
  mql.addEventListener("change", onStoreChange);
  return () => mql.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot(): boolean {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot(): boolean {
  return false;
}

function subscribeViewportWidth(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener("resize", onStoreChange);
  return () => window.removeEventListener("resize", onStoreChange);
}

function getViewportWidthSnapshot(): number {
  if (typeof window === "undefined") {
    return 1280;
  }
  return window.innerWidth || 1280;
}

function getViewportWidthServerSnapshot(): number {
  return 1280;
}

function subscribeHydrated(): () => void {
  return () => {};
}

function getHydratedClientSnapshot(): boolean {
  return true;
}

function getHydratedServerSnapshot(): boolean {
  return false;
}

export function SolarScene() {
  const { content: c } = useLocale();
  const s = c.sections;

  const isHydrated = useSyncExternalStore(
    subscribeHydrated,
    getHydratedClientSnapshot,
    getHydratedServerSnapshot
  );

  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  const viewportWidth = useSyncExternalStore(
    subscribeViewportWidth,
    getViewportWidthSnapshot,
    getViewportWidthServerSnapshot
  );

  const [viewOverride, setViewOverride] = useState<"3d" | "flat" | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const params = new URLSearchParams(window.location.search);
      const view = params.get("view");
      if (view === "3d" || view === "flat") return view;
    } catch {
      /* ignore */
    }
    return null;
  });

  const [activeId, setActiveId] = useState<SectionId | null>(null);
  const [hoveredId, setHoveredId] = useState<SectionId | null>(null);

  const deviceEnv = useMemo(() => {
    if (!isHydrated) {
      return {
        prefersReducedMotion,
        webglAvailable: true,
        viewportWidth,
      };
    }
    const env = readClientDeviceEnvironment(prefersReducedMotion);
    return {
      ...env,
      viewportWidth,
    };
  }, [isHydrated, prefersReducedMotion, viewportWidth]);

  const qualityProfile = useMemo(
    () => getSceneQualityProfile(deviceEnv),
    [deviceEnv]
  );

  const activeViewMode = resolveActiveViewMode(deviceEnv, viewOverride);
  const isFlatMode = activeViewMode === "flat";
  const isMobile =
    qualityProfile.isTouchOrCompact || viewportWidth <= SMALL_SCREEN_MAX_WIDTH;

  const selectBody = useCallback((id: SectionId) => {
    setActiveId(id);
  }, []);

  const returnToOverview = useCallback(() => {
    setActiveId(null);
  }, []);

  const handleCanvasError = useCallback(() => {
    setViewOverride("flat");
  }, []);

  const switchToFlat = useCallback(() => {
    setViewOverride("flat");
  }, []);

  const switchTo3D = useCallback(() => {
    setViewOverride("3d");
  }, []);

  // Keyboard navigation: 1-6 keys, Arrow keys, Escape
  useEffect(() => {
    if (isFlatMode) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      const action = resolveKeyboardAction(e.key, activeId);
      if (!action) return;

      e.preventDefault();
      if (action.type === "select") {
        setActiveId(action.id);
      } else {
        setActiveId(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFlatMode, activeId]);

  if (isFlatMode) {
    return (
      <div key="flat-mode">
        <FlatView onSwitchTo3D={switchTo3D} />
      </div>
    );
  }

  return (
    <div
      key="3d-mode"
      className="relative h-screen w-screen overflow-hidden bg-bg text-fg select-none"
    >
      <a
        href="#solar-nav"
        className="sr-only focus:not-sr-only micro fixed left-4 top-4 z-50 border border-accent bg-bg px-3 py-1.5"
      >
        {c.ui.skipToContent}
      </a>

      {/* Lazy-loaded 3D Solar System Canvas (@react-three/fiber + @react-three/drei) */}
      <CanvasErrorBoundary onError={handleCanvasError}>
        <SolarCanvas3D
          activeId={activeId}
          hoveredId={hoveredId}
          reducedMotion={prefersReducedMotion}
          isMobile={isMobile}
          qualityProfile={qualityProfile}
          sections={s}
          canvasAriaLabel={c.meta.title}
          onSelectBody={selectBody}
          onHoverBody={setHoveredId}
        />
      </CanvasErrorBoundary>

      {/* Hairline-bordered Corner HUD Panels, Language Switch & Telemetry */}
      <HudOverlay
        activeId={activeId}
        reducedMotion={prefersReducedMotion}
        onSelectBody={selectBody}
        onHoverBody={setHoveredId}
        onOverview={returnToOverview}
        onSwitchToFlat={switchToFlat}
      />

      {/* Side Panel for Active Body Section */}
      <SidePanel
        activeId={activeId}
        reducedMotion={prefersReducedMotion}
        onSelectBody={selectBody}
        onClose={returnToOverview}
      />
    </div>
  );
}
