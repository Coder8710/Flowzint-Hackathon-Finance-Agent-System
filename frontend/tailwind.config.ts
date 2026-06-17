import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Map design tokens to CSS variables for fluid dark/light toggling
        ink: "var(--color-ink)",
        paper: "var(--color-paper)",
        line: "var(--color-line)",
        mint: "var(--color-mint)",
        berry: "var(--color-berry)",
        amber: "var(--color-amber)",
        steel: "var(--color-steel)",
        terminalBg: "var(--color-terminal-bg)"
      },
      boxShadow: {
        panel: "0 8px 32px 0 rgba(0, 0, 0, 0.08)",
        "panel-dark": "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        "mint-glow": "0 0 15px rgba(8, 153, 129, 0.15)",
        "berry-glow": "0 0 15px rgba(242, 54, 69, 0.15)"
      },
      borderRadius: {
        lg: "0.75rem"
      },
      letterSpacing: {
        wider: "0.06em"
      }
    }
  },
  plugins: []
};

export default config;
