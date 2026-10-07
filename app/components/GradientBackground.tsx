"use client";

import { motion, useReducedMotion } from "framer-motion";

export default function GradientBackground() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[linear-gradient(to_top,#d5feff,#3c70a0,#3a416d,#210a12)]" aria-hidden="true">
      <motion.div
        className="absolute -inset-[12%] bg-[linear-gradient(to_top,#d5feff,#3c70a0,#3a416d,#210a12)] opacity-35 blur-[28px] [background-size:100%_125%]"
        animate={reduceMotion ? undefined : { y: ["-3%", "3%", "-3%"], scale: [1.02, 1.08, 1.02] }}
        transition={{ duration: 18, ease: "easeInOut", repeat: Infinity }}
      />
      <motion.div
        className="absolute -bottom-[30%] -left-[18%] h-[78%] w-[78%] rounded-full bg-[#d5feff]/25 blur-[120px]"
        animate={reduceMotion ? undefined : { x: ["-4%", "6%", "-4%"], y: ["5%", "-4%", "5%"], opacity: [0.26, 0.42, 0.26] }}
        transition={{ duration: 16, ease: "easeInOut", repeat: Infinity }}
      />
      <motion.div
        className="absolute -right-[22%] top-[4%] h-[70%] w-[70%] rounded-full bg-[#210a12]/30 blur-[130px]"
        animate={reduceMotion ? undefined : { x: ["4%", "-5%", "4%"], y: ["-3%", "5%", "-3%"], opacity: [0.22, 0.4, 0.22] }}
        transition={{ duration: 21, ease: "easeInOut", repeat: Infinity }}
      />
    </div>
  );
}
