// Prompt #124 P4: Review queue board.
//
// Server component. Renders the queue as a responsive card grid. Each card
// links to /admin/marshall/vision/review/[id] for the full three-pane view.

import Link from 'next/link';
import { Clock, ExternalLink } from 'lucide-react';
import VerdictBadge from './VerdictBadge';
import FeatureFlagChip from './FeatureFlagChip';

export interface QueueRow {
  determinationId: string;
  verdict:
    | 'authentic'
    | 'counterfeit_suspected'
    | 'unauthorized_channel_suspected'
    | 'inconclusive'
    | 'unrelated_product'
    | 'insufficient_image_quality'
    | 'content_safety_skip';
  confidence: number;
  matchedSku: string | null;
  mismatchFlags: readonly string[];
  source: string;
  createdAt: string;
  listingUrl: string | null;
  imageStorageKey: string | null;
}

export interface ReviewQueueBoardProps {
  rows: readonly QueueRow[];
}

export default function ReviewQueueBoard({ rows }: ReviewQueueBoardProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-8 text-center text-sm text-white/50">
        Queue is empty. New determinations marked for human review will appear here.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {rows.map((r) => (
        <Link
          key={r.determinationId}
          href={`/admin/marshall/vision/review/${r.determinationId}`}
          className="group rounded-lg border border-white/[0.10] bg-white/[0.02] hover:bg-white/[0.05] transition p-3 flex flex-col gap-2"
        >
          <div className="flex items-start justify-between gap-2">
            <VerdictBadge verdict={r.verdict} confidence={r.confidence} compact />
            <span className="inline-flex items-center gap-1 text-[10px] text-white/40">
              <Clock className="w-3 h-3" strokeWidth={1.5} aria-hidden />
              {relativeTime(r.createdAt)}
            </span>
          </div>

          <div className="text-xs text-white/80">
            SKU <span className="font-mono text-white">{r.matchedSku ?? 'unknown'}</span>
            <span className="text-white/40"> · {r.source.replace(/_/g, ' ')}</span>
          </div>

          {r.mismatchFlags.length > 0 ? (
            <div className="flex flex-wrap gap-1 min-h-[1.25rem]">
              {r.mismatchFlags.slice(0, 4).map((f) => (
                <FeatureFlagChip key={f} flag={f} />
              ))}
              {r.mismatchFlags.length > 4 ? (
                <span className="text-[10px] text-white/40 self-center">+{r.mismatchFlags.length - 4} more</span>
              ) : null}
            </div>
          ) : null}

          {r.listingUrl ? (
            <div className="flex items-center gap-1 text-[11px] text-white/50 truncate">
              <ExternalLink className="w-3 h-3 flex-shrink-0" strokeWidth={1.5} aria-hidden />
              <span className="truncate">{r.listingUrl}</span>
            </div>
          ) : null}
        </Link>
      ))}
    </div>
  );
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMin = Math.floor((Date.now() - then) / 60000);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d`;
}
