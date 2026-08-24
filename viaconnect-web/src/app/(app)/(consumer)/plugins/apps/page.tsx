'use client';

/**
 * /plugins/apps uses the same apps surface as /plugins.
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
