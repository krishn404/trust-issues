"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

type AudioPlayerProps = {
  title?: string;
  artist?: string;
  artistUrl?: string;
  src?: string;
  cover?: string;
};

const SKIP_SECONDS = 10;
const spring = { type: "spring", stiffness: 260, damping: 24, mass: 0.8 } as const;
const snappy = { type: "spring", stiffness: 520, damping: 30 } as const;

const cardVariants = {
  rest: {
    opacity: 1,
    y: 0,
    scale: 1,
    boxShadow: "0 18px 44px rgba(8, 6, 28, 0.32), inset 0 1px rgba(255,255,255,0.3)",
  },
  hover: {
    opacity: 1,
    y: -5,
    scale: 1.035,
    boxShadow: "0 28px 64px rgba(8, 6, 28, 0.42), inset 0 1px rgba(255,255,255,0.4)",
  },
};

const coverVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.06 },
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export default function AudioPlayer({
  title = "Trust Issues",
  artist = "extern",
  artistUrl = "https://www.instagram.com/extern.music/",
  src = "/audio.mpeg",
  cover = "/cover.png",
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [dragging, setDragging] = useState(false);

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  };

  const seekTo = (time: number) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const next = Math.min(duration, Math.max(0, time));
    audio.currentTime = next;
    setCurrent(next);
  };

  const seekFromX = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    seekTo(Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * duration);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    seekFromX(e.clientX);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging) seekFromX(e.clientX);
  };
  const onPointerUp = () => setDragging(false);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      seekTo(current + 5);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      seekTo(current - 5);
    }
  };

  return (
    <motion.section
      className="absolute inset-x-0 bottom-[calc(var(--frame,0px)+1.25rem)] z-[3] mx-auto flex w-[min(23rem,calc(100%-2rem))] select-none items-center gap-[0.85rem] rounded-[1.6rem] border border-white/30 bg-[linear-gradient(145deg,rgba(48,62,118,0.46),rgba(22,28,66,0.55))] py-[0.7rem] pl-[0.7rem] pr-4 text-white [backdrop-filter:blur(26px)_saturate(160%)] [-webkit-backdrop-filter:blur(26px)_saturate(160%)] [will-change:transform] max-[600px]:bottom-[calc(var(--frame,0px)+0.9rem)]"
      aria-label="Audio player"
      variants={cardVariants}
      initial={{ opacity: 0, y: 32, scale: 0.94 }}
      animate="rest"
      whileHover="hover"
      transition={spring}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => {
          if (!dragging) setCurrent(e.currentTarget.currentTime);
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
        }}
      />

      <motion.img
        className="h-20 w-20 shrink-0 rounded-[15px] border-2 border-[#d5feff] bg-[#111] object-cover shadow-[0_0.4rem_1.1rem_rgba(0,0,0,0.35)]"
        src={cover}
        alt={`${title} cover art`}
        draggable={false}
        variants={coverVariants}
        transition={spring}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <p className="overflow-hidden whitespace-nowrap text-ellipsis text-[0.98rem] font-semibold leading-[1.2] tracking-[-0.015em]">{title}</p>
        <p className="overflow-hidden whitespace-nowrap text-ellipsis text-[0.82rem] font-medium leading-[1.25] text-white/60">
          <a href={artistUrl} target="_blank" rel="noopener noreferrer" className="text-inherit transition-colors duration-200 hover:text-white hover:underline hover:underline-offset-[3px]">
            {artist}
          </a>
        </p>

        <div className="mt-[0.4rem] flex items-center gap-[0.45rem]">
          <span className="min-w-[1.9rem] text-[0.64rem] tabular-nums text-white/60">{formatTime(current)}</span>
          <div
            ref={trackRef}
            className="group relative flex h-4 flex-1 cursor-pointer touch-none items-center outline-none"
            data-dragging={dragging}
            role="slider"
            tabIndex={0}
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={Math.floor(duration)}
            aria-valuenow={Math.floor(current)}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onKeyDown={onKeyDown}
          >
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/30 transition-[height] duration-[320ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] group-hover:h-[0.42rem] group-data-[dragging=true]:h-[0.42rem] group-focus-visible:h-[0.42rem]">
              <div
                className="h-full rounded-full bg-white"
                style={{ width: `${progress}%`, transition: dragging ? "none" : "width 260ms linear" }}
              />
            </div>
          </div>
          <span className="min-w-[1.9rem] text-right text-[0.64rem] tabular-nums text-white/60">-{formatTime(duration - current)}</span>
        </div>

        <div className="mt-[0.1rem] flex items-center justify-around px-[0.7rem]">
          <motion.button
            type="button"
            className="grid h-[1.4rem] w-[1.9rem] place-items-center border-0 bg-transparent p-[0.2rem] text-white outline-none focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
            aria-label={`Back ${SKIP_SECONDS} seconds`}
            onClick={() => seekTo(current - SKIP_SECONDS)}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.86 }}
            transition={snappy}
          >
            <svg viewBox="0 0 40 28" width="100%" height="100%" fill="currentColor" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" aria-hidden="true">
              <polygon points="19,5 19,23 4,14" />
              <polygon points="37,5 37,23 22,14" />
            </svg>
          </motion.button>

          <motion.button
            type="button"
            className="grid h-[1.6rem] w-6 place-items-center border-0 bg-transparent p-[0.2rem] text-white outline-none focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
            aria-label={playing ? "Pause" : "Play"}
            onClick={toggle}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.86 }}
            transition={snappy}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={playing ? "pause" : "play"}
                className="grid h-full w-full place-items-center"
                initial={{ opacity: 0, scale: 0.55 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.55 }}
                transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              >
                {playing ? (
                  <svg viewBox="0 0 28 30" width="100%" height="100%" fill="currentColor" aria-hidden="true">
                    <rect x="2" y="1" width="8" height="28" rx="2.5" />
                    <rect x="18" y="1" width="8" height="28" rx="2.5" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 28 30" width="100%" height="100%" fill="currentColor" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" aria-hidden="true">
                    <polygon points="5,3 5,27 25,15" />
                  </svg>
                )}
              </motion.span>
            </AnimatePresence>
          </motion.button>

          <motion.button
            type="button"
            className="grid h-[1.4rem] w-[1.9rem] place-items-center border-0 bg-transparent p-[0.2rem] text-white outline-none focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
            aria-label={`Forward ${SKIP_SECONDS} seconds`}
            onClick={() => seekTo(current + SKIP_SECONDS)}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.86 }}
            transition={snappy}
          >
            <svg viewBox="0 0 40 28" width="100%" height="100%" fill="currentColor" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" aria-hidden="true">
              <polygon points="3,5 3,23 18,14" />
              <polygon points="21,5 21,23 36,14" />
            </svg>
          </motion.button>
        </div>
      </div>
    </motion.section>
  );
}
