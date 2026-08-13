'use client';

/**
 * Prompt 218: /plugins/apps uses the same apps surface as /plugins.
 * Hardcoded mock app list removed.
 */

import { Suspense } from 'react';
import { PluginsAppsSurface } from '@/components/plugins/PluginsAppsSurface';

export default function PluginsAppsPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 py-8 text-sm text-white/50">Loading apps...</div>
      }
    >
      <PluginsAppsSurface />
    </Suspense>
  );
}
