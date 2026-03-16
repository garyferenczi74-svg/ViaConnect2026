// Glassmorphism utility classes for use with Tailwind
export const glassClasses = {
  dark: 'backdrop-blur-xl bg-white/5 border border-white/10 shadow-xl',
  light: 'backdrop-blur-xl bg-white/70 border border-white/20 shadow-lg',
  card: 'bg-[rgba(255,255,255,0.03)] backdrop-blur-[12px] border border-white/10',
} as const;
