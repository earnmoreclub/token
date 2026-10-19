import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // METTO & MIDALO brand palette.
      colors: {
        navy: { DEFAULT: "#0C1727", card: "#111F36", border: "#1E3352" },
        brand: { blue: "#0071ED", cyan: "#00BBE4", mint: "#00C09A", orange: "#C43A0D" },
        ink: { title: "#FFFFFF", body: "#CBD5E1", muted: "#94A3B8" },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Inter", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
