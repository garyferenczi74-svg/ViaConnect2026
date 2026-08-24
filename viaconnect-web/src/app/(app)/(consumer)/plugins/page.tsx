'use client';

/**
 * Prompt 218: Plugins page wired to real app connection state.
 * Ruling: apps only; wearables stay under Wearables Data; Connect untouched.
 */

import { Suspense } from 'react';
import { PluginsAppsSurface } from '@/components/plugins/PluginsAppsSurface';

export default function PluginsPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 py-8 text-sm text-white/50">Loading plugins...</div>
      }
    >
      <PluginsAppsSurface />
    </Suspense>
  );
}
