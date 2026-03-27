'use client';

import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  glow?: boolean;
  className?: string;
  onClick?: () => void;
}

export function GlassCard({ children, glow = false, className = '', onClick }: GlassCardProps) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: -2, borderColor: 'rgba(255,255,255,0.14)' }}
      transition={{ duration: 0.25 }}
      className={`
        relative overflow-hidden rounded-[20px] p-7
        bg-[rgba(26,39,68,0.55)] backdrop-blur-[24px] backdrop-saturate-[160%]
        border border-white/[0.08]
        transition-shadow duration-300
        ${glow ? 'shadow-[0_0_40px_rgba(45,165,160,0.08)]' : ''}
        hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)]
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {/* Top rim light */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)',
        }}
      />
      {children}
    </motion.div>
  );
}
