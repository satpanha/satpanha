export type SectionKey =
  | "home"
  | "missions"
  | "infrastructure"
  | "flightRecord"
  | "credentials"
  | "comms";

export type SectionId =
  | "home"
  | "missions"
  | "infrastructure"
  | "flight-record"
  | "credentials"
  | "comms";

export type BodyKind = "star" | "planet" | "station";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface SolarBody {
  id: SectionId;
  sectionKey: SectionKey;
  shortcut: "1" | "2" | "3" | "4" | "5" | "6";
  kind: BodyKind;
  orbitRadius: number;
  orbitSpeed: number;
  initialAngle: number;
  inclination: number;
  radius: number;
  color: string;
  accentColor: string;
  hasRing?: boolean;
  cameraDistance: number;
}

export interface CameraRigState {
  position: Vec3;
  target: Vec3;
}

export interface ProjectedPoint {
  x: number;
  y: number;
  depth: number;
  scale: number;
  visible: boolean;
}

export interface Star3D {
  x: number;
  y: number;
  z: number;
  size: number;
  alpha: number;
  color: string;
}

export const SOLAR_BODIES: readonly SolarBody[] = [
  {
    id: "home",
    sectionKey: "home",
    shortcut: "1",
    kind: "star",
    orbitRadius: 0,
    orbitSpeed: 0,
    initialAngle: 0,
    inclination: 0,
    radius: 1.55,
    color: "#ffb454",
    accentColor: "#ffd89b",
    cameraDistance: 7.2,
  },
  {
    id: "missions",
    sectionKey: "missions",
    shortcut: "2",
    kind: "planet",
    orbitRadius: 4.8,
    orbitSpeed: 0.16,
    initialAngle: 0.65,
    inclination: 0.05,
    radius: 0.56,
    color: "#5cd6ff",
    accentColor: "#a6ebff",
    cameraDistance: 3.6,
  },
  {
    id: "infrastructure",
    sectionKey: "infrastructure",
    shortcut: "3",
    kind: "planet",
    orbitRadius: 8.0,
    orbitSpeed: 0.11,
    initialAngle: 2.15,
    inclination: -0.06,
    radius: 0.72,
    color: "#48b8d0",
    accentColor: "#5cd6ff",
    hasRing: true,
    cameraDistance: 4.2,
  },
  {
    id: "flight-record",
    sectionKey: "flightRecord",
    shortcut: "4",
    kind: "planet",
    orbitRadius: 11.4,
    orbitSpeed: 0.078,
    initialAngle: 3.85,
    inclination: 0.04,
    radius: 0.68,
    color: "#e8a85c",
    accentColor: "#ffb454",
    cameraDistance: 4.0,
  },
  {
    id: "credentials",
    sectionKey: "credentials",
    shortcut: "5",
    kind: "planet",
    orbitRadius: 14.8,
    orbitSpeed: 0.055,
    initialAngle: 5.1,
    inclination: -0.05,
    radius: 0.62,
    color: "#7aa2f7",
    accentColor: "#b4ccf9",
    hasRing: true,
    cameraDistance: 3.9,
  },
  {
    id: "comms",
    sectionKey: "comms",
    shortcut: "6",
    kind: "station",
    orbitRadius: 18.2,
    orbitSpeed: 0.04,
    initialAngle: 1.35,
    inclination: 0.08,
    radius: 0.48,
    color: "#5cd6ff",
    accentColor: "#ffb454",
    cameraDistance: 3.4,
  },
] as const;

export const DEFAULT_OVERVIEW_PITCH = 0.45;
export const DEFAULT_BODY_PITCH = 0.28;

export function getBodyById(id: SectionId | null | undefined): SolarBody | undefined {
  if (!id) return undefined;
  return SOLAR_BODIES.find((b) => b.id === id);
}

/** Compute the 3D world position of a solar body at a given simulation time (in seconds). */
export function getBodyPosition(body: SolarBody, timeSec: number): Vec3 {
  if (body.orbitRadius <= 0) {
    return { x: 0, y: 0, z: 0 };
  }
  const angle = body.initialAngle + body.orbitSpeed * timeSec;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const cosI = Math.cos(body.inclination);
  const sinI = Math.sin(body.inclination);

  return {
    x: body.orbitRadius * cosA,
    y: body.orbitRadius * sinA * sinI,
    z: body.orbitRadius * sinA * cosI,
  };
}

