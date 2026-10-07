"use client";

import { motion, useReducedMotion } from "framer-motion";

export default function GradientBackground() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[linear-gradient(to_top,#d5feff,#3c70a0,#3a416d,#210a12)]" aria-hidden="true">
      <motion.div
        className="absolute -inset-[5%] bg-[linear-gradient(to_top,#d5feff,#3c70a0,#3a416d,#210a12)] opacity-25 blur-[24px] [background-size:110%_110%]"
        animate={reduceMotion ? undefined : { backgroundPosition: ["48% 48%", "52% 52%", "48% 48%"], scale: [1, 1.035, 1] }}
        transition={{ duration: 20, ease: "easeInOut", repeat: Infinity }}
      />
      <motion.div
        className="absolute -bottom-[26%] -left-[12%] h-[56%] w-[84%] rounded-full bg-[#d5feff]/20 blur-[110px]"
        animate={reduceMotion ? undefined : { x: ["-3%", "4%", "-3%"], y: ["2%", "-3%", "2%"], opacity: [0.16, 0.26, 0.16] }}
        transition={{ duration: 18, ease: "easeInOut", repeat: Infinity }}
      />
      <motion.div
        className="absolute -right-[15%] top-[20%] h-[46%] w-[68%] rounded-full bg-[#3a416d]/15 blur-[120px]"
        animate={reduceMotion ? undefined : { x: ["3%", "-4%", "3%"], y: ["-2%", "3%", "-2%"], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 22, ease: "easeInOut", repeat: Infinity }}
      />
    </div>
  );
}
