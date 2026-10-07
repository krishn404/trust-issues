"use client";

import { motion } from "framer-motion";
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { SceneSettings } from "./CharacterScene";

type ControlPanelProps = {
  settings: SceneSettings;
  onChange: <K extends keyof SceneSettings>(key: K, value: SceneSettings[K]) => void;
};

const R = 30; // flare size where the panel meets the screen edge
const NOTCH = { width: 28, height: 132, radius: "18px 0 0 18px" };
const OPEN = { width: 366, height: "min(760px, calc(100dvh - 2rem))", radius: "30px 0 0 30px" };
const spring = { type: "spring", stiffness: 320, damping: 26, mass: 0.9 } as const;

function Flare({ edge, open }: { edge: "top" | "bottom"; open: boolean }) {
  const isTop = edge === "top";
  return (
    <motion.span
      className="pointer-events-none absolute right-0 h-[30px] w-[30px]"
      aria-hidden
      initial={false}
      animate={{ scale: open ? 1 : 0.4 }}
      transition={spring}
      style={{
        [edge]: -R,
        transformOrigin: isTop ? "bottom right" : "top right",
        background: `radial-gradient(circle at 0 ${isTop ? "0" : "100%"}, transparent ${R - 0.5}px, #000 ${R}px)`,
      }}
    />
  );
}

type GlassSliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (value: number) => string;
  onChange: (value: number) => void;
};

