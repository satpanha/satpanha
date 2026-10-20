import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FlatView } from "@/components/FlatView";
import { HudOverlay } from "@/components/HudOverlay";
import { SidePanel } from "@/components/SidePanel";
import { TelemetryPanel } from "@/components/TelemetryPanel";
import { getContent, LOCALES } from "@/lib/content";
import {
  getSceneQualityProfile,
  isLowPowerMobileDevice,
  resolveActiveViewMode,
  shouldDefaultToFlatView,
} from "@/lib/device";
import { LocaleProvider } from "@/lib/locale";
import {
  createInitialSolarSession,
  getBodyById,
  getBodyGlowPulse,
  getDesiredCameraForBody,
  getStarfieldParallaxOffset,
  OVERVIEW_CAMERA,
  selectBodyInSession,
  SOLAR_BODIES,
  stepCameraFlight,
  switchLocaleInSession,
} from "@/lib/solar-system";
import {
  fetchTelemetry,
  formatShortSha,
  parseTelemetry,
} from "@/lib/telemetry";

function renderWithLocale(element: React.ReactElement): string {
  return renderToStaticMarkup(
    React.createElement(LocaleProvider, null, element)
  );
}

describe("Stage 3: HUD, telemetry, language switch, fallbacks & reduced motion", () => {
  describe("Telemetry validation and missing-state handling", () => {
    it("returns null when telemetry is missing, non-object, or has invalid fields (never fakes values)", () => {
      expect(parseTelemetry(null)).toBeNull();
      expect(parseTelemetry(undefined)).toBeNull();
      expect(parseTelemetry("invalid")).toBeNull();
      expect(parseTelemetry([])).toBeNull();
      expect(parseTelemetry({})).toBeNull();

      // Missing lighthouseScore
      expect(
        parseTelemetry({
          commit_sha: "abc1234",
          deployed_at: "2026-10-20T09:00:00Z",
          pipeline_status: "passed",
        })
      ).toBeNull();

      // Out-of-range lighthouse score
      expect(
        parseTelemetry({
          commit_sha: "abc1234",
          deployed_at: "2026-10-20T09:00:00Z",
          pipeline_status: "passed",
          lighthouse_score: 120,
        })
      ).toBeNull();

      // Placeholder strings are rejected
      expect(
        parseTelemetry({
          commit_sha: "{{TODO: sha}}",
          deployed_at: "2026-10-20T09:00:00Z",
          pipeline_status: "passed",
          lighthouse_score: 95,
        })
      ).toBeNull();
    });

    it("parses valid telemetry payloads and shortens long commit SHAs", () => {
      const parsed = parseTelemetry({
        commit_sha: "8481705abcdef1234567890",
        deployed_at: "2026-10-20T09:00:00Z",
        pipeline_status: "passed",
        lighthouse_score: 96.4,
      });

      expect(parsed).toEqual({
        commitSha: "8481705abcdef1234567890",
        deployedAt: "2026-10-20T09:00:00Z",
        pipelineStatus: "passed",
        lighthouseScore: 96,
      });
      expect(formatShortSha(parsed!.commitSha)).toBe("8481705");
    });

    it("handles fetchTelemetry 404 and network errors gracefully by returning null", async () => {
      const mock404 = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      } as unknown as Response);
      expect(await fetchTelemetry(mock404)).toBeNull();

      const mockNetworkError = vi
        .fn()
        .mockRejectedValue(new Error("Network failure"));
      expect(await fetchTelemetry(mockNetworkError)).toBeNull();

      const mockValid = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          commit: "deadbeef1234",
          deployed_at: "2026-10-20T08:30:00Z",
          status: "success",
          lighthouse: { performance: 94 },
        }),
      } as unknown as Response);

      expect(await fetchTelemetry(mockValid)).toEqual({
        commitSha: "deadbeef1234",
        deployedAt: "2026-10-20T08:30:00Z",
        pipelineStatus: "success",
        lighthouseScore: 94,
      });
    });

    it("renders a clear 'no telemetry' state when telemetry is unavailable and real fields when ready", () => {
      const emptyHtml = renderWithLocale(
        React.createElement(TelemetryPanel, { initialData: null })
      );
      expect(emptyHtml).toContain("No telemetry available");
      expect(emptyHtml).toContain('data-telemetry-empty="true"');

      const readyHtml = renderWithLocale(
        React.createElement(TelemetryPanel, {
          initialData: {
            commitSha: "8481705999",
            deployedAt: "2026-10-20T09:00:00Z",
            pipelineStatus: "passed",
            lighthouseScore: 98,
          },
        })
      );
      expect(readyHtml).not.toContain('data-telemetry-empty="true"');
      expect(readyHtml).toContain("8481705");
      expect(readyHtml).toContain("passed");
      expect(readyHtml).toContain("98");
    });
  });

  describe("HUD layout, focused body readout, key hints, and accessibility", () => {
    it("renders hairline-bordered corner panels, focused body readout, key hints, language switch, and ARIA labels", () => {
      const html = renderWithLocale(
        React.createElement(HudOverlay, {
          activeId: "missions",
          reducedMotion: false,
          initialTelemetry: null,
          onSelectBody: () => {},
          onHoverBody: () => {},
          onOverview: () => {},
          onSwitchToFlat: () => {},
        })
      );

      // Four corner HUD panels exist
      expect(html).toContain('data-hud-corner="top-left"');
      expect(html).toContain('data-hud-corner="top-right"');
      expect(html).toContain('data-hud-corner="bottom-left"');
      expect(html).toContain('data-hud-corner="bottom-right"');

      // Focused body readout shows Planet 1 — Missions
      expect(html).toContain("[2] Planet 1 — Missions");

      // Key hints (1-6, arrows, Esc)
      expect(html).toContain("1–6 select body");
      expect(html).toContain("←/→ cycle");
      expect(html).toContain("Esc overview");

      // Language switch EN / ខ្មែរ in HUD
      expect(html).toContain(">EN<");
      expect(html).toContain(">ខ្មែរ<");

      // All 6 bodies have ARIA labels in the HUD
      for (const body of SOLAR_BODIES) {
        const sec = getContent("en").sections[body.sectionKey];
        expect(html).toContain(
          `aria-label="${sec.body}: ${sec.label} (${body.shortcut})"`
        );
      }
    });

    it("exposes every HUD fact in FlatView text and provides bidirectional view toggles", () => {
      const flatHtml = renderWithLocale(
        React.createElement(FlatView, { onSwitchTo3D: () => {} })
      );

      // 3D view toggle is present in FlatView
      expect(flatHtml).toContain("3D view");

      // Every body name and section label is present in text
      for (const body of SOLAR_BODIES) {
        const sec = getContent("en").sections[body.sectionKey];
        expect(flatHtml).toContain(`${sec.body} · ${sec.label}`);
      }

      // Telemetry panel is also available in text in FlatView
      expect(flatHtml).toContain("Telemetry");
      expect(flatHtml).toContain("No telemetry available");
    });
  });

  describe("Language switch preserves camera, focused body, and open panel", () => {
    it("switching between EN and KM does not reset camera rig, focused body, or open panel", () => {
      // Only EN and KM are site languages (French is not a site language)
      expect(LOCALES).toEqual(["en", "km"]);

      const initial = createInitialSolarSession("en");
      const focused = selectBodyInSession(initial, "infrastructure", false);

      expect(focused.activeId).toBe("infrastructure");
      expect(focused.panelOpen).toBe(true);
      expect(focused.cameraRig).not.toEqual(OVERVIEW_CAMERA);

      const cameraBeforeSwitch = {
        position: { ...focused.cameraRig.position },
        target: { ...focused.cameraRig.target },
      };

      // Switch EN -> KM
      const inKhmer = switchLocaleInSession(focused, "km");
      expect(inKhmer.locale).toBe("km");
      expect(inKhmer.activeId).toBe("infrastructure");
      expect(inKhmer.panelOpen).toBe(true);
      expect(inKhmer.cameraRig).toEqual(cameraBeforeSwitch);
      expect(inKhmer.simTimeSec).toBe(focused.simTimeSec);

      // Switch KM -> EN
      const backToEn = switchLocaleInSession(inKhmer, "en");
      expect(backToEn.locale).toBe("en");
      expect(backToEn.activeId).toBe("infrastructure");
      expect(backToEn.panelOpen).toBe(true);
      expect(backToEn.cameraRig).toEqual(cameraBeforeSwitch);

      // SidePanel stays open for the same activeId across locales
      const panelHtml = renderWithLocale(
        React.createElement(SidePanel, {
          activeId: inKhmer.activeId,
          onSelectBody: () => {},
          onClose: () => {},
        })
      );
      expect(panelHtml).toContain("Planet 2 / Infrastructure");
    });
  });

  describe("Mobile and low-power fallback & capable touch configuration", () => {
    it("defaults to FlatView when prefers-reduced-motion, WebGL unavailable, or low-power mobile is true", () => {
      // Desktop with WebGL and normal motion -> 3D
      const capableDesktop = {
        prefersReducedMotion: false,
        webglAvailable: true,
        viewportWidth: 1440,
        deviceMemory: 8,
        hardwareConcurrency: 8,
      };
      expect(shouldDefaultToFlatView(capableDesktop)).toBe(false);
      expect(resolveActiveViewMode(capableDesktop, null)).toBe("3d");

      // 1. prefers-reduced-motion -> flat
      expect(
        shouldDefaultToFlatView({
          ...capableDesktop,
          prefersReducedMotion: true,
        })
      ).toBe(true);

      // 2. WebGL unavailable -> flat
      expect(
        shouldDefaultToFlatView({
          ...capableDesktop,
          webglAvailable: false,
        })
      ).toBe(true);

      // 3. Low-power mobile (small screen + low deviceMemory or low hardwareConcurrency) -> flat
      expect(
        isLowPowerMobileDevice({
          viewportWidth: 390,
          deviceMemory: 2,
          hardwareConcurrency: 8,
        })
      ).toBe(true);
      expect(
        isLowPowerMobileDevice({
          viewportWidth: 390,
          deviceMemory: 8,
          hardwareConcurrency: 4,
        })
      ).toBe(true);
      expect(
        shouldDefaultToFlatView({
          prefersReducedMotion: false,
          webglAvailable: true,
          viewportWidth: 390,
          deviceMemory: 2,
          hardwareConcurrency: 4,
        })
      ).toBe(true);

      // Capable high-end mobile / tablet -> 3D by default
      const capableTouch = {
        prefersReducedMotion: false,
        webglAvailable: true,
        viewportWidth: 390,
        deviceMemory: 8,
        hardwareConcurrency: 8,
        maxTouchPoints: 5,
        hasCoarsePointer: true,
      };
      expect(shouldDefaultToFlatView(capableTouch)).toBe(false);
      expect(resolveActiveViewMode(capableTouch, null)).toBe("3d");

      // Explicit user toggle overrides in both directions
      expect(resolveActiveViewMode(capableDesktop, "flat")).toBe("flat");
      expect(
        resolveActiveViewMode(
          { ...capableDesktop, prefersReducedMotion: true },
          "3d"
        )
      ).toBe("3d");
    });

    it("configures capable touch devices with touch orbit, reduced geometry, lower DPR, and no post-processing", () => {
      const desktopProfile = getSceneQualityProfile({
        viewportWidth: 1440,
        maxTouchPoints: 0,
        hasCoarsePointer: false,
      });
      const touchProfile = getSceneQualityProfile({
        viewportWidth: 1024,
        maxTouchPoints: 5,
        hasCoarsePointer: true,
      });

      expect(touchProfile.touchOrbitEnabled).toBe(true);
      expect(touchProfile.postProcessing).toBe(false);
      expect(touchProfile.dpr[1]).toBeLessThan(desktopProfile.dpr[1]);
      expect(touchProfile.starCount).toBeLessThan(desktopProfile.starCount);
      expect(touchProfile.orbitSegments).toBeLessThan(
        desktopProfile.orbitSegments
      );
      expect(touchProfile.sphereSegments).toBeLessThan(
        desktopProfile.sphereSegments
      );
    });
  });

  describe("Reduced motion behavior", () => {
    it("jumps camera instantly, disables starfield parallax, and disables pulsing glow", () => {
      const targetBody = getBodyById("comms")!;
      const desired = getDesiredCameraForBody(targetBody, 0);

      // 1. Instant camera jump
      expect(stepCameraFlight(OVERVIEW_CAMERA, desired, 0.016, true)).toEqual(
        desired
      );

      // 2. Zero parallax under reduced motion vs non-zero in normal mode
      const camPos = { x: 12, y: -6, z: 24 };
      expect(getStarfieldParallaxOffset(camPos, true)).toEqual({
        x: 0,
        y: 0,
        z: 0,
      });
      expect(getStarfieldParallaxOffset(camPos, false)).not.toEqual({
        x: 0,
        y: 0,
        z: 0,
      });

      // 3. No pulsing glow under reduced motion across different timestamps
      const g0 = getBodyGlowPulse(0, true, true);
      const g1 = getBodyGlowPulse(0.65, true, true);
      const g2 = getBodyGlowPulse(1.4, true, true);
      expect(g0).toEqual(g1);
      expect(g1).toEqual(g2);

      // Normal mode pulses over time
      const normal0 = getBodyGlowPulse(0, true, false);
      const normal1 = getBodyGlowPulse(0.65, true, false);
      expect(normal0.scale).not.toBeCloseTo(normal1.scale, 4);
    });
  });
});
