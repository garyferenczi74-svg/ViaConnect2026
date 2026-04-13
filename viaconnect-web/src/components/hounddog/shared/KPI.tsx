'use client';

import React from 'react';
import { ArrowUp } from 'lucide-react';
import { C } from '@/lib/hounddog/constants';

interface KPIProps {
  label: string;
  value: string | number;
  change?: string;
  positive?: boolean;
}

export default function KPI({ label, value, change, positive }: KPIProps) {
  return (
    <div>
      <div
        style={{
          fontSize: 9,
          textTransform: 'uppercase',
          color: C.muted,
          letterSpacing: '0.09em',
          fontWeight: 600,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 30,
          fontWeight: 800,
          letterSpacing: '-0.03em',
          color: C.text,
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {change && (
        <div
          style={{
            fontSize: 11,
            color: positive ? C.green : C.red,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            marginTop: 4,
          }}
        >
          <ArrowUp
            size={11}
            strokeWidth={1.5}
            style={{
              transform: positive ? 'none' : 'rotate(180deg)',
            }}
          />
          {change}
        </div>
      )}
    </div>
  );
}
