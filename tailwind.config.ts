import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "Impact", "sans-serif"],
      },
      colors: {
        arena: {
          bg: "#0a0612",
          p1: "#22d3ee",
          p2: "#f43f5e",
          gold: "#facc15",
        },
      },
      keyframes: {
        "pulse-fast": {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        "combo-pop": {
          "0%": { transform: "scale(0.4) rotate(-8deg)", opacity: "0" },
          "60%": { transform: "scale(1.15) rotate(2deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
        },
        "slide-up": {
          from: { transform: "translateY(24px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        flash: {
          from: { opacity: "0.85" },
          to: { opacity: "0" },
        },
      },
      animation: {
        "pulse-fast": "pulse-fast 0.6s ease-in-out infinite",
        "combo-pop": "combo-pop 0.25s cubic-bezier(0.34,1.56,0.64,1) both",
        "slide-up": "slide-up 0.4s ease-out both",
        flash: "flash 0.3s ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
