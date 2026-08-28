'use client';

/**
 * /plugins: app integrations only. Wearables live at /body-tracker/connections.
 */

import { Suspense } from 'react';
import { PluginsAppsSurface } from '@/components/plugins/PluginsAppsSurface';
import { PluginsHeroShell } from '@/components/plugins/PluginsHeroShell';

export default function PluginsPage() {
  return (
    <PluginsHeroShell>
      <Suspense
        fallback={
          <div className="px-4 py-8 text-sm text-white/50">Loading plugins...</div>
        }
      >
        <PluginsAppsSurface />
      </Suspense>
    </PluginsHeroShell>
  );
}
