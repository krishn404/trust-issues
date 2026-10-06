"use client";

import { Center, Environment, Float, OrbitControls, PerspectiveCamera, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import { MathUtils, type Group } from "three";

export type SceneSettings = {
  motionSpeed: number;
  rotationAngle: number;
  keyLight: number;
  fillLight: number;
  environmentLight: number;
  shadows: boolean;
  modelX: number;
  modelY: number;
  modelZ: number;
};

function Character({ settings }: { settings: SceneSettings }) {
  const group = useRef<Group>(null);
  const { scene } = useGLTF("/models/clay-character.glb");

  useFrame((state) => {
    if (!group.current) return;
    group.current.rotation.y = (state.clock.elapsedTime * settings.motionSpeed) + MathUtils.degToRad(settings.rotationAngle);
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

function LoadingFallback() {
  return null;
}

export default function CharacterScene({ settings }: { settings: SceneSettings }) {
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      shadows={settings.shadows}
      aria-label="Interactive 3D Trust Issues"
    >
      <PerspectiveCamera makeDefault position={[0, 0.7, 5.1]} fov={35} />
      <ambientLight intensity={1.9} />
      <directionalLight position={[4, 7, 5]} intensity={settings.keyLight} castShadow={settings.shadows} />
      <directionalLight position={[-4, 2, -3]} intensity={settings.fillLight} color="#9acfff" />
      <Suspense fallback={<LoadingFallback />}>
        <Character settings={settings} />
        <Environment preset="city" environmentIntensity={settings.environmentLight} />
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
