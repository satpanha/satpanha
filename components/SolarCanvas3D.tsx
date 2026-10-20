"use client";

import {
  type ComponentRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { Content } from "@/lib/content";
import {
  generateStarfield,
  getBodyById,
  getBodyGlowPulse,
  getBodyPosition,
  getDesiredCameraForBody,
  getDesiredOverviewCamera,
  getOrbitPoints,
  getStarfieldParallaxOffset,
  OVERVIEW_CAMERA,
  SOLAR_BODIES,
  stepCameraFlight,
  type CameraRigState,
  type SectionId,
  type SolarBody,
  type Vec3,
} from "@/lib/solar-system";
import type { SceneQualityProfile } from "@/lib/device";

// Suppress Three.js r183+ Clock deprecation warning triggered internally by @react-three/fiber store creation
if (typeof THREE.setConsoleFunction === "function") {
  THREE.setConsoleFunction((type, message, ...params) => {
    if (type === "warn" && typeof message === "string" && message.includes("THREE.Clock:")) {
      return;
    }
    if (type === "error") console.error(message, ...params);
    else if (type === "warn") console.warn(message, ...params);
    else console.log(message, ...params);
  });
}

type OrbitControlsInstance = ComponentRef<typeof OrbitControls>;

export interface SolarCanvas3DProps {
  activeId: SectionId | null;
  hoveredId: SectionId | null;
  reducedMotion: boolean;
  isMobile: boolean;
  qualityProfile?: SceneQualityProfile;
  sections: Content["sections"];
  canvasAriaLabel: string;
  onSelectBody: (id: SectionId) => void;
  onHoverBody: (id: SectionId | null) => void;
}

const DESKTOP_STARS = generateStarfield(360, 42);
const MOBILE_STARS = generateStarfield(160, 42);

function buildStarBuffers(stars: ReturnType<typeof generateStarfield>) {
  const positions = new Float32Array(stars.length * 3);
  const colors = new Float32Array(stars.length * 3);
  const colorTmp = new THREE.Color();

  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    positions[i * 3] = s.x;
    positions[i * 3 + 1] = s.y;
    positions[i * 3 + 2] = s.z;

    colorTmp.set(s.color);
    colors[i * 3] = colorTmp.r * s.alpha;
    colors[i * 3 + 1] = colorTmp.g * s.alpha;
    colors[i * 3 + 2] = colorTmp.b * s.alpha;
  }

  return { positions, colors, count: stars.length };
}

const DESKTOP_STAR_BUFFERS = buildStarBuffers(DESKTOP_STARS);
const MOBILE_STAR_BUFFERS = buildStarBuffers(MOBILE_STARS);

function buildOrbitBuffer(body: SolarBody, segments: number): Float32Array {
  const pts = getOrbitPoints(body, segments);
  const loopPts = pts.length > 1 ? pts.slice(0, -1) : pts;
  const arr = new Float32Array(loopPts.length * 3);
  for (let i = 0; i < loopPts.length; i++) {
    arr[i * 3] = loopPts[i].x;
    arr[i * 3 + 1] = loopPts[i].y;
    arr[i * 3 + 2] = loopPts[i].z;
  }
  return arr;
}

const DESKTOP_ORBITS: ReadonlyMap<SectionId, Float32Array> = new Map(
  SOLAR_BODIES.filter((b) => b.orbitRadius > 0).map((b) => [
    b.id,
    buildOrbitBuffer(b, 96),
  ])
);

const MOBILE_ORBITS: ReadonlyMap<SectionId, Float32Array> = new Map(
  SOLAR_BODIES.filter((b) => b.orbitRadius > 0).map((b) => [
    b.id,
    buildOrbitBuffer(b, 48),
  ])
);

function updateThreeCamera(
  camera: THREE.Camera,
  controls: OrbitControlsInstance | null,
  rig: CameraRigState
) {
  camera.position.set(rig.position.x, rig.position.y, rig.position.z);
  if (controls) {
    controls.target.set(rig.target.x, rig.target.y, rig.target.z);
    controls.update();
  } else {
    camera.lookAt(rig.target.x, rig.target.y, rig.target.z);
  }
}

