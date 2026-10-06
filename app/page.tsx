"use client";

import { useState } from "react";
import CharacterScene, { type SceneSettings } from "./components/CharacterScene";
import ControlPanel from "./components/ControlPanel";
import GradientBackground from "./components/GradientBackground";
import AudioPlayer from "./components/AudioPlayer";

const initialSettings: SceneSettings = {
  motionSpeed: 0.35,
  rotationAngle: 7,
  keyLight: 3.2,
  fillLight: 1.5,
  environmentLight: 0.55,
  shadows: true,
  modelX: 0,
  modelY: 0,
  modelZ: 0,
};

export default function Home() {
  const [settings, setSettings] = useState<SceneSettings>(initialSettings);

  const updateSetting = <K extends keyof SceneSettings>(key: K, value: SceneSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  return (
    <main className="showcase" aria-label="Interactive Trust Issues scene">
      <GradientBackground />
      <CharacterScene settings={settings} />
      <AudioPlayer />
      <ControlPanel settings={settings} onChange={updateSetting} />
      <p className="hint">Drag to interact · Scroll to zoom</p>
    </main>
  );
}