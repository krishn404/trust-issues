"use client";

import { motion } from "framer-motion";

const SPOTIFY_EMBED_URL = "https://open.spotify.com/embed/track/1YxXxxIabPYXLd0usoSowW?utm_source=generator&theme=1";

const spring = { type: "spring", stiffness: 260, damping: 24, mass: 0.8 } as const;

const cardVariants = {
  rest: { opacity: 1, y: 0, scale: 1 },
  hover: { opacity: 1, y: -3, scale: 1.01 },
};

/** Spotify's standard track player handles protected full-track playback. */
export default function AudioPlayer() {
  return (
    <motion.section
      className="absolute inset-x-0 bottom-[calc(var(--frame,0px)+1.25rem)] z-[3] mx-auto w-[min(30rem,calc(100%-2rem))] select-none [will-change:transform] max-[600px]:bottom-[calc(var(--frame,0px)+0.9rem)]"
      aria-label="Spotify track player"
      variants={cardVariants}
      initial={{ opacity: 0, y: 32, scale: 0.94 }}
      animate="rest"
      whileHover="hover"
      transition={spring}
    >
      <iframe
        className="block h-[152px] w-full rounded-[12px] border-0 shadow-[0_18px_44px_rgba(8,6,28,0.32)]"
        src={SPOTIFY_EMBED_URL}
        title="Trust Issues by Extern on Spotify"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    </motion.section>
  );
}
