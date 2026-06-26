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
  connectorEnabled: boolean,
  isConnected: boolean,
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

  // Google Health OAuth connector, gated by its feature flag. Until the flag is
  // on (post-staging) it presents as coming soon rather than a dead Connect.
  if (source.id === 'google_health') {
    if (!connectorEnabled) return { kind: 'disabled', reason: 'Coming soon' };
    return { kind: 'oauth_connect', connected: isConnected };
  }

  // Deprecated source absorbed by another (Fitbit -> Google Health). Point users
  // to the replacement when it is available; otherwise an honest note.
  if (source.status === 'deprecated' && source.supersededBy) {
    const repl = CONNECTED_SOURCES.find((s) => s.id === source.supersededBy);
    if (repl && connectorEnabled) {
      return { kind: 'superseded', via: repl.displayName, viaId: repl.id };
    }
    return { kind: 'disabled', reason: 'Now part of Google Health' };
  }

  // Scaffold and coming-soon sources: honest disabled control, no dead flow.
  if (source.status !== 'active') {
    const reason =
      source.authMethod === 'native_bridge' ? 'Available in the app' : 'Coming soon';
    return { kind: 'disabled', reason };
  }

  return { kind: 'disabled', reason: 'Coming soon' };
}

// Friendly copy for the ?error= codes the OAuth routes redirect back with.
const OAUTH_ERROR_COPY: Record<string, string> = {
  not_enabled: 'Google Health is not enabled yet.',
  not_configured: 'Google Health is not configured yet.',
  bad_state: 'That connection attempt expired. Please try again.',
  no_code: 'Google did not return an authorization. Please try again.',
  token_failed: 'Could not complete the Google Health connection.',
  token_timeout: 'Google Health timed out. Please try again.',
  auth_timeout: 'The session check timed out. Please try again.',
  db_error: 'Could not save the Google Health connection.',
  internal: 'Something went wrong connecting Google Health.',
};

export default function ConnectedSourcesPage() {
  const [lastSync, setLastSync] = useState<Record<string, string | undefined>>({});
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [importOpen, setImportOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  // detectPlatform and isFeatureEnabled both read runtime state; resolve once on
  // mount so the cards stay stable. The native bridge flag is off in this ship.
  const [platform] = useState(() => detectPlatform());
  const nativeBridgeEnabled = useMemo(() => isFeatureEnabled('native_health_bridge'), []);
  // Server routes gate on GOOGLE_HEALTH_CONNECTOR; the card needs a client-readable
  // signal, so it also honors NEXT_PUBLIC_GOOGLE_HEALTH_CONNECTOR. Set both to true
  // to activate (server gating + the visible Connect card).
  const connectorEnabled = useMemo(
    () =>
      isFeatureEnabled('google_health_connector') ||
      process.env.NEXT_PUBLIC_GOOGLE_HEALTH_CONNECTOR === 'true',
    [],
  );

  const loadSyncTimes = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await (supabase as any)
        .from('body_tracker_connections')
        .select('source_id, last_sync_at, status')
        .eq('user_id', user.id);
      if (Array.isArray(data)) {
        const syncMap: Record<string, string | undefined> = {};
        const connMap: Record<string, boolean> = {};
        for (const row of data) {
          syncMap[row.source_id] = row.last_sync_at ?? undefined;
          connMap[row.source_id] = row.status === 'connected' || Boolean(row.last_sync_at);
        }
        setLastSync(syncMap);
        setConnected(connMap);
      }
    } catch {
      // Table may be unavailable; cards fall back to Never synced.
    }
  }, []);

  useEffect(() => {
    void loadSyncTimes();
  }, [loadSyncTimes]);

  // Surface the result of an OAuth round-trip (the routes redirect back here
  // with ?connected= or ?error=), then clean the query string.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const ok = params.get('connected');
    const err = params.get('error');
    if (ok) toast.success('Google Health connected.');
    else if (err) toast.error(OAUTH_ERROR_COPY[err] ?? 'Could not connect Google Health.');
    if (ok || err) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleNativeConnect = useCallback(() => {
    // The native bridge ships off; this path is reachable only when the flag is
    // flipped on a future native build. Until the plugin lands, be honest.
    toast('The native health connection ships with the upcoming app.');
  }, []);

  const handleConnect = useCallback((sourceId: string) => {
    // OAuth is a full-page redirect to Google; only Google Health uses it today.
    if (sourceId === 'google_health') {
      window.location.href = '/api/integrations/google-health/start';
    }
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
        {CONNECTED_SOURCES.map((source, index) => {
          const action = resolveAction(
            source,
            platform,
            nativeBridgeEnabled,
            connectorEnabled,
            connected[source.id] ?? false,
          );
          // With the connector flag off, present Google Health as coming soon so
          // the pill and the action agree, instead of active-but-disabled.
          const displaySource =
            source.id === 'google_health' && !connectorEnabled
              ? { ...source, status: 'coming_soon' as const }
              : source;
          return (
            <ConnectedSourceCard
              key={source.id}
              source={displaySource}
              index={index}
              lastSyncAt={lastSync[source.id]}
              action={action}
              onImport={() => setImportOpen(true)}
              onAddReading={() => setManualOpen(true)}
              onNativeConnect={handleNativeConnect}
              onConnect={handleConnect}
            />
          );
        })}
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
