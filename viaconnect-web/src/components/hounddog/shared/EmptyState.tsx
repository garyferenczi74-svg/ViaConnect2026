'use client';

import React from 'react';
import { C } from '@/lib/hounddog/constants';
import { HOUNDDOG_EMPTY_COPY } from '@/lib/hounddog/honesty';

export default function EmptyState() {
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 16,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 13,
          lineHeight: 1.55,
          color: C.muted2,
        }}
      >
        {HOUNDDOG_EMPTY_COPY}
      </p>
    </div>
  );
}
