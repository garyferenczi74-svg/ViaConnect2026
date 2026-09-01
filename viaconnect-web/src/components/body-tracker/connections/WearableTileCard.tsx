'use client';

import { ChevronRight, CloudUpload } from 'lucide-react';
import {
  isComingSoonTile,
  tileContributorLine,
  type WearableTileView,
} from '@/lib/body-tracker/wearable-tiles';
import { WearableBrandMark } from '@/components/body-tracker/connections/WearableBrandMark';
import { CLAIR_HONESTY_DISCLAIMER } from '@/lib/wearables/clair/config';

const outlineBtn =
  'flex min-h-[44px] shrink-0 items-center justify-center rounded-lg border border-teal bg-transparent px-3 text-sm font-semibold text-teal hover:bg-teal/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/50';

// Brief 28 Gary re-lock: one chrome function for all six first-class tiles.
// Resting is real grey Apple glass at HALF the prior fill/border alpha so
// more of the Athlete 9F hero shows through. Never bg-card or the opaque
// Card navy. Activated BODY is portal blue glass rgb(74,144,217), thinner.
// Title and left rail may stay teal. Do not use overflow-hidden on the
// body: it clips backdrop-filter and leaves an opaque navy plate.
const WEARABLE_TILE_FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/60';
export const WEARABLE_TILE_RESTING_CHROME =
  'relative rounded-[24px] border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.07)] p-4 backdrop-blur-md';
export const WEARABLE_TILE_ACTIVATED_CHROME =
  'relative rounded-[24px] border border-[rgba(74,144,217,0.25)] bg-[rgba(74,144,217,0.10)] p-4 pl-6 backdrop-blur-[16px]';
export const WEARABLE_TILE_ACTIVATED_RAIL =
  'absolute inset-y-3 left-0 w-1 rounded-full bg-teal/60';

export function wearableTileCardChrome(selected: boolean): string {
  return selected ? WEARABLE_TILE_ACTIVATED_CHROME : WEARABLE_TILE_RESTING_CHROME;
}

export function wearableTileTitleClassName(selected: boolean): string {
  return selected
    ? 'whitespace-normal break-words text-base font-bold leading-snug text-teal'
    : 'whitespace-normal break-words text-base font-semibold leading-snug text-white';
}

interface WearableTileCardProps {
  tile: WearableTileView;
  onPrimary: (tile: WearableTileView) => void;
  onDropXml?: (file: File) => void;
  selected?: boolean;
  onSelect?: (tile: WearableTileView) => void;
}

export function WearableTileCard({
  tile,
  onPrimary,
  onDropXml,
  selected,
  onSelect,
}: WearableTileCardProps) {
  const connected = tile.lastSyncState === 'synced' || tile.lastSyncState === 'connected_never_synced';
  const needsReconnect = tile.lastSyncState === 'needs_reconnect';
  const contributorLine = tileContributorLine(tile);
  const xmlAction = tile.action.kind === 'xml_upload';
  const oauthReady = tile.action.kind === 'oauth' && tile.action.configured;
  const comingSoon = isComingSoonTile(tile);
  const liveDot = connected ? 'bg-teal' : needsReconnect ? 'bg-copper' : 'bg-white/30';
  const cardClassName = `${wearableTileCardChrome(Boolean(selected))} ${WEARABLE_TILE_FOCUS_RING}`;
  const titleClassName = wearableTileTitleClassName(Boolean(selected));

  return (
    // Task 10 a11y: role="option" inside ConnectionsSurface's
    // role="listbox" (aria-selected is not a valid attribute on the plain
    // button role Task 4 used here). Roving tabindex: only the selected
    // card is tabbable; ConnectionsSurface's arrow-key handler moves both
    // selection and focus across cards. Known tradeoff: an option
    // containing action buttons (Upload/Connect/Reconnect) is imperfect
    // ARIA -- the inner buttons stop propagation so they stay
    // independently operable.
    <article
      data-tile-id={tile.id}
      data-last-sync-state={tile.lastSyncState}
      data-coming-soon={comingSoon ? 'true' : 'false'}
      data-selected={selected ? 'true' : 'false'}
      aria-selected={selected ? 'true' : undefined}
      role="option"
      tabIndex={selected ? 0 : -1}
      onClick={() => onSelect?.(tile)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(tile);
        }
      }}
      className={cardClassName}
    >
      {selected ? (
        <span
          aria-hidden="true"
          className={WEARABLE_TILE_ACTIVATED_RAIL}
        />
      ) : null}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-navy-700">
          <WearableBrandMark id={tile.id} className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 overflow-visible">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className={titleClassName}>
                {tile.name}
              </h3>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/60">
                <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${liveDot}`} />
                {tile.statusLabel}
              </p>
            </div>
            {connected && !xmlAction ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPrimary(tile);
                }}
                aria-label={`${tile.name} details`}
                className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-white/50 hover:bg-white/5 hover:text-white"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
              </button>
            ) : null}
            {tile.lastSyncState === 'not_connected' && xmlAction ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPrimary(tile);
                }}
                className={outlineBtn}
              >
                Upload XML
              </button>
            ) : null}
            {tile.lastSyncState === 'not_connected' && oauthReady ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPrimary(tile);
                }}
                className={outlineBtn}
              >
                Connect
              </button>
            ) : null}
            {needsReconnect && oauthReady ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPrimary(tile);
                }}
                className={outlineBtn}
              >
                Reconnect
              </button>
            ) : null}
          </div>
          {contributorLine ? (
            <p data-contributor-line="true" className="mt-1 text-xs text-white/45">
              {contributorLine}
            </p>
          ) : null}
          {tile.id === 'clair' ? (
            <p data-clair-disclaimer="true" className="mt-1 text-[11px] leading-snug text-white/40">
              {CLAIR_HONESTY_DISCLAIMER}
            </p>
          ) : null}
          {connected && xmlAction ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPrimary(tile);
              }}
              className="mt-2 flex min-h-[44px] items-center text-xs font-medium text-teal hover:underline"
            >
              Upload XML
            </button>
          ) : null}
        </div>
      </div>

      {tile.id === 'apple_health' && onDropXml ? (
        <div
          data-apple-dropzone="true"
          onDragOver={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation();
            onPrimary(tile);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const file = e.dataTransfer.files?.[0];
            if (file) onDropXml(file);
          }}
          className="mt-3 cursor-pointer rounded-xl border border-dashed border-white/20 bg-[rgba(255,255,255,0.06)] p-4 text-center"
        >
          <CloudUpload className="mx-auto h-5 w-5 text-teal" strokeWidth={1.5} />
          <p className="mt-2 text-[11px] text-white/50">
            Upload Apple Health XML. Drag and drop your XML file here, or click to browse.
          </p>
        </div>
      ) : null}
    </article>
  );
}
