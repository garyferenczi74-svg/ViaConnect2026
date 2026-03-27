'use client';

import React from 'react';

interface VCButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'orange' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

const variantStyles: Record<string, React.CSSProperties> = {
  primary: {
    background: 'linear-gradient(135deg, #2DA5A0, #1F8A85)',
    color: '#FFFFFF',
    borderRadius: '0.75rem',
    border: 'none',
  },
  secondary: {
    background: 'transparent',
    border: '1.5px solid #2DA5A0',
    color: '#2DA5A0',
    borderRadius: '0.75rem',
  },
  orange: {
    background: 'linear-gradient(135deg, #B75E18, #994E14)',
    color: '#FFFFFF',
    borderRadius: '0.75rem',
    border: 'none',
  },
  ghost: {
    background: 'transparent',
    color: '#9CA3AF',
    border: 'none',
  },
  destructive: {
    background: '#E74C3C',
    color: '#FFFFFF',
    borderRadius: '0.75rem',
    border: 'none',
  },
};

const sizeClasses: Record<string, string> = {
  sm: 'text-sm px-4 py-2 rounded-lg',
  md: 'text-base px-6 py-3 rounded-xl',
  lg: 'text-lg px-8 py-4 rounded-xl',
};

const sizeStyles: Record<string, React.CSSProperties> = {
  sm: {},
  md: { letterSpacing: '0.5px' },
  lg: {},
};

export function VCButton({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled = false,
  style,
  ...rest
}: VCButtonProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isActive, setIsActive] = React.useState(false);

  const getHoverStyle = (): React.CSSProperties => {
    if (!isHovered || disabled) return {};

    switch (variant) {
      case 'primary':
      case 'orange':
        return {
          filter: 'brightness(1.1)',
          transform: 'translateY(-1px)',
        };
      case 'secondary':
        return {
          background: 'rgba(45, 165, 160, 0.1)',
          border: '1.5px solid #2DA5A0',
          color: '#2DA5A0',
        };
      case 'ghost':
        return {
          color: '#FFFFFF',
        };
      default:
        return {};
    }
  };

  const getActiveStyle = (): React.CSSProperties => {
    if (!isActive || disabled) return {};

    if (variant === 'primary' || variant === 'orange') {
      return {
        filter: 'brightness(0.95)',
        transform: 'translateY(0)',
      };
    }
    return {};
  };

  const combinedStyle: React.CSSProperties = {
    fontWeight: 600,
    transition: 'all 200ms',
    cursor: disabled ? 'default' : 'pointer',
    ...variantStyles[variant],
    ...sizeStyles[size],
    ...getHoverStyle(),
    ...getActiveStyle(),
    ...style,
  };

  return (
    <button
      className={`${sizeClasses[size]} ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}
      style={combinedStyle}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsActive(false);
      }}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
      {...rest}
    >
      {children}
    </button>
  );
}
