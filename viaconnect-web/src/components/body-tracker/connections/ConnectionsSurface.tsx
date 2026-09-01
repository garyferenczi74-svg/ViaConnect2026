'use client';

// Shared 390 + 1280 Connections IA. Canonical path: /body-tracker/connections.
// /wearables redirects here. Six tiles: Whoop, Hume, Apple Health, Oura,
// Google Health, Garmin. Hume and Apple are XML. Watch tile is out of scope.
// Whoop/Oura stay Coming soon until OAuth secrets are provisioned. Google
// Health and Garmin are honest Coming soon tiles, never connectable here.
// Hume stays tagged ingest, not OAuth.

import { useCallback, useEffect, useState, type KeyboardEvent } from 'react';
import toast from 'react-hot-toast';
import { AdminPanel } from '@/components/admin/AdminPanelErrorBoundary';
import { BackToHubLink } from '@/components/body-tracker/hub/BackToHubLink';
import {
  AppleHealthImportModal,
  type HealthXmlImportIntent,
} from '@/components/body-tracker/connected-sources/AppleHealthImportModal';
import { WearableConsentModal } from '@/components/body-tracker/WearableConsentModal';
import { detectPlatform } from '@/lib/capacitor/camera-capture';
import { withAbortTimeout } from '@/lib/utils/with-timeout';
import {
  CONNECTIONS_FOOTER,
  CONNECTIONS_LEAD,
  FIRST_CLASS_TILE_IDS,
  buildWearableTiles,
  type WearableTileView,
} from '@/lib/body-tracker/wearable-tiles';
import type { DimensionSourceRow } from '@/lib/body-tracker/source-disagreement';
import {
  EMPTY_BEDTIME_STRIP,
  parseBedtimeStrip,
  type BedtimeStripView,
} from '@/lib/body-tracker/sleep-bedtime-strip';
import { resolveHabitSleepPair } from '@/lib/body-tracker/habit-sleep-pair';
import { useDailyScheduleView } from '@/hooks/useDailyScheduleView';
import { useHannahBosDisplay } from '@/hooks/useHannahBosDisplay';
import { WearableTileCard } from './WearableTileCard';
import { ScoreDetailPanel, gateSleepContributorRows } from './ScoreDetailPanel';
import { ActiveSourceDetailPanel } from './ActiveSourceDetailPanel';
import { DimensionDetailSheet } from './DimensionDetailSheet';
import { RythmHealthLabCard } from '@/components/labs/RythmHealthLabCard';

function emptyTiles(platform: 'web' | 'ios' | 'android'): WearableTileView[] {
  return buildWearableTiles({
    oauth: [],
    humeIngestCount: 0,
    humeLastPersistAt: null,
    appleXmlIngested: 0,
    appleXmlLastPersistAt: null,
    healthKitPersisted: false,
    healthKitLastPersistAt: null,
    dimensionsFed: {},
    whoopConfigured: false,
    ouraConfigured: false,
    googleHealthConfigured: false,
    garminConfigured: false,
    platform,
  });
}

const OAUTH_ERROR_COPY: Record<string, string> = {
  whoop_not_configured: 'WHOOP is not available yet.',
  whoop_denied: 'WHOOP authorization was cancelled.',
  whoop_invalid_state: 'That WHOOP link expired. Please try again.',
  whoop_state_expired: 'That WHOOP link expired. Please try again.',
  whoop_callback_failed: 'Could not finish WHOOP connect. Please try again.',
  whoop_authorize_failed: 'Could not start WHOOP connect. Please try again.',
  oura_not_configured: 'Oura is not available yet.',
  oura_denied: 'Oura authorization was cancelled.',
  oura_invalid_state: 'That Oura link expired. Please try again.',
  oura_state_expired: 'That Oura link expired. Please try again.',
  oura_callback_failed: 'Could not finish Oura connect. Please try again.',
  oura_authorize_failed: 'Could not start Oura connect. Please try again.',
  auth_timeout: 'The session check timed out. Please try again.',
};

interface TilesResponse {
  tiles: WearableTileView[];
  scoreDetail: DimensionSourceRow[];
  lastUpdatedAt: string | null;
  bedtimeStrip?: BedtimeStripView;
}

