// Glassmorphism utility classes for use with Tailwind
export const glassClasses = {
  dark: 'backdrop-blur-xl bg-white/5 border border-white/10 shadow-xl',
  light: 'backdrop-blur-xl bg-white/70 border border-white/20 shadow-lg',
} as const;

// Usage: Apply these as className in components
// Dark mode (default glass): className="backdrop-blur-xl bg-white/5 border border-white/10 shadow-xl"
// Light mode (clinical glass): className="backdrop-blur-xl bg-white/70 border border-white/20 shadow-lg"
