import Link from 'next/link';
import { Clock } from 'lucide-react';
import FreshnessChip from './FreshnessChip';
import type { ManualEvidenceRowWithFreshness } from '@/lib/soc2/manualEvidence/types';

export default function ManualEvidenceList({ rows }: { rows: readonly ManualEvidenceRowWithFreshness[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-8 text-center text-sm text-white/50">
        No manual evidence uploaded yet. Use the upload action to add your first artifact.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <Link
          key={r.id}
          href={`/admin/compliance/soc2/manual-evidence/${r.id}`}
          className="block rounded-lg border border-white/[0.10] bg-white/[0.02] hover:bg-white/[0.05] transition p-3"
        >
          <div className="flex items-start gap-2 flex-wrap">
            <FreshnessChip state={r.freshness} daysUntilExpiry={r.daysUntilExpiry} />
            <span className="text-sm font-medium text-white truncate max-w-[60%]">{r.title}</span>
            <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-white/40">
              <Clock className="w-3 h-3" strokeWidth={1.5} aria-hidden />
              {r.uploadedAt.slice(0, 10)}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/60">
            <span>Controls: <span className="font-mono text-white/80">{r.controls.join(', ') || 'none'}</span></span>
            {r.validFrom || r.validUntil ? (
              <span>Valid: {r.validFrom ?? '...'} → {r.validUntil ?? 'open'}</span>
            ) : null}
            <span className="ml-auto tabular-nums">{formatBytes(r.sizeBytes)}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
