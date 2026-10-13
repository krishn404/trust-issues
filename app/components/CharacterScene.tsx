"use client";

import { Center, Environment, Float, OrbitControls, PerspectiveCamera, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef, type MutableRefObject } from "react";
import { MathUtils, type Group, type Mesh, type MeshStandardMaterial } from "three";

const RESUME_DELAY_MS = 10_000;
const DRAG_PX = 6;

type Gesture = { x: number; y: number; dragged: boolean; zoom: boolean };

function useAutoRotatePause(paused: MutableRefObject<boolean>) {
  const gl = useThree((state) => state.gl);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const zoomUntil = useRef(0);
  const pointers = useRef(new Map<number, Gesture>());
  const touches = useRef(new Map<number, Gesture>());

  useEffect(() => {
    const el = gl.domElement;
    const dragStillHeld = () => {
      for (const gesture of pointers.current.values()) if (gesture.dragged && !gesture.zoom) return true;
      for (const gesture of touches.current.values()) if (gesture.dragged && !gesture.zoom) return true;
      return false;
    };

    const clearResume = () => {
      if (resumeTimer.current !== null) {
        clearTimeout(resumeTimer.current);
        resumeTimer.current = null;
      }
    };

    const pause = () => {
      paused.current = true;
      clearResume();
    };

    const scheduleResume = () => {
      clearResume();
      resumeTimer.current = setTimeout(() => {
        resumeTimer.current = null;
        if (dragStillHeld()) return;
        paused.current = false;
      }, RESUME_DELAY_MS);
    };

    const noteMove = (gesture: Gesture, x: number, y: number) => {
      if (gesture.zoom) return;
      if (gesture.dragged) {
        pause();
        return;
      }
      const dx = x - gesture.x;
      const dy = y - gesture.y;
      if (dx * dx + dy * dy < DRAG_PX * DRAG_PX) return;
      gesture.dragged = true;
      pause();
    };

    const markZoom = () => {
      zoomUntil.current = performance.now() + 250;
      for (const gesture of pointers.current.values()) {
        gesture.zoom = true;
        gesture.dragged = false;
      }
      for (const gesture of touches.current.values()) {
        gesture.zoom = true;
        gesture.dragged = false;
      }
      if (resumeTimer.current === null) paused.current = false;
    };

    const isZooming = () => performance.now() < zoomUntil.current;

    const finishGesture = (dragged: boolean) => {
      if (!dragged) return;
      if (dragStillHeld()) {
        pause();
        return;
      }
      paused.current = true;
      scheduleResume();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY, dragged: false, zoom: isZooming() });
    };

    const onPointerMove = (event: PointerEvent) => {
      const gesture = pointers.current.get(event.pointerId);
      if (!gesture) return;
      noteMove(gesture, event.clientX, event.clientY);
    };

    const onPointerUp = (event: PointerEvent) => {
      const gesture = pointers.current.get(event.pointerId);
      if (!gesture) return;
      pointers.current.delete(event.pointerId);
      finishGesture(gesture.dragged);
    };

    const onWheel = () => {
      markZoom();
    };

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length >= 2) {
        markZoom();
        return;
      }
      for (const touch of Array.from(event.changedTouches)) {
        touches.current.set(touch.identifier, { x: touch.clientX, y: touch.clientY, dragged: false, zoom: isZooming() });
      }
    };

    const onTouchMove = (event: TouchEvent) => {
      for (const touch of Array.from(event.changedTouches)) {
        const gesture = touches.current.get(touch.identifier);
        if (gesture) noteMove(gesture, touch.clientX, touch.clientY);
      }
    };

    const onTouchEnd = (event: TouchEvent) => {
      for (const touch of Array.from(event.changedTouches)) {
        const gesture = touches.current.get(touch.identifier);
        if (!gesture) continue;
        touches.current.delete(touch.identifier);
        finishGesture(gesture.dragged);
      }
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("wheel", onWheel, { passive: true });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      clearResume();
      pointers.current.clear();
      touches.current.clear();
    };
  }, [gl, paused]);
}

export type SceneSettings = {
  motionSpeed: number;
  rotationAngle: number;
  keyLight: number;
  fillLight: number;
  environmentLight: number;
  cinematicLight: number;
  cinematicExposure: number;
  lightAngle: number;
  lightSoftness: number;
  surfaceSheen: number;
  surfaceGlow: number;
  lightBlendMode: "normal" | "screen" | "overlay" | "soft-light" | "color-dodge";
  shadows: boolean;
  modelX: number;
  modelY: number;
  modelZ: number;
  tiltX: number;
  tiltZ: number;
};

