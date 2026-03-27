'use client';

import React from 'react';

type GlassCardVariant = 'default' | 'score' | 'action' | 'insight' | 'widget';

interface GlassCardProps {
  variant?: GlassCardVariant;
  hover?: boolean;
  className?: string;
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

export function GlassCard({
  variant = 'default',
  hover = true,
  className = '',
  children,
  onClick,
}: GlassCardProps) {
  const baseStyles: React.CSSProperties = {
    background: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderRadius: variant === 'widget' ? '20px' : '16px',
    boxShadow: 'var(--shadow-card)',
    padding: '1.5rem',
    transition: hover ? 'transform 200ms ease, box-shadow 200ms ease' : undefined,
    cursor: onClick ? 'pointer' : undefined,
  };

  if (variant === 'insight') {
    baseStyles.background = 'rgba(45, 165, 160, 0.08)';
    baseStyles.border = '1px solid rgba(45, 165, 160, 0.15)';
  }

  const variantClass = (() => {
    switch (variant) {
      case 'insight':
        return 'glass-v2-insight';
      case 'score':
        return 'glass-v2 gradient-card';
      default:
        return 'glass-v2';
    }
  })();

  const hoverClass = hover ? 'glass-card-hover' : '';

  return (
    <>
      {hover && (
        <style>{`
          .glass-card-hover:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-card-hover) !important;
          }
        `}</style>
      )}
      <div
        className={`${variantClass} ${hoverClass} ${className}`.trim()}
        style={baseStyles}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
                }
              }
            : undefined
        }
      >
        {children}
      </div>
    </>
  );
}
