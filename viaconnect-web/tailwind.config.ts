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

        /* Navy foundation */
        navy: {
          900: "#0D1520",
          800: "#131D2E",
          700: "#1A2744",
          600: "#243352",
          500: "#2E4060",
        },

        /* Teal accent system */
        teal: {
          DEFAULT: "#2DA5A0",
          100: "#E0F5F4",
          300: "#5ED4CF",
          400: "#3BBFB9",
          500: "#2DA5A0",
          600: "#1F8A85",
          light: "#E0F5F4",
          dark: "#1F8A85",
        },

        /* Orange / Copper accent system */
        copper: {
          DEFAULT: "#B75E18",
          100: "#FDF0E4",
          300: "#E8944A",
          400: "#D4721F",
          500: "#B75E18",
          600: "#994E14",
          light: "#FDF0E2",
        },
        orange: {
          100: "#FDF0E4",
          300: "#E8944A",
          400: "#D4721F",
          500: "#B75E18",
          600: "#994E14",
        },

        /* Brand accents (preserved) */
        sage: { DEFAULT: "#76866F", light: "#EFF2EE" },
        plum: { DEFAULT: "#6D597A", light: "#F0ECF3" },
        rose: { DEFAULT: "#9D5858" },

        /* Portal colors */
        portal: {
          green: "#4ADE80",
          blue: "#4A90D9",
          sage: "#7BAE7F",
          purple: "#A78BFA",
          yellow: "#FBBF24",
          pink: "#F472B6",
          gold: "#C4944A",
        },

        /* Dark surfaces */
        dark: {
          bg: "#0D1520",
          card: "#131D2E",
          surface: "#1A2744",
          elevated: "#243352",
          border: "#2E4060",
        },

        /* Status */
        status: {
          green: "#27AE60",
          red: "#E74C3C",
          amber: "#F39C12",
        },

        /* Legacy compat */
        cyan: "#22D3EE",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "SF Mono", "monospace"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
      boxShadow: {
        card: "0 8px 32px rgba(0, 0, 0, 0.3)",
        "card-hover": "0 12px 40px rgba(0, 0, 0, 0.4)",
        glow: "0 0 20px rgba(45, 165, 160, 0.3)",
        "glow-lg": "0 0 40px rgba(45, 165, 160, 0.2), 0 0 80px rgba(45, 165, 160, 0.1)",
        "glow-orange": "0 0 20px rgba(183, 94, 24, 0.3)",
      },
      backgroundImage: {
        "gradient-hero": "linear-gradient(180deg, #0D1520 0%, #1A2744 50%, #131D2E 100%)",
        "gradient-card": "linear-gradient(135deg, rgba(45, 165, 160, 0.15) 0%, rgba(183, 94, 24, 0.10) 100%)",
        "gradient-teal": "linear-gradient(135deg, #2DA5A0, #1F8A85)",
        "gradient-orange": "linear-gradient(135deg, #B75E18, #994E14)",
      },
      height: {
        dvh: "100dvh",
        svh: "100svh",
        lvh: "100lvh",
      },
      minHeight: {
        dvh: "100dvh",
        svh: "100svh",
      },
      backdropBlur: {
        xs: "2px",
      },
      borderOpacity: {
        8: "0.08",
      },
    },
  },
  plugins: [
    plugin(function ({ addUtilities }) {
      addUtilities({
        /* Legacy glass (preserved for existing pages) */
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
