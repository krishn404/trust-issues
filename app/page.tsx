"use client";

import { useState } from "react";
import CharacterScene, { type SceneSettings } from "./components/CharacterScene";

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
      <CharacterScene settings={settings} />
      <aside className="control-panel" aria-label="Scene controls">
        <div className="panel-handle" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="panel-content">
          <p className="panel-eyebrow">Scene controls</p>
          <h1>Fine tune</h1>

          <label>
            <span>Motion speed <output>{settings.motionSpeed.toFixed(2)}×</output></span>
            <input type="range" min="0" max="2" step="0.05" value={settings.motionSpeed} onChange={(event) => updateSetting("motionSpeed", Number(event.target.value))} />
          </label>
          <label>
            <span>Starting angle <output>{settings.rotationAngle}°</output></span>
            <input type="range" min="0" max="360" step="1" value={settings.rotationAngle} onChange={(event) => updateSetting("rotationAngle", Number(event.target.value))} />
          </label>
          <label>
            <span>Key light <output>{settings.keyLight.toFixed(1)}</output></span>
            <input type="range" min="0" max="6" step="0.1" value={settings.keyLight} onChange={(event) => updateSetting("keyLight", Number(event.target.value))} />
          </label>
          <label>
            <span>Fill light <output>{settings.fillLight.toFixed(1)}</output></span>
            <input type="range" min="0" max="4" step="0.1" value={settings.fillLight} onChange={(event) => updateSetting("fillLight", Number(event.target.value))} />
          </label>
          <label>
            <span>Environment <output>{settings.environmentLight.toFixed(2)}</output></span>
            <input type="range" min="0" max="2" step="0.05" value={settings.environmentLight} onChange={(event) => updateSetting("environmentLight", Number(event.target.value))} />
          </label>
          <button
            className="shadow-toggle"
            type="button"
            aria-pressed={settings.shadows}
            onClick={() => updateSetting("shadows", !settings.shadows)}
          >
            <span>Shadows</span>
            <i />
          </button>
          <section className="placement-controls" aria-labelledby="placement-heading">
            <p id="placement-heading">Model placement</p>
            <label>
              <span>X axis <output>{settings.modelX.toFixed(1)}</output></span>
              <input type="range" min="-2" max="2" step="0.1" value={settings.modelX} onChange={(event) => updateSetting("modelX", Number(event.target.value))} />
            </label>
            <label>
              <span>Y axis <output>{settings.modelY.toFixed(1)}</output></span>
              <input type="range" min="-2" max="2" step="0.1" value={settings.modelY} onChange={(event) => updateSetting("modelY", Number(event.target.value))} />
            </label>
            <label>
              <span>Z axis <output>{settings.modelZ.toFixed(1)}</output></span>
              <input type="range" min="-2" max="2" step="0.1" value={settings.modelZ} onChange={(event) => updateSetting("modelZ", Number(event.target.value))} />
            </label>
          </section>
        </div>
      </aside>
      <p className="hint">Drag to explore · Scroll to zoom</p>
    </main>
  );
}
