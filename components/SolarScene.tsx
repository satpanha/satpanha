"use client";

import {
  Component,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { FlatView } from "@/components/FlatView";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { SidePanel } from "@/components/SidePanel";
import { useLocale } from "@/lib/locale";
import {
  getBodyById,
  resolveKeyboardAction,
  SOLAR_BODIES,
  type SectionId,
} from "@/lib/solar-system";

const SolarCanvas3D = dynamic(() => import("@/components/SolarCanvas3D"), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-full w-full items-center justify-center bg-bg"
      aria-live="polite"
    >
      <span className="micro text-muted">INITIALIZING 3D TELEMETRY...</span>
    </div>
  ),
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

function subscribeMobileViewport(onStoreChange: () => void): () => void {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return () => {};
  }
  const mql = window.matchMedia("(max-width: 639px)");
  mql.addEventListener("change", onStoreChange);
  return () => mql.removeEventListener("change", onStoreChange);
}

function getMobileViewportSnapshot(): boolean {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }
  return window.matchMedia("(max-width: 639px)").matches;
}

function getMobileViewportServerSnapshot(): boolean {
  return false;
}

export function SolarScene() {
  const { content: c } = useLocale();
  const s = c.sections;

  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  const isMobile = useSyncExternalStore(
    subscribeMobileViewport,
    getMobileViewportSnapshot,
    getMobileViewportServerSnapshot
  );

  const [viewOverride, setViewOverride] = useState<"3d" | "flat" | null>(null);
  const [activeId, setActiveId] = useState<SectionId | null>(null);
  const [hoveredId, setHoveredId] = useState<SectionId | null>(null);

  const isFlatMode = viewOverride
    ? viewOverride === "flat"
    : prefersReducedMotion;

  const selectBody = useCallback((id: SectionId) => {
    setActiveId(id);
  }, []);

  const returnToOverview = useCallback(() => {
    setActiveId(null);
  }, []);

  const handleCanvasError = useCallback(() => {
    setViewOverride("flat");
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
        <div className="border-b border-[var(--hairline)] bg-bg/95 px-4 py-2">
          <div className="mx-auto flex max-w-4xl items-center justify-between">
            <span className="micro text-muted">{c.ui.flatView}</span>
            <button
              type="button"
              onClick={() => setViewOverride("3d")}
              className="micro border border-accent bg-accent/10 px-3 py-1"
            >
              Mission Control (3D)
            </button>
          </div>
        </div>
        <FlatView />
      </div>
    );
  }

  const activeBody = getBodyById(activeId);
  const activeSection = activeBody ? s[activeBody.sectionKey] : null;

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
          sections={s}
          canvasAriaLabel={c.meta.title}
          onSelectBody={selectBody}
          onHoverBody={setHoveredId}
        />
      </CanvasErrorBoundary>

      {/* Top HUD Bar */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--hairline)] bg-bg/85 px-4 py-2.5 backdrop-blur-sm">
        <div className="pointer-events-auto flex items-center gap-4">
          <button
            type="button"
            onClick={returnToOverview}
            className="micro text-left hover:text-fg"
          >
            Mission Control // {s.home.name}
          </button>
          <span className="micro hidden text-muted sm:inline" aria-live="polite">
            {activeSection
              ? `TARGET: ${activeSection.body} — ${activeSection.label}`
              : `MODE: ${c.ui.sections}`}
          </span>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewOverride("flat")}
            className="micro border border-[var(--hairline)] px-3 py-1 text-muted hover:border-accent hover:text-fg"
          >
            {c.ui.flatView}
          </button>
          <Link
            href="/flat/"
            className="micro hidden border border-[var(--hairline)] px-3 py-1 text-muted hover:border-accent hover:text-fg sm:inline-block"
          >
            /flat
          </Link>
          <LanguageSwitch />
        </div>
      </header>

      {/* Side Panel for Active Body Section */}
      <SidePanel
        activeId={activeId}
        onSelectBody={selectBody}
        onClose={returnToOverview}
      />

      {/* Bottom Body Selector Dock (Keyboard + Mouse + Touch Reachable) */}
      <nav
        id="solar-nav"
        aria-label={c.ui.sections}
        className="pointer-events-auto fixed inset-x-0 bottom-0 z-20 border-t border-[var(--hairline)] bg-bg/90 px-3 py-2 backdrop-blur-sm"
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
          <ul className="flex flex-wrap items-center gap-1.5">
            <li>
              <button
                type="button"
                onClick={returnToOverview}
                aria-pressed={activeId === null}
                className={`micro border px-2.5 py-1 ${
                  activeId === null
                    ? "border-accent bg-accent/15 text-fg"
                    : "border-[var(--hairline)] text-muted hover:border-accent hover:text-fg"
                }`}
              >
                [ESC] ALL
              </button>
            </li>
            {SOLAR_BODIES.map((body) => {
              const sec = s[body.sectionKey];
              const isSelected = activeId === body.id;
              return (
                <li key={body.id}>
                  <button
                    type="button"
                    onClick={() => selectBody(body.id)}
                    onMouseEnter={() => setHoveredId(body.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    aria-pressed={isSelected}
                    aria-label={`${sec.body}: ${sec.label} (${body.shortcut})`}
                    className={`micro border px-2.5 py-1 ${
                      isSelected
                        ? "border-accent bg-accent/15 text-fg"
                        : "border-[var(--hairline)] text-muted hover:border-accent hover:text-fg"
                    }`}
                  >
                    [{body.shortcut}] {sec.label}
                  </button>
                </li>
              );
            })}
          </ul>

          <p className="micro hidden text-muted lg:block">
            KEYS: 1–6 · ←/→ · ESC
          </p>
        </div>
      </nav>
    </div>
  );
}
