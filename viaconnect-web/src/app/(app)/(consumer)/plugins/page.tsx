'use client';

/**
 * /plugins: app integrations only. Wearables live at /body-tracker/connections.
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
