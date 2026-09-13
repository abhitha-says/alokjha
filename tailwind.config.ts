import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1c2430",
        paper: "#faf7f2",
        cream: "#f5f1ea",
        line: "#e6e0d6",
        muted: "#6b7280",
        accent: "#2f4a5f",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Helvetica", "Arial", "sans-serif"],
        hand: ["var(--font-hand)", "cursive"],
      },
      maxWidth: {
        content: "1140px",
      },
      keyframes: {
        fadeUp: {
          "0%": { transform: "translateY(16px)" },
          "100%": { transform: "translateY(0)" },
        },
      },
      animation: {
        fadeUp: "fadeUp 0.7s ease forwards",
      },
    },
  },
  plugins: [],
};

export default config;