/** Generate 3D points along a body's closed orbital path for rendering thin orbit lines. */
export function getOrbitPoints(body: SolarBody, segments = 96): Vec3[] {
  if (body.orbitRadius <= 0 || segments < 3) return [];
  const pts: Vec3[] = [];
  const cosI = Math.cos(body.inclination);
  const sinI = Math.sin(body.inclination);

  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    pts.push({
      x: body.orbitRadius * cosT,
      y: body.orbitRadius * sinT * sinI,
      z: body.orbitRadius * sinT * cosI,
    });
  }
  return pts;
}

/** Compute the desired overview camera rig state given user orbital drag and zoom offsets. */
export function getDesiredOverviewCamera(
  orbitYaw = 0,
  orbitPitch = DEFAULT_OVERVIEW_PITCH,
  zoomScale = 1
): CameraRigState {
  const clampedPitch = Math.max(-1.2, Math.min(1.35, orbitPitch));
  const clampedZoom = Math.max(0.45, Math.min(2.2, zoomScale));
  const distance = 30.5 * clampedZoom;

  const cosP = Math.cos(clampedPitch);
  const sinP = Math.sin(clampedPitch);
  const sinY = Math.sin(orbitYaw);
  const cosY = Math.cos(orbitYaw);

  return {
    position: {
      x: distance * cosP * sinY,
      y: distance * sinP,
      z: distance * cosP * cosY,
    },
    target: { x: 0, y: 0, z: 0 },
  };
}

export const OVERVIEW_CAMERA: CameraRigState = getDesiredOverviewCamera(
  0,
  DEFAULT_OVERVIEW_PITCH,
  1
);

/** Compute the desired camera rig state when flying to and tracking a specific body. */
export function getDesiredCameraForBody(
  body: SolarBody,
  timeSec: number,
  orbitYaw = 0,
  orbitPitch = DEFAULT_BODY_PITCH,
  zoomScale = 1
): CameraRigState {
  const pos = getBodyPosition(body, timeSec);
  const clampedPitch = Math.max(-1.1, Math.min(1.25, orbitPitch));
  const clampedZoom = Math.max(0.55, Math.min(2.2, zoomScale));
  const dist = body.cameraDistance * clampedZoom;

  // Base vantage angle faces the body from slightly outside its orbit so both the body and inner system are visible.
  const baseAngle =
    body.orbitRadius > 0
      ? Math.atan2(pos.x, pos.z) + 0.35 + orbitYaw
      : 0.25 + orbitYaw;

  const cosP = Math.cos(clampedPitch);
  const sinP = Math.sin(clampedPitch);

  const eye: Vec3 = {
    x: pos.x + dist * cosP * Math.sin(baseAngle),
    y: pos.y + dist * sinP,
    z: pos.z + dist * cosP * Math.cos(baseAngle),
  };

  // Offset look-at slightly so the focused body sits clearly in the left/center viewport next to the side panel.
  const rightX = Math.cos(baseAngle);
  const rightZ = -Math.sin(baseAngle);
  const panelOffset = dist * 0.16;

  return {
    position: eye,
    target: {
      x: pos.x + rightX * panelOffset,
      y: pos.y,
      z: pos.z + rightZ * panelOffset,
    },
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
  };
}

/** Smoothly step the camera rig toward the desired camera rig using exponential damping. */
export function stepCameraFlight(
  current: CameraRigState,
  desired: CameraRigState,
  dtSec: number,
  reducedMotion = false
): CameraRigState {
  if (reducedMotion || dtSec <= 0) {
    return {
      position: { ...desired.position },
      target: { ...desired.target },
    };
  }
  const clampedDt = Math.min(dtSec, 0.1);
  const factor = 1 - Math.exp(-4.2 * clampedDt);
  return {
    position: lerpVec3(current.position, desired.position, factor),
    target: lerpVec3(current.target, desired.target, factor),
  };
}

