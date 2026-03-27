'use client';

import React from 'react';

interface ToggleSwitchProps {
  isActive: boolean;
  onToggle: () => void;
  ariaLabel: string;
}

export default function ToggleSwitch({ isActive, onToggle, ariaLabel }: ToggleSwitchProps) {
  return (
    <button
      role="switch"
      aria-checked={isActive}
      aria-label={ariaLabel}
      onClick={onToggle}
      style={{
        position: 'relative',
        width: 52,
        height: 28,
        borderRadius: 14,
        border: 'none',
        cursor: 'pointer',
        background: isActive
          ? 'linear-gradient(135deg, #2DA5A0, #1F8A85)'
          : '#2E4060',
        boxShadow: isActive ? '0 0 12px rgba(45, 165, 160, 0.4)' : 'none',
        transition: 'background 300ms ease, box-shadow 300ms ease',
        padding: 0,
        outline: 'none',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: isActive ? 27 : 3,
          width: 22,
          height: 22,
          borderRadius: '50%',
          backgroundColor: '#FFFFFF',
          transition: 'left 300ms ease',
          display: 'block',
        }}
      />
    </button>
  );
}
