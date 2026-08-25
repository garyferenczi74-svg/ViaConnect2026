'use client';

// Prompt 230, Task 6: the center column of the three-column Connections
// redesign. Given the currently-selected tile (or none), renders per-source
// detail:
//   - file source (Apple Health, Hume): what it feeds, the iOS export
//     instructions, and an inline dropzone/browse that runs the import via
//     the Task-5 hook (useHealthXmlImport).
//   - OAuth Coming soon source (WHOOP, Oura, Google Health, Garmin): what it
//     will provide plus a plain, non-interactive Coming soon note. No
//     Connect control lives here; connect actions stay on the card in the
//     left column.
//   - nothing selected: a designed prompt to pick a source.
//
// Outer section is the same grey rest glass as wearable tiles. Inner
// wrappers use translucent white rgba, not opaque navy plates. Lucide at
// strokeWidth 1.5. No emojis. No em or en dashes anywhere.

import { useCallback, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarRange,
  CheckCircle2,
  CloudUpload,
  CopyMinus,
  FileArchive,
  ListChecks,
  MousePointerClick,
  UploadCloud,
} from 'lucide-react';
import {
  useHealthXmlImport,
  HEALTH_XML_IMPORT_COPY,
  type HealthXmlImportIntent,
} from '@/components/body-tracker/connected-sources/useHealthXmlImport';
import type { WearableTileView } from '@/lib/body-tracker/wearable-tiles';
import { WearableBrandMark } from '@/components/body-tracker/connections/WearableBrandMark';

function dimensionLabel(d: string): string {
  return d.charAt(0).toUpperCase() + d.slice(1);
}

function formatDate(iso: string | null): string {
  if (!iso) return 'n/a';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'n/a';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function feedsBlock(tile: WearableTileView) {
  if (!tile.advertisedDimensions.length) return null;
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-white/45">Feeds</p>
      <p className="mt-1 text-sm text-white/80">
        {tile.advertisedDimensions.map(dimensionLabel).join(', ')}
      </p>
    </div>
  );
}

interface ActiveSourceDetailPanelProps {
  tile: WearableTileView | null;
  onImported?: () => void;
}

export function ActiveSourceDetailPanel({ tile, onImported }: ActiveSourceDetailPanelProps) {
  // Rules-of-hooks: useHealthXmlImport (and the dropzone's local state) must
  // be called unconditionally, every render, regardless of which branch of
  // the tile ends up rendering below. Only the file-source branch uses the
  // resulting values; when nothing is selected or the tile is an oauth
  // Coming soon source, this instance simply goes unused (default intent
  // 'apple').
  const intent: HealthXmlImportIntent = tile?.id === 'hume' ? 'hume' : 'apple';
  const copy = HEALTH_XML_IMPORT_COPY[intent];
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const { phase, errorMsg, result, runImport, reset } = useHealthXmlImport(intent, onImported);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void runImport(file);
    },
    [runImport],
  );

  const isFileSource = tile?.action.kind === 'xml_upload';
  const busy = phase === 'uploading' || phase === 'parsing';

  return (
    <section
      data-detail-source={tile?.id ?? 'none'}
      className="relative rounded-[24px] border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.07)] p-4 backdrop-blur-md sm:p-5"
    >
      {tile === null ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/[0.14] bg-[rgba(255,255,255,0.04)] p-10 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.06)]">
            <MousePointerClick className="h-5 w-5 text-teal" strokeWidth={1.5} />
          </div>
          <h2 className="text-base font-semibold text-white">Pick a source</h2>
          <p className="text-sm text-white/50">Select a source to see how to connect it.</p>
        </div>
      ) : isFileSource ? (
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <WearableBrandMark id={tile.id} className="h-5 w-5" />
              <h2 className="text-base font-semibold text-white">{copy.title}</h2>
            </div>
            {feedsBlock(tile)}
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-[rgba(255,255,255,0.06)] p-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-white/45">
              How to export from iPhone
            </p>
            <p className="mt-1 text-sm leading-relaxed text-white/70">{copy.lead}</p>
          </div>

          {(phase === 'idle' || phase === 'error') && (
            <div
              data-inline-dropzone="true"
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={onDrop}
              className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
                dragActive ? 'border-teal bg-teal/[0.08]' : 'border-white/[0.14] bg-[rgba(255,255,255,0.04)]'
              }`}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.06)]">
                <UploadCloud className="h-5 w-5 text-teal" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{copy.dropTitle}</p>
                <p className="mt-1 text-[12px] text-white/45">
                  Drag and drop the file here or click to browse
                </p>
              </div>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="mt-1 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-teal px-5 text-sm font-semibold text-white transition-colors hover:bg-teal/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/60"
              >
                <FileArchive className="h-4 w-4" strokeWidth={1.5} />
                Choose file
              </button>
              <input
                ref={inputRef}
                type="file"
                accept=".xml,.zip,application/xml,text/xml,application/zip,application/x-zip-compressed"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void runImport(f);
                }}
              />
            </div>
          )}

          {phase === 'error' && errorMsg && (
            <div className="flex items-start gap-2 rounded-xl border border-copper/30 bg-copper/10 px-3 py-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-copper" strokeWidth={1.5} />
              <p className="text-[12px] leading-relaxed text-white/80">{errorMsg}</p>
            </div>
          )}

          {busy && (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-[rgba(255,255,255,0.06)] p-6 text-center">
              <CloudUpload className="h-6 w-6 animate-pulse text-teal" strokeWidth={1.5} />
              <p className="text-sm font-medium text-white">
                {phase === 'uploading' ? 'Uploading your export' : 'Reading your Health data'}
              </p>
            </div>
          )}

          {phase === 'done' && result && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-xl border border-teal/30 bg-teal/10 px-3 py-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-teal" strokeWidth={1.5} />
                <p className="text-sm font-medium text-white">Import complete</p>
              </div>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/[0.06] bg-[rgba(255,255,255,0.06)] p-3">
                  <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-white/45">
                    <ListChecks className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Records imported
                  </dt>
                  <dd className="mt-1 text-xl font-semibold text-white">{result.recordsIngested}</dd>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-[rgba(255,255,255,0.06)] p-3">
                  <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-white/45">
                    <CopyMinus className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Duplicates skipped
                  </dt>
                  <dd className="mt-1 text-xl font-semibold text-white">{result.recordsDeduped}</dd>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-[rgba(255,255,255,0.06)] p-3 sm:col-span-2">
                  <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-white/45">
                    <CalendarRange className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Date range
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-white">
                    {formatDate(result.dateRangeStart)} to {formatDate(result.dateRangeEnd)}
                  </dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={reset}
                className="flex min-h-[44px] w-full items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 text-sm font-medium text-white/75 transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/50"
              >
                Import another
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <WearableBrandMark id={tile.id} className="h-5 w-5" />
              <h2 className="text-base font-semibold text-white">{tile.name}</h2>
            </div>
            {feedsBlock(tile)}
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-[rgba(255,255,255,0.06)] p-3">
            <p className="text-sm leading-relaxed text-white/70">{tile.notes}</p>
          </div>
          {tile.statusLabel === 'Coming soon' ? (
            <p className="rounded-xl border border-copper/30 bg-copper/10 px-3 py-2.5 text-sm font-medium text-copper">
              {tile.statusLabel}
            </p>
          ) : (
            <p className="text-sm text-white/60">{tile.statusLabel}</p>
          )}
        </div>
      )}
    </section>
  );
}

export default ActiveSourceDetailPanel;
