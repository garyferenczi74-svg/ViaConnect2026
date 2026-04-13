'use client';

// PortalTab — translucent colored pill tab for portal switching.
// Shared across pages that need to show the active portal context.

import { motion } from 'framer-motion';

interface PortalTabProps {
  label: string;
  isActive: boolean;
  onClick?: () => void;
  href?: string;
  accentColor: string;
  accentAlpha20: string;
  accentAlpha40: string;
  layoutId?: string;
}

export function PortalTab({
  label,
  isActive,
  onClick,
  href,
  accentColor,
  accentAlpha20,
  accentAlpha40,
  layoutId = 'portal-tab-indicator',
}: PortalTabProps) {
  const Tag = href ? 'a' : 'button';

  return (
    <Tag
      href={href}
      onClick={onClick}
      className="relative inline-flex items-center whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200"
      style={
        isActive
          ? {
              backgroundColor: accentAlpha20,
              color: accentColor,
              borderColor: accentAlpha40,
            }
          : {
              backgroundColor: 'rgba(255,255,255,0.07)',
              color: 'rgba(255,255,255,0.65)',
              borderColor: 'rgba(255,255,255,0.12)',
            }
      }
      onMouseEnter={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.12)';
          (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.90)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.07)';
          (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)';
        }
      }}
    >
      {label}
      {isActive && (
        <motion.span
          layoutId={layoutId}
          className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full"
          style={{ backgroundColor: accentColor }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        />
      )}
    </Tag>
  );
}