export function ConnectionsSurface() {
  const [tiles, setTiles] = useState<WearableTileView[]>(() => emptyTiles('web'));
  // 228 state contract: 'loading' is the honest nothing-loaded-yet state (the
  // empty tiles above render fine for it). 'error' is a DISTINCT, actionable
  // state -- a failed load must never render as if emptyTiles were a real
  // "not connected" answer. See the load() callback below.
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [selectedId, setSelectedId] = useState<WearableTileView['id']>('apple_health');
  const [scoreDetail, setScoreDetail] = useState<DimensionSourceRow[]>([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  // Consumed below by DimensionDetailSheet, which the chevron / DISAGREE
  // button in ContributorColumn opens via ScoreDetailPanel's
  // onOpenDimension prop.
  const [openMetric, setOpenMetric] = useState<string | null>(null);
  const [bedtimeStrip, setBedtimeStrip] = useState<BedtimeStripView>(EMPTY_BEDTIME_STRIP);
  const [importIntent, setImportIntent] = useState<HealthXmlImportIntent | null>(null);
  const [consent, setConsent] = useState<'whoop' | 'oura' | null>(null);
  const schedule = useDailyScheduleView();
  const hannahBos = useHannahBosDisplay();
  const [platform] = useState<'web' | 'ios' | 'android'>(() => {
    const p = detectPlatform();
    if (p.startsWith('ios')) return 'ios';
    if (p.startsWith('android')) return 'android';
    return 'web';
  });

  const load = useCallback(async () => {
    try {
      const res = await withAbortTimeout(
        (signal) => fetch(`/api/integrations/wearable-tiles?platform=${platform}`, { signal }),
        15000,
        'connections.wearable-tiles',
      );
      if (!res.ok) {
        // Honesty: a failed read must not overwrite whatever tiles are on
        // screen with a fake "not connected" answer. Surface the error state
        // instead so the user sees a distinct, actionable notice.
        setLoadStatus('error');
        return;
      }
      const json = (await res.json()) as TilesResponse;
      const next = Array.isArray(json.tiles) ? json.tiles : [];
      const filtered = next.filter((t) => (FIRST_CLASS_TILE_IDS as readonly string[]).includes(t.id));
      setTiles(filtered.length ? filtered : emptyTiles(platform));
      setScoreDetail(Array.isArray(json.scoreDetail) ? json.scoreDetail : []);
      setLastUpdatedAt(typeof json.lastUpdatedAt === 'string' ? json.lastUpdatedAt : null);
      setBedtimeStrip(parseBedtimeStrip(json.bedtimeStrip));
      setLoadStatus('ready');
    } catch {
      // Timeout or network failure: same honesty rule as the !res.ok branch
      // above, no emptyTiles overwrite standing in for a real answer.
      setLoadStatus('error');
    }
  }, [platform]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const wOk = params.get('wearable_success');
    const wErr = params.get('wearable_error');
    if (wOk === 'whoop_connected') toast.success('WHOOP connected. Syncing your last 90 days.');
    if (wOk === 'oura_connected') toast.success('Oura connected. Syncing your last 90 days.');
    if (wErr) toast.error(OAUTH_ERROR_COPY[wErr] ?? 'Wearable connection could not complete.');
    if (wOk || wErr) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const persistPhiConsent = useCallback(async () => {
    try {
      await fetch('/api/hipaa/consent', { method: 'POST' });
    } catch {
      /* consent persist is best-effort; OAuth still proceeds */
    }
  }, []);

  const onPrimary = useCallback((tile: WearableTileView) => {
    if (tile.action.kind === 'xml_upload') {
      setImportIntent(tile.id === 'hume' ? 'hume' : 'apple');
      return;
    }
    if (tile.id === 'whoop') {
      if (tile.action.kind === 'oauth' && !tile.action.configured) {
        toast.error(OAUTH_ERROR_COPY.whoop_not_configured);
        return;
      }
      setConsent('whoop');
      return;
    }
    if (tile.id === 'oura') {
      if (tile.action.kind === 'oauth' && !tile.action.configured) {
        toast.error(OAUTH_ERROR_COPY.oura_not_configured);
        return;
      }
      setConsent('oura');
    }
  }, []);

  const acceptConsent = useCallback(async () => {
    const next = consent;
    setConsent(null);
    await persistPhiConsent();
    if (next === 'whoop') window.location.href = '/api/integrations/whoop/authorize';
    if (next === 'oura') window.location.href = '/api/integrations/oura/authorize';
  }, [consent, persistPhiConsent]);

  const selectedTile = tiles.find((t) => t.id === selectedId) ?? null;

  // G76 mobile order (below min-[900px]): cold (nothing connected) leads
  // with contributors so a first-time user sees why to connect a source;
  // once anything is connected, sources lead so the user can act on what
  // they already have. Resets to source order at >= 900px.
  const anyConnected = tiles.some((t) => t.lastSyncState === 'synced' || t.lastSyncState === 'connected_never_synced');

  // Task 10 a11y: single-select listbox arrow navigation. Attached to the
  // listbox container, which also receives events bubbling up from an
  // option's inner action buttons; only ArrowUp/ArrowDown are handled, and
  // only when the key originated on the option itself (fix round 1: a
  // bubbled Arrow keydown from a Tab-focused inner button, e.g. Upload
  // XML / Connect / Reconnect / the chevron, must NOT steal focus off that
  // button back onto a card). Moves both the selection (via setSelectedId)
  // and DOM focus (roving tabindex means only the newly selected option is
  // tabbable next).
  const handleSourceListKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const target = e.target as HTMLElement;
      if (!target || target.getAttribute('role') !== 'option') return;
      if (tiles.length === 0) return;
      e.preventDefault();
      const currentIndex = tiles.findIndex((t) => t.id === selectedId);
      const delta = e.key === 'ArrowDown' ? 1 : -1;
      const nextIndex =
        currentIndex === -1 ? 0 : (currentIndex + delta + tiles.length) % tiles.length;
      const next = tiles[nextIndex];
      setSelectedId(next.id);
      const nextEl = e.currentTarget.querySelector<HTMLElement>(`[data-tile-id="${next.id}"]`);
      nextEl?.focus();
    },
    [tiles, selectedId],
  );

  return (
    <div className="mx-auto w-full max-w-7xl font-instrument space-y-6">
      <BackToHubLink />

      <header>
        <h1 className="text-3xl font-bold text-white sm:text-4xl">Connections</h1>
        <p className="mt-1 text-sm text-white/50">Wearables</p>
        <p className="mt-2 text-sm text-white/60">{CONNECTIONS_LEAD}</p>
      </header>

      {loadStatus === 'error' ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 text-center">
          <p className="text-sm font-semibold text-white/85">
            We could not load your connected devices.
          </p>
          <p className="mt-1 text-sm text-white/60">
            Check your connection and try again.
          </p>
          <button
            type="button"
            onClick={() => {
              setLoadStatus('loading');
              void load();
            }}
            className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-lg border border-teal bg-transparent px-4 text-sm font-semibold text-teal hover:bg-teal/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/50"
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 min-[900px]:grid-cols-2 min-[1280px]:grid-cols-[1fr_1.2fr_1fr] min-[1280px]:items-stretch">
        <AdminPanel name="Sources">
          <div
            role="listbox"
            aria-label="Wearable sources"
            onKeyDown={handleSourceListKeyDown}
            className={`space-y-3 ${anyConnected ? 'order-1' : 'order-2'} min-[900px]:order-none`}
          >
            {tiles.map((tile) => (
              <WearableTileCard
                key={tile.id}
                tile={tile}
                onPrimary={onPrimary}
                onDropXml={tile.id === 'apple_health' ? () => setImportIntent('apple') : undefined}
                selected={tile.id === selectedId}
                onSelect={(t) => setSelectedId(t.id)}
              />
            ))}
          </div>
        </AdminPanel>

        {/* Center column: the selected-tile detail. key= forces a remount on
            source switch so useHealthXmlImport's phase/result never leaks
            from one source's completed import onto another source's panel.
            onImported=load refreshes the sources column after an inline
            import completes, matching the modal's onImported path. */}
        <AdminPanel name="Active source">
          <div className={`${anyConnected ? 'order-2' : 'order-3'} min-[900px]:order-none min-[1280px]:h-full`}>
            <ActiveSourceDetailPanel
              key={selectedTile?.id ?? 'none'}
              tile={selectedTile}
              onImported={load}
            />
          </div>
        </AdminPanel>

        <AdminPanel name="Score contributors">
          <div className={`${anyConnected ? 'order-3' : 'order-1'} min-[900px]:order-none min-[1280px]:h-full`}>
            <ScoreDetailPanel
              rows={scoreDetail}
              lastUpdatedAt={lastUpdatedAt}
              onOpenDimension={setOpenMetric}
              bedtimeStrip={bedtimeStrip}
              habitSleepPair={resolveHabitSleepPair({
                tiles,
                sleepTileSynced: bedtimeStrip.sleepTileSynced,
                schedule: schedule.status === 'ready' ? schedule.view : null,
              })}
              composite={hannahBos.display}
              sentence={hannahBos.sentence}
              chips={hannahBos.result.chips}
            />
          </div>
        </AdminPanel>
      </div>

      <section aria-labelledby="connections-labs-heading" className="space-y-3">
        <div>
          <h2 id="connections-labs-heading" className="text-xl font-semibold text-white">
            Labs
          </h2>
          <p className="mt-1 text-sm text-white/50">
            Blood tests and lab panels. These are not wearables and do not feed wearable
            tiles.
          </p>
        </div>
        <RythmHealthLabCard />
      </section>

      <p className="text-center text-xs text-white/40">{CONNECTIONS_FOOTER}</p>

      <AppleHealthImportModal
        open={importIntent !== null}
        intent={importIntent ?? 'apple'}
        onClose={() => setImportIntent(null)}
        onImported={load}
      />
      <WearableConsentModal
        provider={consent === 'oura' ? 'oura' : 'whoop'}
        open={consent !== null}
        onAccept={() => {
          void acceptConsent();
        }}
        onClose={() => setConsent(null)}
      />
      {/* Prompt 230 follow-up: gate the sheet's Sleep row the same way the
          contributor column does, so a row shown "Connect your device" never
          opens a drill-down that presents a stale sleep value as current. */}
      <DimensionDetailSheet
        metric={openMetric}
        rows={gateSleepContributorRows(scoreDetail, {
          lastSyncSynced: bedtimeStrip.sleepTileSynced === true,
        })}
        onClose={() => setOpenMetric(null)}
      />
    </div>
  );
}
