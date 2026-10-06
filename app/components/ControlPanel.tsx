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
      aria-hidden
      initial={false}
      animate={{ scale: open ? 1 : 0.4 }}
      transition={spring}
      style={{
        position: "absolute",
        right: 0,
        [edge]: -R,
        width: R,
        height: R,
        pointerEvents: "none",
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
      style={{
        position: "relative",
        height: 54,
        flexShrink: 0,
        borderRadius: 16,
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.06)",
        overflow: "hidden",
        cursor: dragging ? "grabbing" : "grab",
        touchAction: "none",
        userSelect: "none",
        outline: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: `${pct}%`,
          borderRadius: 16,
          background: "rgba(255,255,255,0.2)",
          pointerEvents: "none",
        }}
      />
      <span
        style={{
          position: "absolute",
          top: "50%",
          left: `max(18px, calc(${pct}% - 18px))`,
          width: 2,
          height: 22,
          borderRadius: 2,
          transform: "translateY(-50%)",
          background: "rgba(255,255,255,0.85)",
          pointerEvents: "none",
        }}
      />
      <span
        style={{
          position: "absolute",
          top: "50%",
          left: 32,
          transform: "translateY(-50%)",
          fontSize: 15,
          fontWeight: 500,
          color: "rgba(255,255,255,0.8)",
          pointerEvents: "none",
        }}
      >
        {label}
      </span>
      <span
        style={{
          position: "absolute",
          top: "50%",
          right: 18,
          transform: "translateY(-50%)",
          fontSize: 15,
          fontWeight: 500,
          color: "#fff",
          fontVariantNumeric: "tabular-nums",
          pointerEvents: "none",
        }}
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
      className={`control-panel${isPanelOpen ? " is-open" : ""}`}
      aria-label="Scene controls"
      initial={false}
      animate={{ width: target.width, height: target.height }}
      transition={spring}
      onMouseEnter={openPanel}
      onMouseLeave={closePanel}
      style={{
        position: "fixed",
        top: 0,
        bottom: 0,
        right: "var(--frame, 0px)",
        left: "auto",
        margin: "auto 0",
        transform: "none",
        display: "block",
        opacity: 1,
        visibility: "visible",
        padding: 0,
        border: 0,
        background: "transparent",
        boxShadow: "none",
        backdropFilter: "none",
        zIndex: 9999,
      }}
    >
      <Flare edge="top" open={isPanelOpen} />
      <Flare edge="bottom" open={isPanelOpen} />
      <motion.div
        initial={false}
        animate={{ borderRadius: target.radius }}
        transition={spring}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          background: "#000",
          overflow: "hidden",
          boxShadow: isPanelOpen
            ? "0 24px 80px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.1)"
            : "0 0 18px rgba(255,255,255,0.18), inset 0 0 0 1px rgba(255,255,255,0.22)",
        }}
      >
        <button
          type="button"
          aria-label={isPanelOpen ? "Close scene controls" : "Open scene controls"}
          aria-expanded={isPanelOpen}
          onClick={() => setIsPanelOpen((open) => !open)}
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            background: "transparent",
            border: 0,
            padding: 0,
            cursor: "pointer",
            opacity: isPanelOpen ? 0 : 1,
            pointerEvents: isPanelOpen ? "none" : "auto",
            transition: "opacity 0.15s ease",
          }}
        >
          <span style={{ width: 4, height: 34, borderRadius: 999, background: "rgba(255,255,255,0.7)" }} />
        </button>

        <div
          className={`panel-content${isPanelOpen ? "" : " is-hidden"}`}
          inert={!isPanelOpen}
          style={{
            width: OPEN.width,
            minWidth: OPEN.width,
            height: "100%",
            boxSizing: "border-box",
            padding: "28px 24px 28px 28px",
            overflowY: "auto",
            scrollbarWidth: "none",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            opacity: isPanelOpen ? 1 : 0,
            filter: isPanelOpen ? "blur(0px)" : "blur(6px)",
            transition: isPanelOpen
              ? "opacity 0.28s ease 0.12s, filter 0.28s ease 0.12s"
              : "opacity 0.12s ease, filter 0.12s ease",
          }}
        >
          <div style={{ marginBottom: 6 }}>
            <p className="panel-eyebrow" style={{ margin: "0 0 6px" }}>Scene controls</p>
            <h1 style={{ margin: 0 }}>Fine tune</h1>
          </div>

          <GlassSlider label="Motion speed" value={settings.motionSpeed} min={0} max={2} step={0.05} format={(v) => `${v.toFixed(2)}×`} onChange={(v) => onChange("motionSpeed", v)} />
          <GlassSlider label="Starting angle" value={settings.rotationAngle} min={0} max={360} step={1} format={(v) => `${v}°`} onChange={(v) => onChange("rotationAngle", v)} />
          <GlassSlider label="Key light" value={settings.keyLight} min={0} max={6} step={0.1} format={(v) => v.toFixed(1)} onChange={(v) => onChange("keyLight", v)} />
          <GlassSlider label="Fill light" value={settings.fillLight} min={0} max={4} step={0.1} format={(v) => v.toFixed(1)} onChange={(v) => onChange("fillLight", v)} />
          <GlassSlider label="Environment" value={settings.environmentLight} min={0} max={2} step={0.05} format={(v) => v.toFixed(2)} onChange={(v) => onChange("environmentLight", v)} />

          <button
            type="button"
            aria-pressed={settings.shadows}
            onClick={() => onChange("shadows", !settings.shadows)}
            style={{
              position: "relative",
              height: 54,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 18px 0 32px",
              borderRadius: 16,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.8)",
              fontSize: 15,
              fontWeight: 500,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <span>Shadows</span>
            <span style={{ color: "#fff" }}>{settings.shadows ? "On" : "Off"}</span>
          </button>

          <p
            style={{
              margin: "14px 0 2px 4px",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            Model placement
          </p>
          <GlassSlider label="X axis" value={settings.modelX} min={-2} max={2} step={0.1} format={(v) => v.toFixed(1)} onChange={(v) => onChange("modelX", v)} />
          <GlassSlider label="Y axis" value={settings.modelY} min={-2} max={2} step={0.1} format={(v) => v.toFixed(1)} onChange={(v) => onChange("modelY", v)} />
          <GlassSlider label="Z axis" value={settings.modelZ} min={-2} max={2} step={0.1} format={(v) => v.toFixed(1)} onChange={(v) => onChange("modelZ", v)} />
        </div>
      </motion.div>
    </motion.aside>
  );
}