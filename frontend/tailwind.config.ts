import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1d2329",
        paper: "#f7f5ef",
        line: "#d9d6ca",
        mint: "#1d8a70",
        berry: "#8c315d",
        amber: "#ba7a16",
        steel: "#486278"
      },
      boxShadow: {
        panel: "0 12px 30px rgba(29, 35, 41, 0.08)",
        "panel-hover": "0 16px 40px rgba(29, 35, 41, 0.12)"
      },
      borderRadius: {
        lg: "0.625rem"
      },
      letterSpacing: {
        wider: "0.06em"
      }
    }
  },
  plugins: []
};

export default config;
