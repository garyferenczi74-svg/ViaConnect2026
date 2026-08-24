'use client';

import { ChevronRight, Circle, CloudUpload, Heart, Scan, Watch } from 'lucide-react';
import type { WearableTileView } from '@/lib/body-tracker/wearable-tiles';

function TileIcon({ id }: { id: WearableTileView['id'] }) {
  if (id === 'whoop') return <Watch className="h-5 w-5 text-white/80" strokeWidth={1.5} />;
  if (id === 'hume') return <Scan className="h-5 w-5 text-white/80" strokeWidth={1.5} />;
  if (id === 'apple_health') return <Heart className="h-5 w-5 text-white/80" strokeWidth={1.5} />;
  return <Circle className="h-5 w-5 text-white/80" strokeWidth={1.5} />;
}

function feedsLabel(tile: WearableTileView): string | null {
  const dims = tile.status === 'connected' ? tile.dimensionsFed : tile.advertisedDimensions;
  if (!dims.length) return null;
  const names = dims.map((d) => d.charAt(0).toUpperCase() + d.slice(1));
  return `Feeds ${names.join(', ')}`;
}

const outlineBtn =
  'min-h-[36px] shrink-0 rounded-lg border border-teal bg-transparent px-3 text-xs font-semibold text-teal hover:bg-teal/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/50';

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
  const feeds = connected ? feedsLabel(tile) : null;
  const xmlAction = tile.action.kind === 'xml_upload';
  const oauthReady = tile.action.kind === 'oauth' && tile.action.configured;
  const comingSoon =
    tile.action.kind === 'oauth' &&
    !tile.action.configured &&
    tile.lastSyncState === 'not_connected';
  const liveDot = connected ? 'bg-teal' : needsReconnect ? 'bg-copper' : 'bg-white/30';
  const cardClassName = selected
    ? 'relative overflow-hidden rounded-[24px] border border-teal bg-teal/5 p-4 pl-6 ring-1 ring-teal backdrop-blur-md'
    : 'relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-card p-4 backdrop-blur-md';
  const titleClassName = selected
    ? 'text-sm font-bold leading-snug text-teal whitespace-normal break-words'
    : 'text-sm font-semibold leading-snug text-white whitespace-normal break-words';

  return (
    <article
      data-tile-id={tile.id}
      data-last-sync-state={tile.lastSyncState}
      data-coming-soon={comingSoon ? 'true' : 'false'}
      data-selected={selected ? 'true' : 'false'}
      aria-selected={selected ? 'true' : undefined}
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(tile)}
      onKeyDown={(e) => {
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
          className="absolute inset-y-3 left-0 w-1 rounded-full bg-teal"
        />
      ) : null}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-navy-700">
          <TileIcon id={tile.id} />
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
                className="shrink-0 rounded-lg p-1 text-white/50 hover:bg-white/5 hover:text-white"
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
          {connected && feeds ? <p className="mt-1 text-xs text-white/45">{feeds}</p> : null}
          {connected && xmlAction ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPrimary(tile);
              }}
              className="mt-2 text-xs font-medium text-teal hover:underline"
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
          className="mt-3 cursor-pointer rounded-xl border border-dashed border-white/20 bg-navy-700/60 p-4 text-center"
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
