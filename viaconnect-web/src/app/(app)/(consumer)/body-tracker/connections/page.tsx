'use client';

/**
 * Prompt 212: Connected Sources surface with WHOOP + Hume / Phone Health.
 * Extends existing body-tracker connections UI. Design tokens only.
 */

import { Suspense, useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link2, ShieldCheck, ScrollText, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BackToHubLink } from '@/components/body-tracker/hub/BackToHubLink';
import {
  ConnectionCard,
  type ConnectionSource,
  type ConnectionStatus,
} from '@/components/body-tracker/ConnectionCard';
import { WearableConsentModal } from '@/components/body-tracker/WearableConsentModal';
import { HumeSetupFlow } from '@/components/body-tracker/HumeSetupFlow';
import { DEFAULT_PRECEDENCE, type MetricKey } from '@/lib/wearables/types';

const FEATURED: ConnectionSource[] = [
  {
    id: 'whoop',
    name: 'WHOOP',
    sourceType: 'wearable',
    icon: 'Activity',
    description: 'Recovery, strain, sleep, HRV via WHOOP cloud',
    dataProvided: ['recovery', 'sleep', 'hrv', 'workouts'],
  },
  {
    id: 'hume_band',
    name: 'Hume Band',
    sourceType: 'wearable',
    icon: 'Scan',
    description: 'Guided setup through Apple Health / Health Connect',
    dataProvided: ['hrv', 'sleep', 'composition', 'steps'],
  },
  {
    id: 'phone_health',
    name: 'Phone Health Data',
    sourceType: 'plugin',
    icon: 'Heart',
    description: 'Apple Health or Health Connect (Hume, Apple Watch, Oura, and more)',
    dataProvided: ['weight', 'hr', 'activity', 'sleep'],
  },
];

const OTHER_WEARABLES: ConnectionSource[] = [
  { id: 'apple_watch', name: 'Apple Watch', sourceType: 'wearable', icon: 'Watch', description: 'Via Phone Health Data', dataProvided: ['hr', 'hrv', 'activity', 'sleep'] },
  { id: 'oura', name: 'Oura Ring', sourceType: 'wearable', icon: 'CircleDot', description: 'Via Phone Health Data when synced', dataProvided: ['sleep', 'hrv'] },
  { id: 'garmin', name: 'Garmin', sourceType: 'wearable', icon: 'Watch', description: 'Via Phone Health Data when synced', dataProvided: ['weight', 'hr', 'activity'] },
];

interface ConnState {
  status: ConnectionStatus;
  lastSyncAt?: string;
  errorDetail?: string;
}

type ProviderKey = 'whoop' | 'health_kit' | 'health_connect';

export default function ConnectionsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#1A2744]" />}>
      <ConnectionsPageInner />
    </Suspense>
  );
}

