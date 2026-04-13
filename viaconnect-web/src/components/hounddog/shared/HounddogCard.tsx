'use client';

import React from 'react';

interface HounddogCardProps {
  children: React.ReactNode;
  className?: string;
  clickable?: boolean;
  onClick?: () => void;
}

export default function HounddogCard({
  children,
  className = '',
  clickable = false,
  onClick,
}: HounddogCardProps) {
  const baseClasses =
    'bg-[#1E3054] border border-white/[0.08] rounded-xl transition-colors duration-200';
  const hoverClasses = clickable ? 'hover:border-[#2DA5A0]/40 cursor-pointer' : '';

  return (
    <div
      className={`${baseClasses} ${hoverClasses} ${className}`}
      onClick={clickable ? onClick : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e: React.KeyboardEvent<HTMLDivElement>) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
