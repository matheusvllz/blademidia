import type { Config } from "tailwindcss";

/**
 * Tokens do Design System da Blade Mídia (docs/business/contexto-negocio.md),
 * os mesmos já usados em site/ e automation/panel/ — nenhuma identidade nova.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0D0D0D",
        gold: {
          DEFAULT: "#C9A84C",
          light: "#E8C97A",
          dark: "#8A6E2A",
        },
        chalk: "#F5F2EC",
        steel: "#2B2B2B",
        wire: "#8C8C8C",
        alert: {
          red: "#C0392B",
          green: "#1A6B45",
        },
      },
      fontFamily: {
        display: ["var(--font-barlow-condensed)", "sans-serif"],
        body: ["var(--font-barlow)", "sans-serif"],
        mono: ["var(--font-space-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
