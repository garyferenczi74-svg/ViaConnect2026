import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        teal: { DEFAULT: "#224852", light: "#E8F0F2", dark: "#1A363D" },
        copper: { DEFAULT: "#B75F19", light: "#FDF0E2" },
        sage: { DEFAULT: "#76866F", light: "#EFF2EE" },
        plum: { DEFAULT: "#6D597A", light: "#F0ECF3" },
        rose: { DEFAULT: "#9D5858" },
        portal: {
          green: "#4ADE80",
          purple: "#A78BFA",
          yellow: "#FBBF24",
          pink: "#F472B6",
        },
        dark: {
          bg: "#0B1120",
          card: "#111827",
          surface: "#1F2937",
          border: "#374151",
        },
        cyan: "#22D3EE",
      },
      fontFamily: {
        sans: ["Sora", "system-ui", "sans-serif"],
        mono: ["Space Mono", "JetBrains Mono", "monospace"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
    },
  },
  plugins: [
    plugin(function ({ addUtilities }) {
      addUtilities({
        ".glass": {
          background: "rgba(255,255,255,0.04)",
          "backdrop-filter": "blur(20px)",
          "-webkit-backdrop-filter": "blur(20px)",
          border: "1px solid rgba(255,255,255,0.08)",
        },
        ".glass-hover": {
          "&:hover": {
            "border-color": "rgba(255,255,255,0.15)",
            transform: "translateY(-2px)",
          },
        },
      });
    }),
  ],
};
export default config;