function GlassSlider({ label, value, min, max, step, format, onChange }: GlassSliderProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const pct = ((value - min) / (max - min)) * 100;

  const clamp = (v: number) => Math.min(max, Math.max(min, Number((Math.round(v / step) * step).toFixed(5))));

  const setFromX = (clientX: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const t = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    onChange(clamp(min + t * (max - min)));
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    setFromX(e.clientX);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging) setFromX(e.clientX);
  };
  const onPointerUp = () => setDragging(false);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      onChange(clamp(value + step));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      onChange(clamp(value - step));
    }
  };

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      className={`relative h-[54px] shrink-0 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.07] touch-none select-none outline-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 rounded-2xl bg-white/20"
        style={{ width: `${pct}%` }}
      />
      <span
        className="pointer-events-none absolute top-1/2 h-[22px] w-0.5 -translate-y-1/2 rounded-sm bg-white/85"
        style={{ left: `max(18px, calc(${pct}% - 18px))` }}
      />
      <span
        className="pointer-events-none absolute left-8 top-1/2 -translate-y-1/2 text-[15px] font-medium text-white/80"
      >
        {label}
      </span>
      <span
        className="pointer-events-none absolute right-[18px] top-1/2 -translate-y-1/2 text-[15px] font-medium tabular-nums text-white"
      >
        {format ? format(value) : value}
      </span>
    </div>
  );
}

export default function ControlPanel({ settings, onChange }: ControlPanelProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openPanel = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setIsPanelOpen(true);
  };
  const closePanel = () => {
    closeTimer.current = setTimeout(() => setIsPanelOpen(false), 450);
  };

  const target = isPanelOpen ? OPEN : NOTCH;

  return (
    <motion.aside
      className="fixed bottom-0 top-0 right-[var(--frame)] left-auto z-[9999] my-auto block p-0"
      aria-label="Scene controls"
      initial={false}
      animate={{ width: target.width, height: target.height }}
      transition={spring}
      onMouseEnter={openPanel}
      onMouseLeave={closePanel}
    >
      <Flare edge="top" open={isPanelOpen} />
      <Flare edge="bottom" open={isPanelOpen} />
      <motion.div
        initial={false}
        animate={{ borderRadius: target.radius }}
        transition={spring}
        className={`relative h-full w-full overflow-hidden bg-black ${isPanelOpen ? "shadow-[0_24px_80px_rgba(0,0,0,0.55),inset_0_0_0_1px_rgba(255,255,255,0.1)]" : "shadow-[0_0_18px_rgba(255,255,255,0.18),inset_0_0_0_1px_rgba(255,255,255,0.22)]"}`}
      >
        <button
          type="button"
          aria-label={isPanelOpen ? "Close scene controls" : "Open scene controls"}
          aria-expanded={isPanelOpen}
          onClick={() => setIsPanelOpen((open) => !open)}
          className={`absolute inset-0 grid place-items-center border-0 bg-transparent p-0 transition-opacity duration-150 ${isPanelOpen ? "pointer-events-none opacity-0" : "cursor-pointer opacity-100"}`}
        >
          <span className="h-[34px] w-1 rounded-full bg-white/70" />
        </button>

        <div
          className={`flex h-full w-[366px] min-w-[366px] flex-col gap-2.5 overflow-y-auto p-[28px_24px_28px_28px] [scrollbar-width:none] ${isPanelOpen ? "opacity-100 blur-0 transition-[opacity,filter] delay-[120ms] duration-[280ms] ease-in" : "opacity-0 blur-[6px] transition-[opacity,filter] duration-[120ms] ease-in"}`}
          inert={!isPanelOpen}
        >
          <div className="mb-1.5">
            <p className="mb-1.5 text-[0.58rem] font-bold uppercase tracking-[0.14em] text-white/70">Scene controls</p>
            <h1 className="m-0 text-[1.35rem] font-semibold tracking-[-0.035em] text-white">Fine tune</h1>
          </div>

          <GlassSlider label="Motion speed" value={settings.motionSpeed} min={0} max={2} step={0.05} format={(v) => `${v.toFixed(2)}×`} onChange={(v) => onChange("motionSpeed", v)} />
          <GlassSlider label="Starting angle" value={settings.rotationAngle} min={0} max={360} step={1} format={(v) => `${v}°`} onChange={(v) => onChange("rotationAngle", v)} />
          <GlassSlider label="Key light" value={settings.keyLight} min={0} max={6} step={0.1} format={(v) => v.toFixed(1)} onChange={(v) => onChange("keyLight", v)} />
          <GlassSlider label="Fill light" value={settings.fillLight} min={0} max={4} step={0.1} format={(v) => v.toFixed(1)} onChange={(v) => onChange("fillLight", v)} />
          <GlassSlider label="Environment" value={settings.environmentLight} min={0} max={2} step={0.05} format={(v) => v.toFixed(2)} onChange={(v) => onChange("environmentLight", v)} />

          <p className="mb-0 ml-1 mr-0 mt-[14px] text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">
            Cinematic lighting
          </p>
          <GlassSlider label="Cool light" value={settings.cinematicLight} min={0} max={2} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => onChange("cinematicLight", v)} />
          <GlassSlider label="Exposure" value={settings.cinematicExposure} min={0.7} max={1.8} step={0.05} format={(v) => v.toFixed(2)} onChange={(v) => onChange("cinematicExposure", v)} />
          <GlassSlider label="Light angle" value={settings.lightAngle} min={-90} max={90} step={1} format={(v) => `${v}°`} onChange={(v) => onChange("lightAngle", v)} />
          <GlassSlider label="Light softness" value={settings.lightSoftness} min={0} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => onChange("lightSoftness", v)} />
          <GlassSlider label="Surface sheen" value={settings.surfaceSheen} min={0} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => onChange("surfaceSheen", v)} />
          <GlassSlider label="Soft glow" value={settings.surfaceGlow} min={0} max={0.6} step={0.02} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => onChange("surfaceGlow", v)} />
          <label className="flex h-[54px] shrink-0 items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.07] py-0 pl-8 pr-[18px] text-[15px] font-medium text-white/80">
            Blend mode
            <select
              aria-label="Cinematic light blend mode"
              value={settings.lightBlendMode}
              onChange={(event) => onChange("lightBlendMode", event.target.value as SceneSettings["lightBlendMode"])}
              className="cursor-pointer appearance-none bg-transparent text-right text-[13px] font-medium text-white outline-none"
            >
              <option value="normal" className="bg-[#11172d]">Normal</option>
              <option value="screen" className="bg-[#11172d]">Screen</option>
              <option value="overlay" className="bg-[#11172d]">Overlay</option>
              <option value="soft-light" className="bg-[#11172d]">Soft light</option>
              <option value="color-dodge" className="bg-[#11172d]">Color dodge</option>
            </select>
          </label>

          <button
            type="button"
            aria-pressed={settings.shadows}
            onClick={() => onChange("shadows", !settings.shadows)}
            className="relative flex h-[54px] shrink-0 items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.07] py-0 pl-8 pr-[18px] text-left text-[15px] font-medium text-white/80"
          >
            <span>Shadows</span>
            <span className="text-white">{settings.shadows ? "On" : "Off"}</span>
          </button>

          <p
            className="mb-0 ml-1 mr-0 mt-[14px] text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50"
          >
            Model placement
          </p>
          <GlassSlider label="X axis" value={settings.modelX} min={-2} max={2} step={0.1} format={(v) => v.toFixed(1)} onChange={(v) => onChange("modelX", v)} />
          <GlassSlider label="Y axis" value={settings.modelY} min={-2} max={2} step={0.1} format={(v) => v.toFixed(1)} onChange={(v) => onChange("modelY", v)} />
          <GlassSlider label="Z axis" value={settings.modelZ} min={-2} max={2} step={0.1} format={(v) => v.toFixed(1)} onChange={(v) => onChange("modelZ", v)} />
          <GlassSlider label="Forward tilt" value={settings.tiltX} min={-45} max={45} step={1} format={(v) => `${v}°`} onChange={(v) => onChange("tiltX", v)} />
          <GlassSlider label="Side tilt" value={settings.tiltZ} min={-45} max={45} step={1} format={(v) => `${v}°`} onChange={(v) => onChange("tiltZ", v)} />
        </div>
      </motion.div>
    </motion.aside>
  );
}
