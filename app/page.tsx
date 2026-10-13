import AnalyticsTracker from "./components/AnalyticsTracker";
import AudioPlayer from "./components/AudioPlayer";
import CharacterScene, { type SceneSettings } from "./components/CharacterScene";
import GradientBackground from "./components/GradientBackground";

const sceneSettings: SceneSettings = {
  motionSpeed: 0.35,
  rotationAngle: 7,
  keyLight: 6,
  fillLight: 4,
  environmentLight: 1.45,
  cinematicLight: 1.7,
  cinematicExposure: 1.45,
  lightAngle: 70,
  lightSoftness: 1,
  surfaceSheen: 0,
  surfaceGlow: 0,
  lightBlendMode: "normal",
  shadows: true,
  modelX: 0,
  modelY: 0,
  modelZ: 0,
  tiltX: 7,
  tiltZ: -12,
};

export default function Home() {
  return (
    <main
      className="relative isolate h-dvh w-screen overflow-hidden [--frame:clamp(4px,0.45vw,8px)] after:pointer-events-none after:absolute after:inset-0 after:z-[2] after:[border-width:var(--frame)] after:border-solid after:border-[#d5feff] after:content-['']"
      aria-label="Interactive Trust Issues scene"
    >
      <AnalyticsTracker />
      <GradientBackground />
      <CharacterScene settings={sceneSettings} />
      <AudioPlayer />
      <p className="absolute left-1/2 top-[calc(var(--frame)+1.1rem)] z-[2] m-0 -translate-x-1/2 select-none whitespace-nowrap text-[0.72rem] uppercase tracking-[0.12em] text-white/80 [text-shadow:0_1px_12px_rgba(20,16,65,0.38)] max-[600px]:top-[calc(var(--frame)+0.8rem)] max-[600px]:text-[0.62rem]">
        Music artist - <a href="https://www.instagram.com/extern.music" target="_blank" rel="noopener noreferrer" className="font-semibold normal-case tracking-[0.06em] text-white/95 transition-colors hover:text-[#d5feff] hover:underline hover:underline-offset-4">Extern</a>
      </p>
      <div className="absolute left-1/2 top-[calc(var(--frame)+2.15rem)] z-[2] flex -translate-x-1/2 select-none flex-col items-center gap-1 whitespace-nowrap [text-shadow:0_1px_12px_rgba(20,16,65,0.38)] max-[600px]:top-[calc(var(--frame)+1.8rem)]">
        <p className="m-0 text-[0.58rem] uppercase tracking-[0.1em] text-white/70 max-[600px]:text-[0.5rem]">
          3D model - <a href="https://www.instagram.com/4thdraft.psd/" target="_blank" rel="noopener noreferrer" className="text-[0.82rem] font-semibold normal-case tracking-[0.06em] text-white/95 transition-colors hover:text-[#d5feff] hover:underline hover:underline-offset-4 max-[600px]:text-[0.68rem]">4thdraft.psd</a>
          {" · "}
          Web UI - <a href="https://www.instagram.com/kantcancook" target="_blank" rel="noopener noreferrer" className="text-[0.82rem] font-semibold normal-case tracking-[0.06em] text-white/95 transition-colors hover:text-[#d5feff] hover:underline hover:underline-offset-4 max-[600px]:text-[0.68rem]">kantcancook</a>
        </p>
      </div>
    </main>
  );
}
