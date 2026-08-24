'use client';

// Prompt 201 + 212: Connected Sources registry page.
// Prompt 201: Apple Health import, manual entry, Google Health OAuth.
// Prompt 212: WHOOP OAuth, Hume Band guided setup, Phone Health Data bridge.

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
import { WearableConsentModal } from '@/components/body-tracker/WearableConsentModal';
import { HumeSetupFlow } from '@/components/body-tracker/HumeSetupFlow';

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

  // Prompt 212: WHOOP cloud OAuth
  if (source.id === 'whoop') {
    return { kind: 'oauth_connect', connected: isConnected };
  }

  // Prompt 212: Hume Band + Phone Health (HealthKit / Health Connect)
  if (source.id === 'hume_band' || source.id === 'phone_health') {
    return { kind: 'native_connect' };
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
  // Prompt 212 WHOOP
  whoop_not_configured: 'WHOOP is not configured yet.',
  whoop_denied: 'WHOOP authorization was cancelled.',
  whoop_invalid_state: 'That WHOOP link expired. Please try again.',
  whoop_state_expired: 'That WHOOP link expired. Please try again.',
  whoop_callback_failed: 'Could not finish WHOOP connect. Please try again.',
  whoop_authorize_failed: 'Could not start WHOOP connect. Please try again.',
};

export default function ConnectedSourcesPage() {
  const [lastSync, setLastSync] = useState<Record<string, string | undefined>>({});
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [importOpen, setImportOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [consent, setConsent] = useState<'whoop' | 'health' | null>(null);
  const [humeOpen, setHumeOpen] = useState(false);

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
      const syncMap: Record<string, string | undefined> = {};
      const connMap: Record<string, boolean> = {};

      const { data } = await (supabase as any)
        .from('body_tracker_connections')
        .select('source_id, last_sync_at, status')
        .eq('user_id', user.id);
      if (Array.isArray(data)) {
        for (const row of data) {
          syncMap[row.source_id] = row.last_sync_at ?? undefined;
          connMap[row.source_id] = row.status === 'connected' || Boolean(row.last_sync_at);
        }
      }

      // Prompt 212 wearable providers
      try {
        const res = await fetch('/api/integrations/connected-sources');
        if (res.ok) {
          const json = await res.json();
          for (const row of json.sources ?? []) {
            const provider = String(row.provider);
            const uiId =
              provider === 'whoop'
                ? 'whoop'
                : provider === 'health_kit' || provider === 'health_connect'
                  ? 'phone_health'
                  : provider;
            const isOn = row.status === 'connected';
            connMap[uiId] = isOn || connMap[uiId];
            if (row.last_sync_at) syncMap[uiId] = row.last_sync_at;
            if (uiId === 'phone_health') {
              connMap['hume_band'] = isOn || connMap['hume_band'];
              if (row.last_sync_at) syncMap['hume_band'] = row.last_sync_at;
            }
          }
        }
      } catch {
        /* wearable tables may not exist yet */
      }

      setLastSync(syncMap);
      setConnected(connMap);
    } catch {
      // Table may be unavailable; cards fall back to Never synced.
    }
  }, []);

  useEffect(() => {
    void loadSyncTimes();
  }, [loadSyncTimes]);

  // Surface the result of an OAuth round-trip (the routes redirect back here
  // with ?connected= or ?error= or wearable_*), then clean the query string.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const ok = params.get('connected');
    const err = params.get('error');
    const wOk = params.get('wearable_success');
    const wErr = params.get('wearable_error');
    if (ok) toast.success('Google Health connected.');
    else if (err) toast.error(OAUTH_ERROR_COPY[err] ?? 'Could not connect Google Health.');
    if (wOk === 'whoop_connected') toast.success('WHOOP connected. Syncing your last 90 days.');
    else if (wErr) toast.error(OAUTH_ERROR_COPY[wErr] ?? 'Wearable connection could not complete.');
    if (ok || err || wOk || wErr) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleNativeConnect = useCallback((sourceId?: string) => {
    if (sourceId === 'hume_band' || sourceId === 'phone_health') {
      setConsent('health');
      return;
    }
    // Legacy native bridge path (flag off): honest message.
    toast('The native health connection ships with the upcoming app.');
  }, []);

  const handleConnect = useCallback((sourceId: string) => {
    if (sourceId === 'google_health') {
      window.location.href = '/api/integrations/google-health/start';
      return;
    }
    if (sourceId === 'whoop') {
      setConsent('whoop');
      return;
    }
    if (sourceId === 'hume_band' || sourceId === 'phone_health') {
      setConsent('health');
    }
  }, []);

  const acceptConsent = useCallback(() => {
    if (consent === 'whoop') {
      setConsent(null);
      window.location.href = '/api/integrations/whoop/authorize';
      return;
    }
    if (consent === 'health') {
      setConsent(null);
      setHumeOpen(true);
    }
  }, [consent]);

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
              onNativeConnect={() => handleNativeConnect(source.id)}
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

      <WearableConsentModal
        provider={consent === 'whoop' ? 'whoop' : 'health'}
        open={consent !== null}
        onAccept={acceptConsent}
        onClose={() => setConsent(null)}
      />
      {humeOpen && (
        <HumeSetupFlow
          onClose={() => setHumeOpen(false)}
          onComplete={() => {
            setHumeOpen(false);
            void loadSyncTimes();
            toast.success('Phone health connection updated.');
          }}
        />
      )}
    </div>
  );
}
