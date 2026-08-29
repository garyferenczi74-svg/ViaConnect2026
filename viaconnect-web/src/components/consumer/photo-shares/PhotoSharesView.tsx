// Prompt 231b: pure presentational view for the "Body photo shares"
// section. Takes shares as a prop (null = loading) so it renders with
// renderToStaticMarkup in bare tests without mocking Supabase or effects,
// mirroring the scanFlowDriver/ScanHistory split in src/components/scan.
//
// Tokens only: var(--card) / var(--teal) plus Tailwind's named color
// utilities, no raw hex. Instrument Sans via .font-instrument, matching
// src/components/scan/ScanHistory.tsx. Lucide icons, strokeWidth 1.5.

import { Loader2, Share2, ShieldOff } from 'lucide-react';
import type { ActivePhotoShare } from '@/lib/photo-shares/types';

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export interface PhotoSharesViewProps {
  /** null while the initial load is in flight. */
  shares: ActivePhotoShare[] | null;
  loadError: boolean;
  onRetryLoad: () => void;
  onOpenGrant: () => void;
  onOpenRevoke: (share: ActivePhotoShare) => void;
}

export function PhotoSharesView({
  shares,
  loadError,
  onRetryLoad,
  onOpenGrant,
  onOpenRevoke,
}: PhotoSharesViewProps) {
  const stillLoading = shares === null && !loadError;

  return (
    <section className="font-instrument mt-8" data-testid="photo-shares-section">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-xs uppercase tracking-[0.15em] text-white/40">Body photo shares</h2>
        <button
          type="button"
          data-testid="photo-shares-grant-open"
          onClick={onOpenGrant}
          disabled={stillLoading}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--teal)] hover:text-[var(--teal)]/80 px-3 py-1.5 rounded-lg border border-[var(--teal)]/25 hover:border-[var(--teal)]/50 transition-all disabled:opacity-50"
        >
          <Share2 className="w-3.5 h-3.5" strokeWidth={1.5} />
          Share your body photos
        </button>
      </div>

      {loadError ? (
        <div
          data-testid="photo-shares-load-error"
          className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-[var(--card)] px-4 py-3"
        >
          <p className="text-sm text-white/60">Could not load your photo shares.</p>
          <button
            type="button"
            data-testid="photo-shares-retry"
            onClick={onRetryLoad}
            className="shrink-0 rounded-md border border-white/20 px-2.5 py-1.5 text-xs font-medium text-white/80"
          >
            Retry
          </button>
        </div>
      ) : shares === null ? (
        <div
          data-testid="photo-shares-loading"
          className="flex items-center justify-center rounded-2xl border border-white/[0.08] bg-[var(--card)] py-8"
        >
          <Loader2 className="h-4 w-4 animate-spin text-white/40" strokeWidth={1.5} />
        </div>
      ) : shares.length === 0 ? (
        <div
          data-testid="photo-shares-empty"
          className="rounded-2xl border border-white/[0.08] bg-[var(--card)] px-6 py-8 text-center"
        >
          <p className="text-sm text-white/60">
            You have not shared your body photos with any practitioner.
          </p>
        </div>
      ) : (
        <ul className="space-y-3" data-testid="photo-shares-list">
          {shares.map((share) => (
            <li
              key={share.practitionerId}
              data-testid={`photo-share-item-${share.practitionerId}`}
              className="rounded-2xl border border-white/[0.08] bg-[var(--card)] p-4 md:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate">{share.displayName}</h3>
                  {share.practiceName && (
                    <p className="text-xs text-white/50 truncate">{share.practiceName}</p>
                  )}
                  <p className="text-[10px] text-white/40 mt-1">
                    Shared on {formatDate(share.grantedAt)}
                  </p>
                  <p className="text-[10px] text-white/40">
                    Access expires {formatDate(share.expiresAt)}
                  </p>
                </div>
                <button
                  type="button"
                  data-testid={`photo-share-revoke-${share.practitionerId}`}
                  onClick={() => onOpenRevoke(share)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg border border-red-500/20 hover:border-red-500/40 transition-all shrink-0"
                >
                  <ShieldOff className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Revoke
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
