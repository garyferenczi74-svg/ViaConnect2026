'use client';

import { ChevronRight, Circle, Heart, Scan, Watch } from 'lucide-react';
import type { WearableTileView } from '@/lib/body-tracker/wearable-tiles';
import { formatTileLastSync } from '@/lib/body-tracker/wearable-snapshot';

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

interface WearableTileCardProps {
  tile: WearableTileView;
  onPrimary: (tile: WearableTileView) => void;
  onDropXml?: (file: File) => void;
}

export function WearableTileCard({ tile, onPrimary, onDropXml }: WearableTileCardProps) {
  const connected = tile.status === 'connected';
  const sync = formatTileLastSync(tile.lastSyncAt, tile.lastSyncKind);
  const feeds = feedsLabel(tile);
  const xmlAction = tile.action.kind === 'xml_upload';
  const oauthReady = tile.action.kind === 'oauth' && tile.action.configured;
  const oauthBlocked = tile.action.kind === 'oauth' && !tile.action.configured;

  return (
    <article
      data-tile-id={tile.id}
      className="rounded-2xl border border-white/[0.08] bg-[#1E3054] p-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-[#1A2744]">
          <TileIcon id={tile.id} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-white">{tile.name}</h3>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/60">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${connected ? 'bg-[#2DA5A0]' : 'bg-white/30'}`}
                />
                {tile.statusLabel}
              </p>
            </div>
            {connected && !xmlAction ? (
              <button
                type="button"
                onClick={() => onPrimary(tile)}
                aria-label={`${tile.name} details`}
                className="rounded-lg p-1 text-white/50 hover:bg-white/5 hover:text-white"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
              </button>
            ) : null}
            {!connected && xmlAction ? (
              <button
                type="button"
                onClick={() => onPrimary(tile)}
                className="min-h-[36px] rounded-lg bg-[#2DA5A0] px-3 text-xs font-semibold text-white hover:bg-[#2DA5A0]/85"
              >
                Upload XML
              </button>
            ) : null}
            {!connected && oauthReady ? (
              <button
                type="button"
                onClick={() => onPrimary(tile)}
                className="min-h-[36px] rounded-lg bg-[#2DA5A0] px-3 text-xs font-semibold text-white hover:bg-[#2DA5A0]/85"
              >
                Connect
              </button>
            ) : null}
            {!connected && oauthBlocked ? (
              <span className="text-[11px] text-white/40">Not configured</span>
            ) : null}
          </div>
          {connected && sync ? <p className="mt-1 text-xs text-white/45">{sync}</p> : null}
          {connected && feeds ? <p className="mt-1 text-xs text-white/45">{feeds}</p> : null}
          {connected && xmlAction ? (
            <button
              type="button"
              onClick={() => onPrimary(tile)}
              className="mt-2 text-xs font-medium text-[#2DA5A0] hover:underline"
            >
              Upload XML
            </button>
          ) : null}
        </div>
      </div>

      {tile.id === 'apple_health' && onDropXml ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) onDropXml(file);
          }}
          className="mt-3 hidden rounded-xl border border-dashed border-white/20 bg-[#1A2744]/60 p-3 text-center lg:block"
        >
          <p className="text-[11px] text-white/50">
            Upload Apple Health XML. Drag and drop file here or click to browse.
          </p>
          <button
            type="button"
            onClick={() => onPrimary(tile)}
            className="mt-2 text-xs font-semibold text-[#2DA5A0]"
          >
            Upload XML
          </button>
        </div>
      ) : null}
    </article>
  );
}
