'use client';

// Prompt 201: Connected Sources. Registry-driven page that supersedes the
// Prompt 77 / 85 hardcoded source lists. One card per CONNECTED_SOURCES entry.
//
// Each card resolves its action from the registry status plus the runtime
// platform and the native_health_bridge flag:
//   - apple_health: web shows Import (the Apple Health export flow). On native,
//     when native_health_bridge is on, it would show Connect Apple Health. The
//     flag ships off, so that control stays hidden, which is correct.
//   - manual_entry: Add reading, opening the manual entry modal.
//   - scaffold sources (Google Health Connect, Fitbit, Garmin): a disabled
//     control with the honest note. We never present a connect flow that cannot
//     complete.
//
// Last sync time is read from body_tracker_connections by source_id; sources
// with no row show Never synced.
//
// Design tokens: Deep Navy #1A2744 page, Card #1E3054 surfaces, Teal #2DA5A0
// accent, Orange #B75E18 reserved for warnings. Instrument Sans is inherited
// from the app shell. Lucide at strokeWidth 1.5. No emojis. No em or en dashes.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { BackToHubLink } from '@/components/body-tracker/hub/BackToHubLink';
import {
  CONNECTED_SOURCES,
  type ConnectedSource,
} from '@/lib/body-tracker/connected-sources/registry';
import { detectPlatform } from '@/lib/capacitor/camera-capture';
import { isFeatureEnabled } from '@/lib/config/feature-flags';
import {
  ConnectedSourceCard,
  type SourceAction,
} from '@/components/body-tracker/connected-sources/ConnectedSourceCard';
import { AppleHealthImportModal } from '@/components/body-tracker/connected-sources/AppleHealthImportModal';
import { ManualEntryModal } from '@/components/body-tracker/connected-sources/ManualEntryModal';

function resolveAction(
  source: ConnectedSource,
  platform: ReturnType<typeof detectPlatform>,
  nativeBridgeEnabled: boolean,
): SourceAction {
  if (source.id === 'apple_health') {
    // On the native shell, with the bridge enabled, offer the native connect.
    if (platform !== 'web' && nativeBridgeEnabled) {
      return { kind: 'native_connect' };
    }
    // Web (and native with the flag off) gets the file import flow.
    return { kind: 'import' };
  }

  if (source.id === 'manual_entry') {
    return { kind: 'add_reading' };
  }

  // Scaffold and coming-soon sources: honest disabled control, no dead flow.
  if (source.status !== 'active') {
    const reason =
      source.authMethod === 'native_bridge' ? 'Available in the app' : 'Coming soon';
    return { kind: 'disabled', reason };
  }

  return { kind: 'disabled', reason: 'Coming soon' };
}

export default function ConnectedSourcesPage() {
  const [lastSync, setLastSync] = useState<Record<string, string | undefined>>({});
  const [importOpen, setImportOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  // detectPlatform and isFeatureEnabled both read runtime state; resolve once on
  // mount so the cards stay stable. The native bridge flag is off in this ship.
  const [platform] = useState(() => detectPlatform());
  const nativeBridgeEnabled = useMemo(() => isFeatureEnabled('native_health_bridge'), []);

  const loadSyncTimes = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await (supabase as any)
        .from('body_tracker_connections')
        .select('source_id, last_sync_at')
        .eq('user_id', user.id);
      if (Array.isArray(data)) {
        const map: Record<string, string | undefined> = {};
        for (const row of data) {
          map[row.source_id] = row.last_sync_at ?? undefined;
        }
        setLastSync(map);
      }
    } catch {
      // Table may be unavailable; cards fall back to Never synced.
    }
  }, []);

  useEffect(() => {
    void loadSyncTimes();
  }, [loadSyncTimes]);

  const handleNativeConnect = useCallback(() => {
    // The native bridge ships off; this path is reachable only when the flag is
    // flipped on a future native build. Until the plugin lands, be honest.
    toast('The native health connection ships with the upcoming app.');
  }, []);

  return (
    <div className="font-instrument space-y-6">
      <BackToHubLink />

      <header>
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
          <h1 className="text-lg font-bold text-white">Connected Sources</h1>
        </div>
        <p className="mt-1 text-sm text-white/50">
          Bring body composition into My Biology. Hume Body Pod readings that reach Apple Health are tagged automatically.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CONNECTED_SOURCES.map((source, index) => (
          <ConnectedSourceCard
            key={source.id}
            source={source}
            index={index}
            lastSyncAt={lastSync[source.id]}
            action={resolveAction(source, platform, nativeBridgeEnabled)}
            onImport={() => setImportOpen(true)}
            onAddReading={() => setManualOpen(true)}
            onNativeConnect={handleNativeConnect}
          />
        ))}
      </div>

      <AppleHealthImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={loadSyncTimes}
      />
      <ManualEntryModal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        onSaved={loadSyncTimes}
      />
    </div>
  );
}
