"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import styles from "./AudioPlayer.module.css";

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
      className={styles.root}
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
        className={styles.cover}
        src={cover}
        alt={`${title} cover art`}
        draggable={false}
        variants={coverVariants}
        transition={spring}
      />

      <div className={styles.info}>
        <p className={styles.title}>{title}</p>
        <p className={styles.artist}>
          <a href={artistUrl} target="_blank" rel="noopener noreferrer" className={styles.artistLink}>
            {artist}
          </a>
        </p>

        <div className={styles.progress}>
          <span className={styles.time}>{formatTime(current)}</span>
          <div
            ref={trackRef}
            className={styles.track}
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
            <div className={styles.rail}>
              <div
                className={styles.fill}
                style={{ width: `${progress}%`, transition: dragging ? "none" : "width 260ms linear" }}
              />
            </div>
          </div>
          <span className={styles.time}>-{formatTime(duration - current)}</span>
        </div>

        <div className={styles.controls}>
          <motion.button
            type="button"
            className={`${styles.btn} ${styles.skip}`}
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
            className={`${styles.btn} ${styles.play}`}
            aria-label={playing ? "Pause" : "Play"}
            onClick={toggle}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.86 }}
            transition={snappy}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={playing ? "pause" : "play"}
                className={styles.icon}
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
            className={`${styles.btn} ${styles.skip}`}
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