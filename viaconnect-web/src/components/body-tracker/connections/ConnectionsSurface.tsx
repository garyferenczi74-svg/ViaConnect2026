'use client';

// Shared 390 + 1280 Connections IA. Canonical path: /body-tracker/connections.
// /wearables redirects here. Six tiles: Whoop, Hume, Apple Health, Oura,
// Google Health, Garmin. Hume and Apple are XML. Watch tile is out of scope.
// Whoop/Oura stay Coming soon until OAuth secrets are provisioned. Google
// Health and Garmin are honest Coming soon tiles, never connectable here.
// Hume stays tagged ingest, not OAuth.

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { BackToHubLink } from '@/components/body-tracker/hub/BackToHubLink';
import {
  AppleHealthImportModal,
  type HealthXmlImportIntent,
} from '@/components/body-tracker/connected-sources/AppleHealthImportModal';
import { WearableConsentModal } from '@/components/body-tracker/WearableConsentModal';
import { detectPlatform } from '@/lib/capacitor/camera-capture';
import {
  CONNECTIONS_FOOTER,
  CONNECTIONS_LEAD,
  FIRST_CLASS_TILE_IDS,
  buildWearableTiles,
  type WearableTileView,
} from '@/lib/body-tracker/wearable-tiles';
import type { DimensionSourceRow } from '@/lib/body-tracker/source-disagreement';
import { WearableTileCard } from './WearableTileCard';
import { ScoreDetailPanel } from './ScoreDetailPanel';
import { ActiveSourceDetailPanel } from './ActiveSourceDetailPanel';
import { DimensionDetailSheet } from './DimensionDetailSheet';

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
}

export function ConnectionsSurface() {
  const [tiles, setTiles] = useState<WearableTileView[]>(() => emptyTiles('web'));
  const [selectedId, setSelectedId] = useState<WearableTileView['id']>('apple_health');
  const [scoreDetail, setScoreDetail] = useState<DimensionSourceRow[]>([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  // Consumed below by DimensionDetailSheet, which the chevron / DISAGREE
  // button in ContributorColumn opens via ScoreDetailPanel's
  // onOpenDimension prop.
  const [openMetric, setOpenMetric] = useState<string | null>(null);
  const [importIntent, setImportIntent] = useState<HealthXmlImportIntent | null>(null);
  const [consent, setConsent] = useState<'whoop' | 'oura' | null>(null);
  const [platform] = useState<'web' | 'ios' | 'android'>(() => {
    const p = detectPlatform();
    if (p.startsWith('ios')) return 'ios';
    if (p.startsWith('android')) return 'android';
    return 'web';
  });

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/integrations/wearable-tiles?platform=${platform}`);
      if (!res.ok) return;
      const json = (await res.json()) as TilesResponse;
      const next = Array.isArray(json.tiles) ? json.tiles : [];
      const filtered = next.filter((t) => (FIRST_CLASS_TILE_IDS as readonly string[]).includes(t.id));
      setTiles(filtered.length ? filtered : emptyTiles(platform));
      setScoreDetail(Array.isArray(json.scoreDetail) ? json.scoreDetail : []);
      setLastUpdatedAt(typeof json.lastUpdatedAt === 'string' ? json.lastUpdatedAt : null);
    } catch {
      setTiles(emptyTiles(platform));
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

  return (
    <div className="mx-auto w-full max-w-7xl font-instrument space-y-6">
      <BackToHubLink />

      <header>
        <h1 className="text-3xl font-bold text-white sm:text-4xl">Connections</h1>
        <p className="mt-1 text-sm text-white/50">Wearables</p>
        <p className="mt-2 text-sm text-white/60">{CONNECTIONS_LEAD}</p>
      </header>

      <div className="grid grid-cols-1 gap-6 min-[1280px]:grid-cols-2">
        <div className="space-y-3">
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
        <ScoreDetailPanel
          rows={scoreDetail}
          lastUpdatedAt={lastUpdatedAt}
          onOpenDimension={setOpenMetric}
        />
      </div>

      {/* Center column: Task 10 finalizes the 3-column grid. Mounted here for
          now so the selected-tile detail is live and tested. key= forces a
          remount on source switch so useHealthXmlImport's phase/result never
          leaks from one source's completed import onto another source's
          panel. onImported=load refreshes the left-column tiles after an
          inline import completes, matching the modal's onImported path. */}
      <ActiveSourceDetailPanel key={selectedTile?.id ?? 'none'} tile={selectedTile} onImported={load} />

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
      <DimensionDetailSheet metric={openMetric} rows={scoreDetail} onClose={() => setOpenMetric(null)} />
    </div>
  );
}
