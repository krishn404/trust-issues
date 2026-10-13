"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { isFirstPlayThisSession, track } from "../../lib/track";

type AudioPlayerProps = {
  title?: string;
  artist?: string;
  artistUrl?: string;
  src?: string;
  cover?: string;
};

type SpotifyController = {
  addListener: (event: "ready" | "playback_update", callback: (event: { data: SpotifyPlayback }) => void) => void;
  destroy: () => void;
  pause: () => void;
  resume: () => void;
  seek: (seconds: number) => void;
};

type SpotifyPlayback = {
  duration: number;
  isPaused: boolean;
  position: number;
};

type TrackMetadata = {
  title: string;
  duration: number;
  coverArt?: string;
  artists: Array<{ name: string; url: string }>;
};

type SpotifyIframeApi = {
  createController: (
    element: HTMLElement,
    options: { uri: string; width: number; height: number },
    callback: (controller: SpotifyController) => void,
  ) => void;
};

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: SpotifyIframeApi) => void;
  }
}

const SPOTIFY_ALBUM_URI = "spotify:album:4wUny4EohC9pntzKRrmY7f";
const SKIP_SECONDS = 10;
const spring = { type: "spring", stiffness: 260, damping: 24, mass: 0.8 } as const;
const snappy = { type: "spring", stiffness: 520, damping: 30 } as const;

const cardVariants = {
  rest: { opacity: 1, y: 0, scale: 1, boxShadow: "0 18px 44px rgba(8, 6, 28, 0.32), inset 0 1px rgba(255,255,255,0.3)" },
  hover: { opacity: 1, y: -5, scale: 1.035, boxShadow: "0 28px 64px rgba(8, 6, 28, 0.42), inset 0 1px rgba(255,255,255,0.4)" },
};