function Character({
  settings,
  autoRotatePaused,
}: {
  settings: SceneSettings;
  autoRotatePaused: MutableRefObject<boolean>;
}) {
  const group = useRef<Group>(null);
  const materials = useRef<MeshStandardMaterial[]>([]);
  const spin = useRef(MathUtils.degToRad(settings.rotationAngle));
  const { scene } = useGLTF("/models/clay-character.glb");

  useEffect(() => {
    const sceneMaterials: MeshStandardMaterial[] = [];
    scene.traverse((child) => {
      const mesh = child as Mesh;
      if (!mesh.isMesh) return;

      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const meshMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      meshMaterials
        .filter((material): material is MeshStandardMaterial => (material as MeshStandardMaterial).isMeshStandardMaterial)
        .forEach((standardMaterial) => {
          sceneMaterials.push(standardMaterial);
        standardMaterial.color.set("#d5feff");
        standardMaterial.emissive.set("#43779c");
        standardMaterial.envMapIntensity = 0.28;
        standardMaterial.needsUpdate = true;
        });
    });
    materials.current = sceneMaterials;
  }, [scene]);

  useFrame((state, delta) => {
    if (!group.current) return;
    if (!autoRotatePaused.current) spin.current += delta * settings.motionSpeed;
    group.current.rotation.y = spin.current;
    group.current.rotation.x = MathUtils.degToRad(settings.tiltX);
    group.current.rotation.z = MathUtils.degToRad(settings.tiltZ);
    materials.current.forEach((material) => {
      material.roughness = 0.58 - settings.surfaceSheen * 0.3;
      material.metalness = 0.04 + settings.surfaceSheen * 0.2;
      material.emissiveIntensity = settings.surfaceGlow * (0.72 + Math.sin(state.clock.elapsedTime * 1.15) * 0.28);
    });
  });

  return (
    <Float speed={1.25} rotationIntensity={0.08} floatIntensity={0.22}>
      <group ref={group} position={[settings.modelX, settings.modelY, settings.modelZ]}>
        <Center>
          <primitive object={scene} scale={1.1} />
        </Center>
      </group>
    </Float>
  );
}

function CinematicModelLights({ settings }: { settings: SceneSettings }) {
  const lights = useRef<Group>(null);
  const keyAngle = MathUtils.degToRad(settings.lightAngle);
  const keyDistance = 5.6;

  useFrame((state) => {
    if (!lights.current) return;
    lights.current.position.y = settings.modelY + Math.sin(state.clock.elapsedTime * 0.32) * 0.12;
  });

  return (
    <group ref={lights} position={[settings.modelX, settings.modelY, settings.modelZ]}>
      <spotLight
        color="#d5feff"
        intensity={settings.keyLight * 1.55 * settings.cinematicLight}
        position={[Math.sin(keyAngle) * keyDistance, 5, Math.cos(keyAngle) * keyDistance]}
        angle={0.24 + settings.lightSoftness * 0.48}
        penumbra={settings.lightSoftness}
        decay={2}
        distance={14}
        castShadow={settings.shadows}
      />
      <directionalLight color="#72add1" intensity={settings.fillLight * 0.9 * settings.cinematicLight} position={[4, 1.5, 2]} />
      <directionalLight color="#3a416d" intensity={1.5 * settings.cinematicLight} position={[1, 2.5, -4]} />
      <pointLight color="#d5feff" intensity={2.4 * settings.cinematicLight} distance={7} decay={2} position={[0, 4, 2.5]} />
    </group>
  );
}

function LoadingFallback() {
  return null;
}

function SceneContents({ settings }: { settings: SceneSettings }) {
  const autoRotatePaused = useRef(false);
  useAutoRotatePause(autoRotatePaused);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0.7, 5.1]} fov={35} />
      <ambientLight color="#8bbfd7" intensity={0.58} />
      <Suspense fallback={<LoadingFallback />}>
        <Character settings={settings} autoRotatePaused={autoRotatePaused} />
        <CinematicModelLights settings={settings} />
        <Environment preset="city" environmentIntensity={settings.environmentLight * 0.7} />
      </Suspense>
      <OrbitControls
        enablePan={false}
        minDistance={2.5}
        maxDistance={8}
        minPolarAngle={0.01}
        maxPolarAngle={Math.PI - 0.01}
        rotateSpeed={0.65}
        zoomSpeed={0.7}
      />
    </>
  );
}

export default function CharacterScene({ settings }: { settings: SceneSettings }) {
  return (
    <Canvas
      className="!absolute !inset-0 z-[1] touch-none"
      style={{ mixBlendMode: settings.lightBlendMode }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, toneMappingExposure: settings.cinematicExposure }}
      shadows={settings.shadows}
      aria-label="Interactive 3D Trust Issues"
    >
      <SceneContents settings={settings} />
    </Canvas>
  );
}

useGLTF.preload("/models/clay-character.glb");
