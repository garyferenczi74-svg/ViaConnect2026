import Link from 'next/link';
import { ListChecks, ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import ReviewQueueBoard, { type QueueRow } from '@/components/marshall-vision/ReviewQueueBoard';

export const dynamic = 'force-dynamic';

export default async function MarshallVisionReviewQueuePage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  const { data, error } = await supabase
    .from('counterfeit_determinations')
    .select(`
      id, verdict, confidence, matched_sku, mismatch_flags, created_at,
      counterfeit_evaluations:evaluation_id ( source, source_reference, image_storage_key )
    `)
    .eq('human_review_required', true)
    .order('created_at', { ascending: false })
    .limit(200);

  type Row = {
    id: string;
    verdict: string;
    confidence: number;
    matched_sku: string | null;
    mismatch_flags: string[] | null;
    created_at: string;
    counterfeit_evaluations: {
      source: string;
      source_reference: Record<string, unknown>;
      image_storage_key: string;
    } | null;
  };

  const rows: QueueRow[] = ((data ?? []) as Row[]).map((r) => ({
    determinationId: r.id,
    verdict: r.verdict as QueueRow['verdict'],
    confidence: Number(r.confidence),
    matchedSku: r.matched_sku,
    mismatchFlags: r.mismatch_flags ?? [],
    source: r.counterfeit_evaluations?.source ?? 'unknown',
    listingUrl:
      (r.counterfeit_evaluations?.source_reference as { listing_url?: string } | undefined)?.listing_url
      ?? null,
    imageStorageKey: r.counterfeit_evaluations?.image_storage_key ?? null,
    createdAt: r.created_at,
  }));

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/admin/marshall/vision"
            className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white"
          >
            <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
            Vision overview
          </Link>
          <div className="ml-2 w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
            <ListChecks className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-white">Review queue</h1>
            <p className="text-xs text-white/40">{rows.length} determination{rows.length === 1 ? '' : 's'} awaiting human review</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6">
        {error ? (
          <div className="rounded-md border border-red-400/40 bg-red-500/10 text-red-200 text-sm px-3 py-2">
            Query failed: {error.message}
          </div>
        ) : (
          <ReviewQueueBoard rows={rows} />
        )}
      </div>
    </div>
  );
}
