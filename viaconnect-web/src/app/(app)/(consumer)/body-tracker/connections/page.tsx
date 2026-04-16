'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Link2,
  CheckCircle2,
  Pencil,
  ShieldCheck,
  ScrollText,
  ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  ConnectionCard,
  type ConnectionSource,
  type ConnectionStatus,
} from '@/components/body-tracker/ConnectionCard';

/* ── Source registries ───────────────────────────────── */
const WEARABLE_SOURCES: ConnectionSource[] = [
  { id: 'apple_watch', name: 'Apple Watch', sourceType: 'wearable', icon: 'Watch', description: 'Heart rate, HRV, activity, sleep', dataProvided: ['hr', 'hrv', 'activity', 'sleep'] },
  { id: 'whoop', name: 'WHOOP', sourceType: 'wearable', icon: 'Activity', description: 'Strain, recovery, sleep, HRV', dataProvided: ['strain', 'recovery', 'sleep', 'hrv'] },
  { id: 'oura', name: 'Oura Ring', sourceType: 'wearable', icon: 'CircleDot', description: 'Sleep, readiness, HRV, temperature', dataProvided: ['sleep', 'readiness', 'hrv'] },
  { id: 'garmin', name: 'Garmin', sourceType: 'wearable', icon: 'Watch', description: 'Weight, HR, activity, training load', dataProvided: ['weight', 'hr', 'activity'] },
  { id: 'fitbit', name: 'Fitbit', sourceType: 'wearable', icon: 'Watch', description: 'Weight, HR, sleep, activity', dataProvided: ['weight', 'hr', 'sleep', 'activity'] },
  { id: 'hume_body_pod', name: 'Hume Body Pod', sourceType: 'wearable', icon: 'Scan', description: 'Full segmental body composition', dataProvided: ['composition', 'weight', 'segmental'] },
  { id: 'withings', name: 'Withings Body+', sourceType: 'wearable', icon: 'Scale', description: 'Weight, body composition, HR', dataProvided: ['weight', 'composition', 'hr'] },
];

const PLUGIN_SOURCES: ConnectionSource[] = [
  { id: 'apple_health', name: 'Apple Health', sourceType: 'plugin', icon: 'Heart', description: 'Aggregated health data from iOS', dataProvided: ['weight', 'hr', 'activity', 'sleep'] },
  { id: 'google_fit', name: 'Google Fit', sourceType: 'plugin', icon: 'Activity', description: 'Aggregated fitness data from Android', dataProvided: ['weight', 'hr', 'activity', 'sleep'] },
  { id: 'myfitnesspal', name: 'MyFitnessPal', sourceType: 'plugin', icon: 'Utensils', description: 'Weight and body measurements', dataProvided: ['weight', 'measurements'] },
  { id: 'cronometer', name: 'Cronometer', sourceType: 'plugin', icon: 'PieChart', description: 'Weight, measurements, biometrics', dataProvided: ['weight', 'measurements', 'biometrics'] },
  { id: 'strava', name: 'Strava', sourceType: 'plugin', icon: 'Bike', description: 'Activity and training data', dataProvided: ['activity'] },
];

/* ── Connection state map ────────────────────────────── */
interface ConnState {
  status: ConnectionStatus;
  lastSyncAt?: string;
}

export default function ConnectionsPage() {
  const [connMap, setConnMap] = useState<Record<string, ConnState>>({});
  const [loading, setLoading] = useState(true);

  /* Fetch existing connections */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data } = await (supabase as any)
          .from('body_tracker_connections')
          .select('source_id, status, last_sync_at')
          .eq('user_id', user.id);

        if (!cancelled && data) {
          const map: Record<string, ConnState> = {};
          for (const row of data) {
            map[row.source_id] = {
              status: row.status ?? 'disconnected',
              lastSyncAt: row.last_sync_at ?? undefined,
            };
          }
          setConnMap(map);
        }
      } catch {
        /* table may not exist yet */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleConnect = useCallback((sourceId: string) => {
    toast('Connection coming soon', { icon: '  ' });
  }, []);

  const handleDisconnect = useCallback((sourceId: string) => {
    toast('Disconnection coming soon', { icon: '  ' });
  }, []);

  const handleSyncNow = useCallback((sourceId: string) => {
    toast('Sync coming soon', { icon: '  ' });
  }, []);

  const getStatus = (sourceId: string): ConnectionStatus =>
    connMap[sourceId]?.status ?? 'disconnected';

  const getLastSync = (sourceId: string): string | undefined =>
    connMap[sourceId]?.lastSyncAt;

  return (
    <div className="space-y-8">
      {/* Page heading */}
      <div>
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
          <h1 className="text-lg font-bold text-white">Body Tracker: Connections</h1>
        </div>
        <p className="mt-1 text-sm text-white/50">
          Connect apps and devices to enrich your data
        </p>
      </div>

      {/* Manual Entry (always on) */}
      <section>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex items-center gap-4 rounded-2xl border border-green-500/20 bg-green-500/[0.06] p-4 backdrop-blur-md"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500/15">
            <Pencil className="h-5 w-5 text-green-400" strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Manual Entry</p>
            <p className="text-xs text-white/45">
              Always available. Log measurements directly in the app.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-green-400" strokeWidth={1.5} />
            <span className="text-xs font-medium text-green-400">Active</span>
          </div>
        </motion.div>
      </section>

      {/* Wearables */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
          Wearables
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          {WEARABLE_SOURCES.map((source, i) => (
            <motion.div
              key={source.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.35 }}
            >
              <ConnectionCard
                source={source}
                status={getStatus(source.id)}
                lastSyncAt={getLastSync(source.id)}
                onConnect={() => handleConnect(source.id)}
                onDisconnect={() => handleDisconnect(source.id)}
                onSyncNow={() => handleSyncNow(source.id)}
              />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Apps */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
          Apps
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          {PLUGIN_SOURCES.map((source, i) => (
            <motion.div
              key={source.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.35 }}
            >
              <ConnectionCard
                source={source}
                status={getStatus(source.id)}
                lastSyncAt={getLastSync(source.id)}
                onConnect={() => handleConnect(source.id)}
                onDisconnect={() => handleDisconnect(source.id)}
                onSyncNow={() => handleSyncNow(source.id)}
              />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Trust Settings */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
          Trust Settings
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Link
            href="/body-tracker/connections"
            className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/5 p-4 backdrop-blur-md transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50"
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
              <div>
                <p className="text-sm font-semibold text-white">Manage Trust Hierarchy</p>
                <p className="text-xs text-white/45">
                  Set data priority when sources conflict
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-white/30" strokeWidth={1.5} />
          </Link>

          <Link
            href="/body-tracker/connections"
            className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/5 p-4 backdrop-blur-md transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50"
          >
            <div className="flex items-center gap-3">
              <ScrollText className="h-5 w-5 text-[#B75E18]" strokeWidth={1.5} />
              <div>
                <p className="text-sm font-semibold text-white">View Reconciliation Log</p>
                <p className="text-xs text-white/45">
                  See how conflicting data points were resolved
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-white/30" strokeWidth={1.5} />
          </Link>
        </div>
      </section>
    </div>
  );
}