function StarfieldPoints({
  isMobile,
  reducedMotion,
}: {
  isMobile: boolean;
  reducedMotion: boolean;
}) {
  const pointsRef = useRef<THREE.Points | null>(null);
  const buffers = isMobile ? MOBILE_STAR_BUFFERS : DESKTOP_STAR_BUFFERS;

  useFrame(({ camera }, delta) => {
    const pts = pointsRef.current;
    if (!pts) return;
    // Light parallax relative to camera position (disabled under reducedMotion)
    const offset = getStarfieldParallaxOffset(camera.position, reducedMotion);
    pts.position.set(offset.x, offset.y, offset.z);
    if (!reducedMotion) {
      pts.rotation.y += Math.min(delta, 0.1) * 0.008;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[buffers.positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[buffers.colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={isMobile ? 0.42 : 0.34}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function OrbitTrails({
  activeId,
  hoveredId,
  isMobile,
}: {
  activeId: SectionId | null;
  hoveredId: SectionId | null;
  isMobile: boolean;
}) {
  const orbitMap = isMobile ? MOBILE_ORBITS : DESKTOP_ORBITS;

  return (
    <group>
      {SOLAR_BODIES.map((body) => {
        const positions = orbitMap.get(body.id);
        if (!positions || positions.length === 0) return null;
        const isHighlighted = activeId === body.id || hoveredId === body.id;
        return (
          <lineLoop key={body.id}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[positions, 3]}
              />
            </bufferGeometry>
            <lineBasicMaterial
              color="#5cd6ff"
              transparent
              opacity={isHighlighted ? 0.58 : 0.18}
              depthWrite={false}
            />
          </lineLoop>
        );
      })}
    </group>
  );
}

interface BodyNodeProps {
  body: SolarBody;
  isSelected: boolean;
  isHovered: boolean;
  isMobile: boolean;
  reducedMotion: boolean;
  onGroupRef: (el: THREE.Group | null) => void;
  onSpinRef: (el: THREE.Group | null) => void;
  onGlowRef: (el: THREE.Mesh | null) => void;
  onSelectBody: (id: SectionId) => void;
  onHoverBody: (id: SectionId | null) => void;
}

function SolarBodyNode({
  body,
  isSelected,
  isHovered,
  isMobile,
  reducedMotion,
  onGroupRef,
  onSpinRef,
  onGlowRef,
  onSelectBody,
  onHoverBody,
}: BodyNodeProps) {
  const initialPos = useMemo(() => getBodyPosition(body, 0), [body]);
  const sphereSegments = isMobile ? 18 : 32;
  const highlighted = isSelected || isHovered;
  const initialGlow = getBodyGlowPulse(0, highlighted, reducedMotion);

  return (
    <group
      ref={onGroupRef}
      position={[initialPos.x, initialPos.y, initialPos.z]}
    >
      <group
        ref={onSpinRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelectBody(body.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHoverBody(body.id);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onHoverBody(null);
        }}
      >
        {body.kind === "star" && (
          <mesh>
            <sphereGeometry
              args={[body.radius, sphereSegments, sphereSegments]}
            />
            <meshBasicMaterial color={body.color} />
          </mesh>
        )}

        {/* Interactive glow shell (pulses subtly only when !reducedMotion) */}
        {(body.kind === "star" || highlighted) && (
          <mesh ref={onGlowRef} scale={initialGlow.scale}>
            <sphereGeometry
              args={[body.radius, sphereSegments, sphereSegments]}
            />
            <meshBasicMaterial
              color={body.accentColor}
              transparent
              opacity={initialGlow.opacity}
              depthWrite={false}
            />
          </mesh>
        )}

        {body.kind === "planet" && (
          <>
            <mesh>
              <sphereGeometry
                args={[body.radius, sphereSegments, sphereSegments]}
              />
              <meshStandardMaterial
                color={body.color}
                emissive={highlighted ? body.accentColor : body.color}
                emissiveIntensity={highlighted ? 0.42 : 0.12}
                roughness={0.62}
                metalness={0.15}
              />
            </mesh>
            {body.hasRing && (
              <mesh rotation={[Math.PI / 2 - 0.32, 0.18, 0]}>
                <ringGeometry
                  args={[
                    body.radius * 1.38,
                    body.radius * 2.05,
                    isMobile ? 28 : 48,
                  ]}
                />
                <meshBasicMaterial
                  color={isSelected ? "#5cd6ff" : body.accentColor}
                  side={THREE.DoubleSide}
                  transparent
                  opacity={isSelected ? 0.65 : 0.36}
                  depthWrite={false}
                />
              </mesh>
            )}
          </>
        )}

        {body.kind === "station" && (
          <group rotation={[0.2, 0.4, -0.15]}>
            {/* Central station core */}
            <mesh>
              <cylinderGeometry
                args={[body.radius * 0.42, body.radius * 0.42, body.radius * 1.3, 12]}
              />
              <meshStandardMaterial
                color="#e8ecf4"
                emissive={highlighted ? "#5cd6ff" : "#1e293b"}
                emissiveIntensity={highlighted ? 0.45 : 0.15}
                metalness={0.55}
                roughness={0.35}
              />
            </mesh>
            {/* Truss */}
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry
                args={[body.radius * 0.08, body.radius * 0.08, body.radius * 3.8, 8]}
              />
              <meshStandardMaterial color="#9aa6bd" metalness={0.5} roughness={0.4} />
            </mesh>
            {/* Left solar array */}
            <mesh position={[-body.radius * 1.35, 0, 0]}>
              <boxGeometry
                args={[body.radius * 1.15, body.radius * 0.06, body.radius * 0.72]}
              />
              <meshStandardMaterial
                color={body.color}
                emissive={body.color}
                emissiveIntensity={highlighted ? 0.5 : 0.22}
                metalness={0.4}
                roughness={0.3}
              />
            </mesh>
            {/* Right solar array */}
            <mesh position={[body.radius * 1.35, 0, 0]}>
              <boxGeometry
                args={[body.radius * 1.15, body.radius * 0.06, body.radius * 0.72]}
              />
              <meshStandardMaterial
                color={body.color}
                emissive={body.color}
                emissiveIntensity={highlighted ? 0.5 : 0.22}
                metalness={0.4}
                roughness={0.3}
              />
            </mesh>
            {/* Beacon */}
            <mesh position={[0, body.radius * 0.85, 0]}>
              <sphereGeometry args={[body.radius * 0.18, 12, 12]} />
              <meshBasicMaterial color={body.accentColor} />
            </mesh>
          </group>
        )}

        {/* Subtle interactive selection/hover ring */}
        {highlighted && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry
              args={[body.radius * 1.45, body.radius * 1.56, isMobile ? 24 : 40]}
            />
            <meshBasicMaterial
              color={isSelected ? "#5cd6ff" : "#ffb454"}
              side={THREE.DoubleSide}
              transparent
              opacity={0.85}
              depthWrite={false}
            />
          </mesh>
        )}
      </group>
    </group>
  );
}

interface SolarSystemRigProps extends Omit<SolarCanvas3DProps, "canvasAriaLabel" | "sections"> {
  onProjectMarker: (
    index: number,
    screenX: number,
    screenY: number,
    visible: boolean
  ) => void;
}

function SolarSystemRig({
  activeId,
  hoveredId,
  reducedMotion,
  isMobile,
  onProjectMarker,
  onSelectBody,
  onHoverBody,
}: SolarSystemRigProps) {
  const simTimeRef = useRef(0);
  const controlsRef = useRef<OrbitControlsInstance | null>(null);
  const bodyGroupRefs = useRef<(THREE.Group | null)[]>([]);
  const bodySpinRefs = useRef<(THREE.Group | null)[]>([]);
  const bodyGlowRefs = useRef<(THREE.Mesh | null)[]>([]);
  const projVec = useMemo(() => new THREE.Vector3(), []);
  const camDir = useMemo(() => new THREE.Vector3(), []);
  const bodyPosVec = useMemo(() => new THREE.Vector3(), []);

  const flightRef = useRef<{
    inFlight: boolean;
    lastActiveId: SectionId | null;
    lastBodyPos: Vec3 | null;
    rig: CameraRigState;
  }>({
    inFlight: true,
    lastActiveId: null,
    lastBodyPos: null,
    rig: {
      position: { ...OVERVIEW_CAMERA.position },
      target: { ...OVERVIEW_CAMERA.target },
    },
  });

  useEffect(() => {
    flightRef.current.inFlight = true;
    flightRef.current.lastActiveId = activeId;
    flightRef.current.lastBodyPos = null;
  }, [activeId]);

  useFrame(({ camera, size }, delta) => {
    const dtSec = Math.min(0.1, Math.max(0.001, delta));
    if (!reducedMotion) {
      simTimeRef.current += dtSec;
    }

    const nowSec = simTimeRef.current;

    // 1. Update all 3D body positions and axial spins
    for (let i = 0; i < SOLAR_BODIES.length; i++) {
      const body = SOLAR_BODIES[i];
      const grp = bodyGroupRefs.current[i];
      if (grp) {
        const pos = getBodyPosition(body, nowSec);
        grp.position.set(pos.x, pos.y, pos.z);
      }
      const spin = bodySpinRefs.current[i];
      if (spin && !reducedMotion) {
        spin.rotation.y += dtSec * (body.kind === "star" ? 0.12 : 0.35);
      }
      const glowMesh = bodyGlowRefs.current[i];
      if (glowMesh) {
        const isHighlighted = activeId === body.id || hoveredId === body.id;
        const glow = getBodyGlowPulse(nowSec, isHighlighted, reducedMotion);
        glowMesh.scale.setScalar(glow.scale);
        const mat = glowMesh.material;
        if (mat && !Array.isArray(mat) && "opacity" in mat) {
          mat.opacity = glow.opacity;
        }
      }
    }

    // 2. Step camera flight or lock onto active orbiting body
    const f = flightRef.current;
    const controls = controlsRef.current;
    const activeBody = getBodyById(activeId);

    if (f.inFlight) {
      const desired = activeBody
        ? getDesiredCameraForBody(activeBody, nowSec)
        : getDesiredOverviewCamera();

      f.rig = {
        position: {
          x: camera.position.x,
          y: camera.position.y,
          z: camera.position.z,
        },
        target: controls
          ? {
            x: controls.target.x,
            y: controls.target.y,
            z: controls.target.z,
          }
          : f.rig.target,
      };

      const nextRig = stepCameraFlight(f.rig, desired, dtSec, reducedMotion);
      f.rig = nextRig;
      updateThreeCamera(camera, controls, nextRig);

      if (activeBody) {
        f.lastBodyPos = getBodyPosition(activeBody, nowSec);
      }

      const distRemaining = Math.hypot(
        nextRig.position.x - desired.position.x,
        nextRig.position.y - desired.position.y,
        nextRig.position.z - desired.position.z
      );
      if (reducedMotion || distRemaining < 0.08) {
        f.inFlight = false;
      }
    } else if (activeBody) {
      // Keep the camera and OrbitControls target locked onto the moving orbital body
      const currentBodyPos = getBodyPosition(activeBody, nowSec);
      if (f.lastBodyPos) {
        const dx = currentBodyPos.x - f.lastBodyPos.x;
        const dy = currentBodyPos.y - f.lastBodyPos.y;
        const dz = currentBodyPos.z - f.lastBodyPos.z;
        const nextRig: CameraRigState = {
          position: {
            x: camera.position.x + dx,
            y: camera.position.y + dy,
            z: camera.position.z + dz,
          },
          target: controls
            ? {
              x: controls.target.x + dx,
              y: controls.target.y + dy,
              z: controls.target.z + dz,
            }
            : currentBodyPos,
        };
        updateThreeCamera(camera, controls, nextRig);
      }
      f.lastBodyPos = currentBodyPos;
    }

    // 3. Project 3D body marker coordinates into the 2D HUD overlay
    camera.updateMatrixWorld();
    camera.getWorldDirection(camDir);

    for (let i = 0; i < SOLAR_BODIES.length; i++) {
      const body = SOLAR_BODIES[i];
      const pos = getBodyPosition(body, nowSec);
      bodyPosVec.set(pos.x, pos.y, pos.z);
      const inFront = bodyPosVec.sub(camera.position).dot(camDir) > 0;

      if (!inFront) {
        onProjectMarker(i, 0, 0, false);
        continue;
      }

      projVec.set(pos.x, pos.y - (body.radius + 0.58), pos.z);
      projVec.project(camera);

      const isVisible =
        size.width > 0 &&
        size.height > 0 &&
        projVec.z >= -1 &&
        projVec.z <= 1 &&
        projVec.x >= -1.25 &&
        projVec.x <= 1.25 &&
        projVec.y >= -1.25 &&
        projVec.y <= 1.25;

      if (isVisible) {
        const screenX = (projVec.x * 0.5 + 0.5) * size.width;
        const screenY = (-(projVec.y * 0.5) + 0.5) * size.height;
        onProjectMarker(i, screenX, screenY, true);
      } else {
        onProjectMarker(i, 0, 0, false);
      }
    }
  });

  return (
    <>
      <color attach="background" args={["#05070d"]} />
      <ambientLight intensity={0.38} />
      <pointLight
        position={[0, 0, 0]}
        intensity={2.6}
        distance={80}
        decay={0.6}
        color="#ffd89b"
      />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableRotate
        enableZoom
        enablePan={false}
        enableDamping={!reducedMotion}
        dampingFactor={0.08}
        minDistance={2.2}
        maxDistance={58}
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_PAN,
        }}
        onStart={() => {
          flightRef.current.inFlight = false;
        }}
      />

      <StarfieldPoints isMobile={isMobile} reducedMotion={reducedMotion} />

      <OrbitTrails
        activeId={activeId}
        hoveredId={hoveredId}
        isMobile={isMobile}
      />

      {SOLAR_BODIES.map((body, idx) => (
        <SolarBodyNode
          key={body.id}
          body={body}
          isSelected={activeId === body.id}
          isHovered={hoveredId === body.id}
          isMobile={isMobile}
          reducedMotion={reducedMotion}
          onGroupRef={(el) => {
            bodyGroupRefs.current[idx] = el;
          }}
          onSpinRef={(el) => {
            bodySpinRefs.current[idx] = el;
          }}
          onGlowRef={(el) => {
            bodyGlowRefs.current[idx] = el;
          }}
          onSelectBody={onSelectBody}
          onHoverBody={onHoverBody}
        />
      ))}
    </>
  );
}

export default function SolarCanvas3D(props: SolarCanvas3DProps) {
  const markerRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleProjectMarker = useCallback(
    (index: number, screenX: number, screenY: number, visible: boolean) => {
      const markerEl = markerRefs.current[index];
      if (!markerEl) return;
      if (visible) {
        markerEl.style.display = "block";
        markerEl.style.transform = `translate3d(${screenX.toFixed(1)}px, ${screenY.toFixed(1)}px, 0) translate(-50%, -50%)`;
      } else {
        markerEl.style.display = "none";
      }
    },
    []
  );

  return (
    <div
      role="region"
      aria-label={props.canvasAriaLabel}
      className={`relative h-full w-full ${props.hoveredId ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
        }`}
    >
      <Canvas
        dpr={props.qualityProfile ? props.qualityProfile.dpr : props.isMobile ? [1, 1.25] : [1, 2]}
        camera={{
          position: [
            OVERVIEW_CAMERA.position.x,
            OVERVIEW_CAMERA.position.y,
            OVERVIEW_CAMERA.position.z,
          ],
          fov: 50,
          near: 0.1,
          far: 220,
        }}
        gl={{
          antialias: props.qualityProfile ? props.qualityProfile.antialias : !props.isMobile,
          powerPreference: "high-performance",
        }}
      >
        <SolarSystemRig
          activeId={props.activeId}
          hoveredId={props.hoveredId}
          reducedMotion={props.reducedMotion}
          isMobile={props.isMobile}
          onProjectMarker={handleProjectMarker}
          onSelectBody={props.onSelectBody}
          onHoverBody={props.onHoverBody}
        />
      </Canvas>

      {/* Accessible 2D HUD Marker Overlay synchronized with 3D body positions */}
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        {SOLAR_BODIES.map((body, idx) => {
          const sectionMeta = props.sections[body.sectionKey];
          const isSelected = props.activeId === body.id;
          return (
            <div
              key={body.id}
              ref={(el) => {
                markerRefs.current[idx] = el;
              }}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                transform: "translate3d(-9999px, -9999px, 0)",
              }}
              className="pointer-events-auto will-change-transform"
            >
              <button
                type="button"
                data-body-marker={body.id}
                onClick={() => props.onSelectBody(body.id)}
                onMouseEnter={() => props.onHoverBody(body.id)}
                onMouseLeave={() => props.onHoverBody(null)}
                aria-label={`${sectionMeta.body} — ${sectionMeta.label} (${body.shortcut})`}
                aria-pressed={isSelected}
                className={`micro whitespace-nowrap border px-2 py-0.5 backdrop-blur-xs transition-colors ${isSelected
                    ? "border-accent bg-accent/20 text-fg"
                    : "border-[var(--hairline)] bg-bg/80 text-accent hover:border-accent hover:text-fg"
                  }`}
              >
                [{body.shortcut}] {sectionMeta.body} · {sectionMeta.label}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
