'use client';

import React from 'react';
import { Loader } from 'lucide-react';
import { C } from '@/lib/hounddog/constants';

type BtnVariant = 'primary' | 'orange' | 'green' | 'ghost' | 'danger';

interface BtnProps {
  variant: BtnVariant;
  children: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
  className?: string;
  icon?: React.ElementType;
}

const variantStyles: Record<BtnVariant, React.CSSProperties> = {
  primary: {
    background: C.teal,
    color: '#fff',
    border: 'none',
  },
  orange: {
    background: '#E8803A',
    color: '#fff',
    border: 'none',
  },
  green: {
    background: '#27C97A',
    color: '#fff',
    border: 'none',
  },
  ghost: {
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.13)',
    color: '#fff',
  },
  danger: {
    background: 'rgba(232,69,69,0.15)',
    border: '1px solid rgba(232,69,69,0.30)',
    color: '#E84545',
  },
};

export default function Btn({
  variant,
  children,
  onClick,
  loading,
  className,
  icon: Icon,
}: BtnProps) {
  return (
    <button
      className={className}
      onClick={onClick}
      disabled={loading}
      style={{
        ...variantStyles[variant],
        borderRadius: 7,
        fontSize: 12,
        fontWeight: 600,
        display: 'inline-flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        padding: '6px 12px',
        cursor: loading ? 'wait' : 'pointer',
        lineHeight: 1,
      }}
    >
      {loading ? (
        <Loader size={12} strokeWidth={1.5} style={{ animation: 'hd-spin 1s linear infinite' }} />
      ) : Icon ? (
        <Icon size={12} strokeWidth={1.5} />
      ) : null}
      {children}
    </button>
  );
}