function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v.x, v.y, v.z);
  if (len < 1e-8) return { x: 0, y: 0, z: 1 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/** Project a 3D world-space coordinate into 2D viewport screen space. */
export function projectPoint3D(
  point: Vec3,
  camera: CameraRigState,
  viewportWidth: number,
  viewportHeight: number,
  fovDeg = 50
): ProjectedPoint {
  if (viewportWidth <= 0 || viewportHeight <= 0) {
    return { x: 0, y: 0, depth: 0, scale: 0, visible: false };
  }

  const forward = normalize({
    x: camera.target.x - camera.position.x,
    y: camera.target.y - camera.position.y,
    z: camera.target.z - camera.position.z,
  });

  const worldUp: Vec3 =
    Math.abs(forward.y) > 0.99 ? { x: 0, y: 0, z: -1 } : { x: 0, y: 1, z: 0 };
  const right = normalize(cross(forward, worldUp));
  const up = cross(right, forward);

  const rel: Vec3 = {
    x: point.x - camera.position.x,
    y: point.y - camera.position.y,
    z: point.z - camera.position.z,
  };

  const camX = dot(rel, right);
  const camY = dot(rel, up);
  const camZ = dot(rel, forward);

  if (camZ <= 0.2) {
    return { x: 0, y: 0, depth: camZ, scale: 0, visible: false };
  }

  const fovRad = (fovDeg * Math.PI) / 180;
  const focalLength = viewportHeight / 2 / Math.tan(fovRad / 2);
  const scale = focalLength / camZ;

  const screenX = viewportWidth / 2 + camX * scale;
  const screenY = viewportHeight / 2 - camY * scale;

  return {
    x: screenX,
    y: screenY,
    depth: camZ,
    scale,
    visible:
      screenX >= -viewportWidth * 0.5 &&
      screenX <= viewportWidth * 1.5 &&
      screenY >= -viewportHeight * 0.5 &&
      screenY <= viewportHeight * 1.5,
  };
}

/** Deterministic seeded 3D starfield generator (no Math.random in React render). */
export function generateStarfield(count = 320, seed = 42): Star3D[] {
  let state = seed >>> 0;
  const nextRand = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const palette = ["#e8ecf4", "#e8ecf4", "#cfe8ff", "#5cd6ff", "#ffd89b"];
  const stars: Star3D[] = [];

  for (let i = 0; i < count; i++) {
    const u = nextRand();
    const v = nextRand();
    const theta = u * Math.PI * 2;
    const phi = Math.acos(2 * v - 1);
    const radius = 52 + nextRand() * 48;

    const sinPhi = Math.sin(phi);
    stars.push({
      x: radius * sinPhi * Math.cos(theta),
      y: radius * Math.cos(phi),
      z: radius * sinPhi * Math.sin(theta),
      size: 0.7 + nextRand() * 1.6,
      alpha: 0.25 + nextRand() * 0.7,
      color: palette[Math.floor(nextRand() * palette.length)] ?? "#e8ecf4",
    });
  }

  return stars;
}

export type KeyboardNavAction =
  | { type: "select"; id: SectionId }
  | { type: "overview" };

/**
 * Map keyboard events (1-6, ArrowLeft/Right/Up/Down, Escape) to solar system navigation actions.
 */
export function resolveKeyboardAction(
  key: string,
  currentId: SectionId | null
): KeyboardNavAction | null {
  if (key >= "1" && key <= "6") {
    const idx = Number(key) - 1;
    const body = SOLAR_BODIES[idx];
    return body ? { type: "select", id: body.id } : null;
  }

  if (key === "ArrowRight" || key === "ArrowDown") {
    if (!currentId) {
      return { type: "select", id: SOLAR_BODIES[0].id };
    }
    const idx = SOLAR_BODIES.findIndex((b) => b.id === currentId);
    const nextIdx = (idx + 1) % SOLAR_BODIES.length;
    return { type: "select", id: SOLAR_BODIES[nextIdx].id };
  }

  if (key === "ArrowLeft" || key === "ArrowUp") {
    if (!currentId) {
      return { type: "select", id: SOLAR_BODIES[SOLAR_BODIES.length - 1].id };
    }
    const idx = SOLAR_BODIES.findIndex((b) => b.id === currentId);
    const prevIdx = (idx - 1 + SOLAR_BODIES.length) % SOLAR_BODIES.length;
    return { type: "select", id: SOLAR_BODIES[prevIdx].id };
  }

  if (key === "Escape") {
    return { type: "overview" };
  }

  return null;
}
