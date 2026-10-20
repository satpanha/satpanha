export interface DeviceEnvironment {
  prefersReducedMotion: boolean;
  webglAvailable: boolean;
  viewportWidth: number;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  maxTouchPoints?: number;
  hasCoarsePointer?: boolean;
}

export interface SceneQualityProfile {
  isTouchOrCompact: boolean;
  touchOrbitEnabled: boolean;
  dpr: [number, number];
  antialias: boolean;
  postProcessing: false;
  starCount: number;
  orbitSegments: number;
  sphereSegments: number;
  ringSegments: number;
}

export const SMALL_SCREEN_MAX_WIDTH = 768;
export const LOW_MEMORY_THRESHOLD_GB = 4;
export const LOW_CPU_CORES_THRESHOLD = 4;

/**
 * Detect whether WebGL is supported and available in the current browser context.
 */
export function detectWebGLAvailable(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }
  try {
    if (!("WebGLRenderingContext" in window)) {
      return false;
    }
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    return Boolean(gl);
  } catch {
    return false;
  }
}

/**
 * Detect whether the device is a low-power mobile device:
 * small screen (<= 768px) combined with low deviceMemory (< 4 GB) or low hardwareConcurrency (<= 4 cores).
 */
export function isLowPowerMobileDevice(env: {
  viewportWidth: number;
  deviceMemory?: number;
  hardwareConcurrency?: number;
}): boolean {
  const isSmallScreen =
    env.viewportWidth > 0 && env.viewportWidth <= SMALL_SCREEN_MAX_WIDTH;
  if (!isSmallScreen) return false;

  const hasLowMemory =
    typeof env.deviceMemory === "number" &&
    Number.isFinite(env.deviceMemory) &&
    env.deviceMemory < LOW_MEMORY_THRESHOLD_GB;

  const hasLowCpu =
    typeof env.hardwareConcurrency === "number" &&
    Number.isFinite(env.hardwareConcurrency) &&
    env.hardwareConcurrency <= LOW_CPU_CORES_THRESHOLD;

  return hasLowMemory || hasLowCpu;
}

/**
 * Determine whether FlatView (/flat) should be used as the default view.
 * Returns true when ANY of these conditions holds:
 * 1. prefers-reduced-motion is enabled
 * 2. WebGL is unavailable
 * 3. Low-power mobile (small screen + low deviceMemory / hardwareConcurrency)
 */
export function shouldDefaultToFlatView(env: DeviceEnvironment): boolean {
  if (env.prefersReducedMotion) return true;
  if (!env.webglAvailable) return true;
  if (isLowPowerMobileDevice(env)) return true;
  return false;
}

/**
 * Resolve active view mode ("3d" or "flat") given environment detection and optional user toggle.
 */
export function resolveActiveViewMode(
  env: DeviceEnvironment,
  userOverride: "3d" | "flat" | null
): "3d" | "flat" {
  if (userOverride) return userOverride;
  return shouldDefaultToFlatView(env) ? "flat" : "3d";
}

/**
 * Compute 3D rendering settings for desktop vs capable touch / mobile devices.
 * Capable touch devices get touch orbit controls, reduced geometry, lower DPR, and no post-processing.
 */
export function getSceneQualityProfile(env: {
  viewportWidth: number;
  maxTouchPoints?: number;
  hasCoarsePointer?: boolean;
}): SceneQualityProfile {
  const isTouch =
    (typeof env.maxTouchPoints === "number" && env.maxTouchPoints > 0) ||
    Boolean(env.hasCoarsePointer);
  const isCompact =
    env.viewportWidth > 0 && env.viewportWidth <= SMALL_SCREEN_MAX_WIDTH;
  const isTouchOrCompact = isTouch || isCompact;

  return {
    isTouchOrCompact,
    touchOrbitEnabled: true,
    dpr: isTouchOrCompact ? [1, 1.25] : [1, 2],
    antialias: !isTouchOrCompact,
    postProcessing: false,
    starCount: isTouchOrCompact ? 160 : 360,
    orbitSegments: isTouchOrCompact ? 48 : 96,
    sphereSegments: isTouchOrCompact ? 18 : 32,
    ringSegments: isTouchOrCompact ? 28 : 48,
  };
}

/**
 * Read current browser device environment safely on the client.
 */
export function readClientDeviceEnvironment(
  prefersReducedMotion: boolean
): DeviceEnvironment {
  if (typeof window === "undefined") {
    return {
      prefersReducedMotion,
      webglAvailable: false,
      viewportWidth: 1280,
    };
  }

  const nav =
    typeof navigator !== "undefined"
      ? (navigator as Navigator & { deviceMemory?: number })
      : undefined;

  const hasCoarsePointer =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(pointer: coarse)").matches
      : false;

  return {
    prefersReducedMotion,
    webglAvailable: detectWebGLAvailable(),
    viewportWidth: window.innerWidth || 1280,
    deviceMemory:
      typeof nav?.deviceMemory === "number" ? nav.deviceMemory : undefined,
    hardwareConcurrency:
      typeof nav?.hardwareConcurrency === "number"
        ? nav.hardwareConcurrency
        : undefined,
    maxTouchPoints:
      typeof nav?.maxTouchPoints === "number" ? nav.maxTouchPoints : 0,
    hasCoarsePointer,
  };
}
