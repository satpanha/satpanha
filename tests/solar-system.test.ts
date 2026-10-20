import { describe, expect, it } from "vitest";
import { getContent, LOCALES } from "@/lib/content";
import {
  generateStarfield,
  getBodyById,
  getBodyPosition,
  getDesiredCameraForBody,
  getDesiredOverviewCamera,
  getOrbitPoints,
  OVERVIEW_CAMERA,
  projectPoint3D,
  resolveKeyboardAction,
  SOLAR_BODIES,
  stepCameraFlight,
} from "@/lib/solar-system";

describe("solar system model & 3D math", () => {
  it("defines all 6 bodies matching content sections in order", () => {
    expect(SOLAR_BODIES).toHaveLength(6);
    expect(SOLAR_BODIES.map((b) => b.shortcut)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
    ]);

    for (const locale of LOCALES) {
      const sections = getContent(locale).sections;
      for (const body of SOLAR_BODIES) {
        const sec = sections[body.sectionKey];
        expect(sec).toBeDefined();
        expect(sec.id).toBe(body.id);
      }
    }
  });

  it("places Sun at the origin and orbits planets/station at their orbital radii", () => {
    const sun = getBodyById("home")!;
    expect(getBodyPosition(sun, 0)).toEqual({ x: 0, y: 0, z: 0 });
    expect(getBodyPosition(sun, 123.45)).toEqual({ x: 0, y: 0, z: 0 });

    for (const body of SOLAR_BODIES) {
      if (body.orbitRadius === 0) continue;
      const p0 = getBodyPosition(body, 0);
      const p1 = getBodyPosition(body, 10);
      const dist0 = Math.hypot(p0.x, p0.y, p0.z);
      const dist1 = Math.hypot(p1.x, p1.y, p1.z);

      expect(dist0).toBeCloseTo(body.orbitRadius, 6);
      expect(dist1).toBeCloseTo(body.orbitRadius, 6);
      // Position advances over time
      expect(Math.hypot(p1.x - p0.x, p1.y - p0.y, p1.z - p0.z)).toBeGreaterThan(
        0.1
      );
    }
  });

  it("generates closed 3D orbit loops for orbiting bodies and empty array for Sun", () => {
    const sun = getBodyById("home")!;
    expect(getOrbitPoints(sun)).toEqual([]);

    const missions = getBodyById("missions")!;
    const pts = getOrbitPoints(missions, 32);
    expect(pts).toHaveLength(33);
    expect(pts[0].x).toBeCloseTo(pts[32].x, 6);
    expect(pts[0].y).toBeCloseTo(pts[32].y, 6);
    expect(pts[0].z).toBeCloseTo(pts[32].z, 6);

    for (const pt of pts) {
      expect(Math.hypot(pt.x, pt.y, pt.z)).toBeCloseTo(missions.orbitRadius, 6);
    }
  });

  it("smoothly interpolates camera flights and snaps under reduced motion", () => {
    const targetBody = getBodyById("missions")!;
    const desired = getDesiredCameraForBody(targetBody, 0);

    // Single step moves closer to desired without overshooting
    const stepped = stepCameraFlight(OVERVIEW_CAMERA, desired, 0.05, false);
    const initialDist = Math.hypot(
      OVERVIEW_CAMERA.position.x - desired.position.x,
      OVERVIEW_CAMERA.position.y - desired.position.y,
      OVERVIEW_CAMERA.position.z - desired.position.z
    );
    const steppedDist = Math.hypot(
      stepped.position.x - desired.position.x,
      stepped.position.y - desired.position.y,
      stepped.position.z - desired.position.z
    );
    expect(steppedDist).toBeLessThan(initialDist);
    expect(steppedDist).toBeGreaterThan(0);

    // Reduced motion snaps immediately
    const snapped = stepCameraFlight(OVERVIEW_CAMERA, desired, 0.05, true);
    expect(snapped).toEqual(desired);
  });

  it("projects 3D points into viewport coordinates and clips points behind camera", () => {
    const cam = getDesiredOverviewCamera(0, 0.4, 1);
    const originProj = projectPoint3D({ x: 0, y: 0, z: 0 }, cam, 1280, 720);
    expect(originProj.visible).toBe(true);
    expect(originProj.x).toBeCloseTo(640, 1);
    expect(originProj.y).toBeCloseTo(360, 1);

    const behindCamera = {
      x: cam.position.x * 2,
      y: cam.position.y * 2,
      z: cam.position.z * 2,
    };
    const behindProj = projectPoint3D(behindCamera, cam, 1280, 720);
    expect(behindProj.visible).toBe(false);

    expect(projectPoint3D({ x: 0, y: 0, z: 0 }, cam, 0, 720).visible).toBe(
      false
    );
  });

  it("generates a deterministic 3D starfield", () => {
    const a = generateStarfield(50, 99);
    const b = generateStarfield(50, 99);
    expect(a).toHaveLength(50);
    expect(a).toEqual(b);
  });

  it("resolves keyboard controls for 1-6, arrow keys, and Escape", () => {
    expect(resolveKeyboardAction("1", null)).toEqual({
      type: "select",
      id: "home",
    });
    expect(resolveKeyboardAction("6", "home")).toEqual({
      type: "select",
      id: "comms",
    });

    // Forward cycle and wrap-around
    expect(resolveKeyboardAction("ArrowRight", null)).toEqual({
      type: "select",
      id: "home",
    });
    expect(resolveKeyboardAction("ArrowRight", "home")).toEqual({
      type: "select",
      id: "missions",
    });
    expect(resolveKeyboardAction("ArrowDown", "comms")).toEqual({
      type: "select",
      id: "home",
    });

    // Backward cycle and wrap-around
    expect(resolveKeyboardAction("ArrowLeft", null)).toEqual({
      type: "select",
      id: "comms",
    });
    expect(resolveKeyboardAction("ArrowLeft", "home")).toEqual({
      type: "select",
      id: "comms",
    });
    expect(resolveKeyboardAction("ArrowUp", "missions")).toEqual({
      type: "select",
      id: "home",
    });

    // Escape returns to overview
    expect(resolveKeyboardAction("Escape", "missions")).toEqual({
      type: "overview",
    });

    // Unbound keys return null
    expect(resolveKeyboardAction("7", "home")).toBeNull();
    expect(resolveKeyboardAction("Enter", "home")).toBeNull();
  });

  it("handles edge cases for invalid inputs and boundary clamping", () => {
    expect(getBodyById(null)).toBeUndefined();
    expect(getBodyById(undefined)).toBeUndefined();

    const missions = getBodyById("missions")!;
    expect(getOrbitPoints(missions, 2)).toEqual([]);
    expect(getOrbitPoints(missions, 0)).toEqual([]);

    // Non-positive dtSec snaps directly to desired state
    const desired = getDesiredCameraForBody(missions, 5, 0.2, 0.3, 1);
    expect(stepCameraFlight(OVERVIEW_CAMERA, desired, 0, false)).toEqual(
      desired
    );
    expect(stepCameraFlight(OVERVIEW_CAMERA, desired, -1, false)).toEqual(
      desired
    );

    // Extreme pitch and zoom values are safely clamped
    const extremeOverview = getDesiredOverviewCamera(0, 99, 0.01);
    expect(Number.isFinite(extremeOverview.position.x)).toBe(true);
    expect(Number.isFinite(extremeOverview.position.y)).toBe(true);
    expect(Number.isFinite(extremeOverview.position.z)).toBe(true);
  });
});