function ConnectionsPageInner() {
  const searchParams = useSearchParams();
  const [connMap, setConnMap] = useState<Record<string, ConnState>>({});
  const [loading, setLoading] = useState(true);
  const [whoopConfigured, setWhoopConfigured] = useState(false);
  const [precedence, setPrecedence] = useState<Record<string, string>>({ ...DEFAULT_PRECEDENCE });
  const [consent, setConsent] = useState<'whoop' | 'health' | null>(null);
  const [humeOpen, setHumeOpen] = useState(false);
  const [disconnectTarget, setDisconnectTarget] = useState<'whoop' | null>(null);
  const [deleteData, setDeleteData] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/connected-sources');
      if (!res.ok) return;
      const json = await res.json();
      setWhoopConfigured(Boolean(json.whoopConfigured));
      if (json.precedence) setPrecedence(json.precedence);

      const map: Record<string, ConnState> = {};
      for (const row of json.sources ?? []) {
        const provider = row.provider as ProviderKey;
        const uiId =
          provider === 'whoop'
            ? 'whoop'
            : provider === 'health_kit' || provider === 'health_connect'
              ? 'phone_health'
              : provider;
        const status: ConnectionStatus =
          row.status === 'connected'
            ? 'connected'
            : row.status === 'error'
              ? 'error'
              : row.status === 'pending'
                ? 'syncing'
                : 'disconnected';
        map[uiId] = {
          status,
          lastSyncAt: row.last_sync_at ?? undefined,
          errorDetail: row.error_detail?.code,
        };
        if (provider === 'health_kit' || provider === 'health_connect') {
          map['hume_band'] = map[uiId];
        }
      }
      setConnMap(map);
    } catch {
      /* fail open */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const success = searchParams.get('wearable_success');
    const error = searchParams.get('wearable_error');
    if (success === 'whoop_connected') {
      toast.success('WHOOP connected. Syncing your last 90 days.');
      void refresh();
    } else if (error) {
      const friendly: Record<string, string> = {
        whoop_not_configured: 'WHOOP is not configured yet. Contact support.',
        whoop_denied: 'WHOOP authorization was cancelled.',
        whoop_invalid_state: 'That connection link expired. Please try again.',
        whoop_state_expired: 'That connection link expired. Please try again.',
        whoop_callback_failed: 'Could not finish WHOOP connect. Please try again.',
        whoop_authorize_failed: 'Could not start WHOOP connect. Please try again.',
        auth_timeout: 'Sign-in timed out. Please try again.',
      };
      toast.error(friendly[error] || 'Connection could not complete.');
    }
  }, [searchParams, refresh]);

  const handleConnect = useCallback((sourceId: string) => {
    if (sourceId === 'whoop') {
      if (!whoopConfigured) {
        toast.error('WHOOP is not configured in this environment yet.');
        return;
      }
      setConsent('whoop');
      return;
    }
    if (sourceId === 'hume_band' || sourceId === 'phone_health') {
      setConsent('health');
      return;
    }
    toast('Use Phone Health Data to connect devices that sync to Apple Health.', {
      icon: 'ℹ️',
    });
  }, [whoopConfigured]);

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

  const handleDisconnect = useCallback((sourceId: string) => {
    if (sourceId === 'whoop') {
      setDeleteData(false);
      setDisconnectTarget('whoop');
      return;
    }
    toast('Open Phone Health permissions in system Settings to revoke health access.');
  }, []);

  const confirmDisconnect = useCallback(async () => {
    if (disconnectTarget !== 'whoop') return;
    try {
      const res = await fetch('/api/integrations/whoop/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteData }),
      });
      if (!res.ok) throw new Error('fail');
      toast.success(deleteData ? 'WHOOP disconnected and data deleted.' : 'WHOOP disconnected.');
      setDisconnectTarget(null);
      void refresh();
    } catch {
      toast.error('Could not disconnect. Please try again.');
    }
  }, [disconnectTarget, deleteData, refresh]);

  const handleSyncNow = useCallback(async (sourceId: string) => {
    if (sourceId === 'whoop') {
      toast('WHOOP updates arrive automatically via secure webhooks.');
      return;
    }
    setHumeOpen(true);
  }, []);

  const metricLabels: { key: MetricKey; label: string }[] = useMemo(
    () => [
      { key: 'hrv', label: 'HRV' },
      { key: 'sleep', label: 'Sleep' },
      { key: 'resting_hr', label: 'Resting HR' },
      { key: 'recovery', label: 'Recovery' },
      { key: 'workouts', label: 'Workouts' },
      { key: 'steps', label: 'Steps' },
      { key: 'body_composition', label: 'Body composition' },
    ],
    [],
  );

  async function savePrecedence(metric_key: MetricKey, preferred_provider: string) {
    setPrecedence((p) => ({ ...p, [metric_key]: preferred_provider }));
    try {
      await fetch('/api/integrations/connected-sources', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metric_key, preferred_provider }),
      });
    } catch {
      toast.error('Could not save preference');
    }
  }

  const bothConnected =
    connMap.whoop?.status === 'connected' &&
    (connMap.phone_health?.status === 'connected' || connMap.hume_band?.status === 'connected');

  return (
    <div className="min-h-screen bg-[#1A2744] text-white">
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-10 space-y-8">
        <BackToHubLink />

        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-2 text-[#2DA5A0]">
            <Link2 className="w-5 h-5" strokeWidth={1.5} />
            <span className="text-xs uppercase tracking-[0.2em] font-medium">Connected Sources</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold">Wearables and health data</h1>
          <p className="text-sm text-white/65 max-w-2xl leading-relaxed">
            Connect WHOOP directly, or bring Hume Band and other devices through phone health data.
            Readings feed your Bio Optimization Score. Missing values stay UNKNOWN until data arrives.
          </p>
        </motion.header>

        <section>
          <h2 className="text-sm font-medium text-white/50 mb-3">Featured</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {FEATURED.map((source) => {
              const st = connMap[source.id] ?? { status: 'disconnected' as ConnectionStatus };
              return (
                <ConnectionCard
                  key={source.id}
                  source={source}
                  status={loading ? 'syncing' : st.status}
                  lastSyncAt={st.lastSyncAt}
                  onConnect={() => handleConnect(source.id)}
                  onDisconnect={() => handleDisconnect(source.id)}
                  onSyncNow={() => void handleSyncNow(source.id)}
                />
              );
            })}
          </div>
          {connMap.whoop?.status === 'error' && (
            <p className="mt-3 text-sm text-[#B75E18]">
              WHOOP needs reconnection ({connMap.whoop.errorDetail || 'error'}). Tap Connect to authorize again.
            </p>
          )}
          {(connMap.hume_band?.status === 'connected' || connMap.phone_health?.status === 'connected') &&
            !connMap.hume_band?.lastSyncAt && (
              <p className="mt-3 text-sm text-white/55">
                Health permissions are on. Awaiting samples from Hume or other phone sources (UNKNOWN until data arrives).
              </p>
            )}
        </section>

        <section>
          <h2 className="text-sm font-medium text-white/50 mb-3">Also available via Phone Health</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {OTHER_WEARABLES.map((source) => (
              <ConnectionCard
                key={source.id}
                source={source}
                status="disconnected"
                onConnect={() => handleConnect('phone_health')}
                onDisconnect={() => undefined}
                onSyncNow={() => undefined}
              />
            ))}
          </div>
        </section>

        {bothConnected && (
          <section className="rounded-2xl border border-white/10 bg-[#1E3054] p-5">
            <h2 className="text-base font-semibold mb-1">Primary source per metric</h2>
            <p className="text-xs text-white/50 mb-4">
              When both WHOOP and phone health provide the same metric, we use only your preferred
              source. We never average across sources.
            </p>
            <div className="space-y-2">
              {metricLabels.map(({ key, label }) => (
                <div
                  key={key}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-black/20 px-3 py-2"
                >
                  <span className="text-sm text-white/80">{label}</span>
                  <select
                    className="bg-[#1A2744] border border-white/15 rounded-lg text-sm px-3 py-2 min-h-[40px]"
                    value={precedence[key] ?? DEFAULT_PRECEDENCE[key]}
                    onChange={(e) => void savePrecedence(key, e.target.value)}
                  >
                    <option value="whoop">WHOOP</option>
                    <option value="health_kit">Apple Health</option>
                    <option value="health_connect">Health Connect</option>
                  </select>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-white/10 bg-[#1E3054]/80 p-5 flex flex-col sm:flex-row gap-4 items-start">
          <ShieldCheck className="w-6 h-6 text-[#2DA5A0] shrink-0" strokeWidth={1.5} />
          <div className="space-y-2 text-sm text-white/70">
            <p className="font-medium text-white">Privacy</p>
            <p>
              Health data is never used for advertising. You can disconnect anytime and optionally
              delete stored wearable rows for that provider.
            </p>
            <Link href="/privacy" className="inline-flex items-center gap-1 text-[#2DA5A0] hover:underline">
              <ScrollText className="w-4 h-4" strokeWidth={1.5} />
              Privacy policy
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
            </Link>
          </div>
        </section>
      </div>

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
            void refresh();
            toast.success('Phone health connection updated.');
          }}
        />
      )}

      {disconnectTarget === 'whoop' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1E3054] p-6 text-white space-y-4">
            <h3 className="text-lg font-semibold">Disconnect WHOOP?</h3>
            <p className="text-sm text-white/70">
              This revokes ViaCura access at WHOOP and removes stored tokens. Historical normalized
              rows remain unless you choose delete below.
            </p>
            <label className="flex items-start gap-2 text-sm text-white/80">
              <input
                type="checkbox"
                checked={deleteData}
                onChange={(e) => setDeleteData(e.target.checked)}
                className="mt-1"
              />
              Also permanently delete my WHOOP wearable data from ViaCura
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDisconnectTarget(null)}
                className="flex-1 min-h-[44px] rounded-xl border border-white/15 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDisconnect()}
                className="flex-1 min-h-[44px] rounded-xl bg-[#B75E18] text-white text-sm font-semibold"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
