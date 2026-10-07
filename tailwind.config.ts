import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      keyframes: {
        "gradient-drift": {
          "0%, 100%": { backgroundPosition: "0% 45%" },
          "50%": { backgroundPosition: "100% 55%" },
        },
        "glow-float": {
          "0%, 100%": { transform: "translate3d(-4%, -3%, 0) scale(1)" },
          "50%": { transform: "translate3d(5%, 4%, 0) scale(1.12)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.45", transform: "scale(0.96)" },
          "50%": { opacity: "0.78", transform: "scale(1.08)" },
        },
      },
      animation: {
        "gradient-drift": "gradient-drift 22s ease-in-out infinite",
        "glow-float": "glow-float 18s ease-in-out infinite",
        "glow-pulse": "glow-pulse 12s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