const coverVariants = { rest: { scale: 1 }, hover: { scale: 1.06 } };

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
  const spotifyHostRef = useRef<HTMLDivElement>(null);
  const spotifyControllerRef = useRef<SpotifyController | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [spotifyReady, setSpotifyReady] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [metadata, setMetadata] = useState<TrackMetadata | null>(null);
  const draggingRef = useRef(false);
  const fallbackRef = useRef(false);

  useEffect(() => {
    const host = spotifyHostRef.current;
    if (!host) return;

    let disposed = false;
    const initialise = (api: SpotifyIframeApi) => {
      if (disposed || !host) return;
      api.createController(host, { uri: SPOTIFY_ALBUM_URI, width: 1, height: 1 }, (controller) => {
        if (disposed) {
          controller.destroy();
          return;
        }
        spotifyControllerRef.current = controller;
        controller.addListener("ready", () => setSpotifyReady(true));
        controller.addListener("playback_update", ({ data }) => {
          if (disposed || fallbackRef.current) return;
          setPlaying(!data.isPaused);
          if (!draggingRef.current) setCurrent(data.position / 1000);
          if (Number.isFinite(data.duration) && data.duration > 0) setDuration(data.duration / 1000);
        });
      });
    };

    const previousReady = window.onSpotifyIframeApiReady;
    window.onSpotifyIframeApiReady = (api) => {
      previousReady?.(api);
      initialise(api);
    };
    const script = document.createElement("script");
    script.src = "https://open.spotify.com/embed/iframe-api/v1";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      disposed = true;
      spotifyControllerRef.current?.destroy();
      spotifyControllerRef.current = null;
      window.onSpotifyIframeApiReady = previousReady;
      script.remove();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/spotify-track", { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: TrackMetadata) => {
        setMetadata(data);
        setDuration(data.duration);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (spotifyReady) return;
    const timeout = window.setTimeout(() => {
      fallbackRef.current = true;
      setUseFallback(true);
    }, 8_000);
    return () => window.clearTimeout(timeout);
  }, [spotifyReady]);

  const listenProgress = () => (duration > 0 ? current / duration : 0);
  const progress = duration > 0 ? (current / duration) * 100 : 0;

  const toggle = () => {
    if (useFallback) {
      const audio = audioRef.current;
      if (!audio) return;
      if (audio.paused) void audio.play(); else audio.pause();
      return;
    }
    const controller = spotifyControllerRef.current;
    if (!controller) return;
    if (playing) {
      controller.pause();
      track({ type: "pause", trackId: title, progress: listenProgress() });
    } else {
      controller.resume();
      if (isFirstPlayThisSession()) track({ type: "play", trackId: title, progress: listenProgress() });
    }
  };

  const seekTo = (time: number) => {
    const next = Math.min(duration, Math.max(0, time));
    setCurrent(next);
    if (useFallback) {
      if (audioRef.current) audioRef.current.currentTime = next;
    } else {
      spotifyControllerRef.current?.seek(next);
    }
  };
  const seekFromX = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (rect) seekTo(Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * duration);
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingRef.current = true;
    setDragging(true);
    seekFromX(event.clientX);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => { if (draggingRef.current) seekFromX(event.clientX); };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") { event.preventDefault(); seekTo(current + 5); }
    if (event.key === "ArrowLeft") { event.preventDefault(); seekTo(current - 5); }
  };

  return (
    <motion.section
      className="absolute inset-x-0 bottom-[calc(var(--frame,0px)+1.25rem)] z-[3] mx-auto flex w-[min(23rem,calc(100%-2rem))] select-none items-center gap-[0.85rem] rounded-[1.6rem] border border-white/30 bg-[linear-gradient(145deg,rgba(48,62,118,0.46),rgba(22,28,66,0.55))] py-[0.7rem] pl-[0.7rem] pr-4 text-white [backdrop-filter:blur(26px)_saturate(160%)] [-webkit-backdrop-filter:blur(26px)_saturate(160%)] [will-change:transform] max-[600px]:bottom-[calc(var(--frame,0px)+0.9rem)]"
      aria-label="Audio player" variants={cardVariants} initial={{ opacity: 0, y: 32, scale: 0.94 }} animate="rest" whileHover="hover" transition={spring}
    >
      {/* Spotify's API creates its playback frame here; no Spotify UI or artwork is displayed. */}
      <div ref={spotifyHostRef} className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0" aria-hidden="true" />
      <audio
        ref={audioRef} src={src} preload="metadata" className="hidden"
        onLoadedMetadata={(event) => useFallback && setDuration(event.currentTarget.duration)}
        onTimeUpdate={(event) => { if (useFallback && !dragging) setCurrent(event.currentTarget.currentTime); }}
        onPlay={() => useFallback && setPlaying(true)} onPause={() => useFallback && setPlaying(false)}
        onEnded={() => { if (useFallback) { setPlaying(false); setCurrent(0); } }}
      />

      <motion.img className="h-20 w-20 shrink-0 rounded-[15px] border-2 border-[#d5feff] bg-[#111] object-cover shadow-[0_0.4rem_1.1rem_rgba(0,0,0,0.35)]" src={metadata?.coverArt ?? cover} alt={`${metadata?.title ?? title} cover art`} draggable={false} variants={coverVariants} transition={spring} />

      <div className="flex min-w-0 flex-1 flex-col">
        <a href="https://open.spotify.com/album/4wUny4EohC9pntzKRrmY7f?si=U5KppSjGTnWhZWjdpnb44A" target="_blank" rel="noopener noreferrer" className="overflow-hidden whitespace-nowrap text-ellipsis text-[0.98rem] font-semibold leading-[1.2] tracking-[-0.015em] transition-colors hover:text-[#d5feff] hover:underline hover:underline-offset-[3px]">{metadata?.title ?? title}</a>
        <p className="overflow-hidden whitespace-nowrap text-ellipsis text-[0.82rem] font-medium leading-[1.25] text-white/60">
          {metadata?.artists.map((spotifyArtist, index) => <span key={spotifyArtist.url}>{index > 0 && ", "}<a href={spotifyArtist.url} target="_blank" rel="noopener noreferrer" className="text-inherit transition-colors duration-200 hover:text-white hover:underline hover:underline-offset-[3px]">{spotifyArtist.name}</a></span>) ?? <a href={artistUrl} target="_blank" rel="noopener noreferrer" className="text-inherit transition-colors duration-200 hover:text-white hover:underline hover:underline-offset-[3px]">{artist}</a>}
        </p>
        <div className="mt-[0.4rem] flex items-center gap-[0.45rem]">
          <span className="min-w-[1.9rem] text-[0.64rem] tabular-nums text-white/60">{formatTime(current)}</span>
          <div ref={trackRef} className="group relative flex h-4 flex-1 cursor-pointer touch-none items-center outline-none" data-dragging={dragging} role="slider" tabIndex={0} aria-label="Seek" aria-valuemin={0} aria-valuemax={Math.floor(duration)} aria-valuenow={Math.floor(current)} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={() => { draggingRef.current = false; setDragging(false); }} onPointerCancel={() => { draggingRef.current = false; setDragging(false); }} onKeyDown={onKeyDown}>
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/30 transition-[height] duration-[320ms] group-hover:h-[0.42rem] group-data-[dragging=true]:h-[0.42rem] group-focus-visible:h-[0.42rem]"><div className="h-full rounded-full bg-white" style={{ width: `${progress}%`, transition: dragging ? "none" : "width 260ms linear" }} /></div>
          </div>
          <span className="min-w-[1.9rem] text-right text-[0.64rem] tabular-nums text-white/60">-{formatTime(duration - current)}</span>
        </div>
        <div className="mt-[0.1rem] flex items-center justify-around px-[0.7rem]">
          <motion.button type="button" className="grid h-[1.4rem] w-[1.9rem] place-items-center border-0 bg-transparent p-[0.2rem] text-white outline-none focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70" aria-label={`Back ${SKIP_SECONDS} seconds`} onClick={() => { seekTo(current - SKIP_SECONDS); track({ type: "prev", trackId: title, progress: listenProgress() }); }} whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.86 }} transition={snappy}><svg viewBox="0 0 40 28" width="100%" height="100%" fill="currentColor" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" aria-hidden="true"><polygon points="19,5 19,23 4,14" /><polygon points="37,5 37,23 22,14" /></svg></motion.button>
          <motion.button type="button" className="grid h-[1.6rem] w-6 place-items-center border-0 bg-transparent p-[0.2rem] text-white outline-none focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 disabled:opacity-50" aria-label={playing ? "Pause" : "Play"} onClick={toggle} disabled={!useFallback && !spotifyReady} whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.86 }} transition={snappy}><AnimatePresence mode="wait" initial={false}><motion.span key={playing ? "pause" : "play"} className="grid h-full w-full place-items-center" initial={{ opacity: 0, scale: 0.55 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.55 }} transition={{ duration: 0.16 }}>{playing ? <svg viewBox="0 0 28 30" width="100%" height="100%" fill="currentColor" aria-hidden="true"><rect x="2" y="1" width="8" height="28" rx="2.5" /><rect x="18" y="1" width="8" height="28" rx="2.5" /></svg> : <svg viewBox="0 0 28 30" width="100%" height="100%" fill="currentColor" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" aria-hidden="true"><polygon points="5,3 5,27 25,15" /></svg>}</motion.span></AnimatePresence></motion.button>
          <motion.button type="button" className="grid h-[1.4rem] w-[1.9rem] place-items-center border-0 bg-transparent p-[0.2rem] text-white outline-none focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70" aria-label={`Forward ${SKIP_SECONDS} seconds`} onClick={() => { seekTo(current + SKIP_SECONDS); track({ type: "next", trackId: title, progress: listenProgress() }); }} whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.86 }} transition={snappy}><svg viewBox="0 0 40 28" width="100%" height="100%" fill="currentColor" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" aria-hidden="true"><polygon points="3,5 3,23 18,14" /><polygon points="21,5 21,23 36,14" /></svg></motion.button>
        </div>
      </div>
    </motion.section>
  );
}
