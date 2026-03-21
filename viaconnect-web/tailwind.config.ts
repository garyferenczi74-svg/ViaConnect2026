import type { Config } from "tailwindcss";

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
        // ViaConnect Brand Tokens
        "deep-teal": "#224852",
        "burnt-copper": "#B75F19",
        sage: "#76866F",
        plum: "#6D597A",
        rose: "#9D5858",
        "practitioner-green": "#4ADE80",
        "dark-bg": "#111827",
        brand: {
          50: "#f0f7f8",
          100: "#d0e4e8",
          200: "#a1c9d1",
          300: "#72aeba",
          400: "#4a8a96",
          500: "#224852",
          600: "#1e3f48",
          700: "#1a363e",
          800: "#162d34",
          900: "#0f2028",
        },
        copper: {
          50: "#fdf5ef",
          100: "#fae6d0",
          200: "#f5cda1",
          300: "#efb472",
          400: "#d88a3c",
          500: "#B75F19",
          600: "#a45416",
          700: "#8a4713",
          800: "#703a10",
          900: "#5c300d",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
    },
  },
  plugins: [],
};
export default config;
