/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        teal: {
          DEFAULT: '#224852',
          light: '#E8F0F2',
          dark: '#1A363D',
        },
        copper: {
          DEFAULT: '#B75F19',
          light: '#FDF0E2',
        },
        sage: {
          DEFAULT: '#76866F',
          light: '#EFF2EE',
        },
        plum: {
          DEFAULT: '#6D597A',
          light: '#F0ECF3',
        },
        rose: '#9D5858',
        portal: {
          green: '#4ADE80',
          purple: '#A78BFA',
          yellow: '#FBBF24',
          pink: '#F472B6',
        },
        dark: {
          bg: '#0B1120',
          card: '#111827',
          surface: '#1F2937',
          border: '#374151',
        },
        cyan: '#22D3EE',
      },
      fontFamily: {
        sans: ['Inter'],
        mono: ['JetBrains Mono'],
      },
    },
  },
  plugins: [],
};
