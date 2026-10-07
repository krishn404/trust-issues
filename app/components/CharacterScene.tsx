"use client";

import { Center, Environment, Float, OrbitControls, PerspectiveCamera, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import { MathUtils, type Group, type Mesh, type MeshStandardMaterial } from "three";

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

function Character({ settings }: { settings: SceneSettings }) {
  const group = useRef<Group>(null);
  const materials = useRef<MeshStandardMaterial[]>([]);
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

  useFrame((state) => {
    if (!group.current) return;
    group.current.rotation.y = (state.clock.elapsedTime * settings.motionSpeed) + MathUtils.degToRad(settings.rotationAngle);
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
      <PerspectiveCamera makeDefault position={[0, 0.7, 5.1]} fov={35} />
      <ambientLight color="#8bbfd7" intensity={0.58} />
      <Suspense fallback={<LoadingFallback />}>
        <Character settings={settings} />
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
    </Canvas>
  );
}

useGLTF.preload("/models/clay-character.glb");
