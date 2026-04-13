'use client';

import React from 'react';
import { C } from '@/lib/hounddog/constants';

interface SecHeadProps {
  label: string;
  children?: React.ReactNode;
}

export default function SecHead({ label, children }: SecHeadProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
      }}
    >
      <div
        style={{
          fontSize: 9,
          textTransform: 'uppercase',
          color: C.muted,
          letterSpacing: '0.09em',
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}
