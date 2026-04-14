'use client';

// Canonical compact pill (Prompt #74). Content-width, never stretched.
// px-4 py-1.5 / text-sm / border (1px) / rounded-full.

import { useState } from 'react';
import { motion } from 'framer-motion';

export interface PortalTabPillProps {
  label: string;
  isActive: boolean;
  onClick?: () => void;
  href?: string;
  /** Active accent hex, e.g. '#2DA5A0' */
  activeColor: string;
  /** Active background, e.g. 'rgba(45,165,160,0.18)' */
  activeAlpha18: string;
  /** Active border, e.g. 'rgba(45,165,160,0.40)' */
  activeAlpha40: string;
}

const INACTIVE_BG = 'rgba(255,255,255,0.06)';
const INACTIVE_TEXT = 'rgba(255,255,255,0.60)';
const INACTIVE_BORDER = 'rgba(255,255,255,0.10)';
const HOVER_BG = 'rgba(255,255,255,0.10)';
const HOVER_TEXT = 'rgba(255,255,255,0.85)';
const HOVER_BORDER = 'rgba(255,255,255,0.18)';

export function PortalTabPill({
  label,
  isActive,
  onClick,
  href,
  activeColor,
  activeAlpha18,
  activeAlpha40,
}: PortalTabPillProps) {
  const [hovered, setHovered] = useState(false);

  const style: React.CSSProperties = isActive
    ? { backgroundColor: activeAlpha18, color: activeColor, borderColor: activeAlpha40 }
    : hovered
      ? { backgroundColor: HOVER_BG, color: HOVER_TEXT, borderColor: HOVER_BORDER }
      : { backgroundColor: INACTIVE_BG, color: INACTIVE_TEXT, borderColor: INACTIVE_BORDER };

  const className =
    "shrink-0 px-4 py-1.5 rounded-full border text-sm font-medium whitespace-nowrap transition-colors duration-200 cursor-pointer";

  if (href) {
    return (
      <motion.a
        href={href}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.15 }}
        className={className}
        style={style}
        role="tab"
        aria-selected={isActive}
      >
        {label}
      </motion.a>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className={className}
      style={style}
      role="tab"
      aria-selected={isActive}
    >
      {label}
    </motion.button>
  );
}
