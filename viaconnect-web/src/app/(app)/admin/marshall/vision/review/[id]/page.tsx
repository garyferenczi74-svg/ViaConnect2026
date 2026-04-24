import Link from 'next/link';
import { ChevronLeft, Eye, ExternalLink, FileSearch } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import VerdictBadge from '@/components/marshall-vision/VerdictBadge';
import FeatureFlagChip from '@/components/marshall-vision/FeatureFlagChip';
import ReasoningTrace, { type ReasoningTraceEntry } from '@/components/marshall-vision/ReasoningTrace';
import DispositionActions from '@/components/marshall-vision/DispositionActions';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
}

export default async function DeterminationDetailPage({ params }: PageProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  const { data: det } = await supabase
    .from('counterfeit_determinations')
    .select(`
      id, verdict, confidence, matched_sku, mismatch_flags, reasoning_trace,
      cited_reference_ids, human_review_required, created_at,
      evaluation_id,
      counterfeit_evaluations:evaluation_id (
        evaluation_id, source, source_reference, image_storage_key,
        candidate_skus, model_version, reference_corpus_version, phi_redacted,
        content_safety_skip, content_safety_reason, evaluated_at
      )
    `)
    .eq('id', params.id)
    .maybeSingle();

  if (!det) {
    return (
      <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6">
        <Link href="/admin/marshall/vision/review" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
          Back to queue
        </Link>
        <div className="mt-6 rounded-md border border-red-400/40 bg-red-500/10 text-red-200 text-sm px-3 py-2">
          Determination not found.
        </div>
      </div>
    );
  }

  type D = {
    id: string;
    verdict: string;
    confidence: number;
    matched_sku: string | null;
    mismatch_flags: string[] | null;
    reasoning_trace: ReasoningTraceEntry[];
    cited_reference_ids: string[];
    human_review_required: boolean;
    created_at: string;
    counterfeit_evaluations: {
      evaluation_id: string;
      source: string;
      source_reference: Record<string, unknown>;
      image_storage_key: string;
      candidate_skus: string[] | null;
      model_version: string;
      reference_corpus_version: string;
      phi_redacted: boolean;
      content_safety_skip: boolean;
      content_safety_reason: string | null;
      evaluated_at: string;
    };
  };
  const d = det as D;
  const e = d.counterfeit_evaluations;
  const listingUrl = (e.source_reference as { listing_url?: string })?.listing_url ?? null;

  // Load cited reference corpus entries for the center pane.
  let citedRefs: Array<{ id: string; sku: string; artifact_kind: string; version: string; storage_key: string }> = [];
  if (d.cited_reference_ids.length > 0) {
    const { data: refs } = await supabase
      .from('counterfeit_reference_corpus')
      .select('id, sku, artifact_kind, version, storage_key')
      .in('id', d.cited_reference_ids);
    citedRefs = (refs as typeof citedRefs | null) ?? [];
  }

  // Existing disposition (if any).
  const { data: disp } = await supabase
    .from('counterfeit_dispositions')
    .select('id, disposition, confirmation_note, decided_at, decided_by, disagreed_with_model')
    .eq('determination_id', d.id)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <Link href="/admin/marshall/vision/review" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
          Back to queue
        </Link>
        <div className="flex items-start gap-3 mt-2 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
            <FileSearch className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <VerdictBadge verdict={d.verdict as Parameters<typeof VerdictBadge>[0]['verdict']} confidence={Number(d.confidence)} />
              <span className="text-[11px] text-white/40 font-mono">eval {e.evaluation_id}</span>
            </div>
            <h1 className="text-base md:text-lg font-semibold text-white mt-1 truncate">
              {d.matched_sku ?? 'Unidentified SKU'}
            </h1>
            <p className="text-xs text-white/50">
              Source: {e.source.replace(/_/g, ' ')} · {new Date(e.evaluated_at).toISOString().slice(0, 16).replace('T', ' ')}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
          <div className="text-xs font-semibold text-white/80 mb-2 flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
            Suspect image
          </div>
          <ImagePlaceholder storageKey={e.image_storage_key} label="suspect" />
          <div className="mt-3 text-xs text-white/60 space-y-1">
            <div>PHI redacted: <span className="text-white">{e.phi_redacted ? 'yes' : 'no'}</span></div>
            <div>Content-safety skip: <span className="text-white">{e.content_safety_skip ? `yes (${e.content_safety_reason ?? 'unknown'})` : 'no'}</span></div>
            {listingUrl ? (
              <div className="truncate flex items-center gap-1">
                <ExternalLink className="w-3 h-3 flex-shrink-0" strokeWidth={1.5} aria-hidden />
                <span className="truncate">{listingUrl}</span>
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
          <div className="text-xs font-semibold text-white/80 mb-2">Cited reference images ({citedRefs.length})</div>
          {citedRefs.length === 0 ? (
            <p className="text-xs text-white/40 italic">No reference corpus entries cited. Corpus may be empty or the vision layer found no candidates.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {citedRefs.map((r) => (
                <div key={r.id} className="rounded-md border border-white/[0.08] bg-black/20 p-2">
                  <ImagePlaceholder storageKey={r.storage_key} label={`${r.sku}/${r.artifact_kind}`} compact />
                  <div className="mt-1.5 text-[10px] text-white/60 font-mono truncate">{r.sku}</div>
                  <div className="text-[10px] text-white/40">{r.artifact_kind} · {r.version}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
          <div className="text-xs font-semibold text-white/80 mb-2">Reasoning trace</div>
          <ReasoningTrace entries={d.reasoning_trace ?? []} />

          {d.mismatch_flags && d.mismatch_flags.length > 0 ? (
            <div className="mt-3 pt-3 border-t border-white/[0.08]">
              <div className="text-[11px] text-white/60 mb-1.5">Summary flags</div>
              <div className="flex flex-wrap gap-1">
                {d.mismatch_flags.map((f) => <FeatureFlagChip key={f} flag={f} />)}
              </div>
            </div>
          ) : null}

          <div className="mt-3 pt-3 border-t border-white/[0.08] text-[11px] text-white/50 space-y-0.5">
            <div>Model: <span className="font-mono text-white/70">{e.model_version}</span></div>
            <div>Corpus: <span className="font-mono text-white/70">{e.reference_corpus_version}</span></div>
          </div>
        </section>
      </div>

      <div className="px-4 md:px-8 pb-10">
        {disp ? (
          <ExistingDispositionCard disp={disp as ExistingDisposition} />
        ) : (
          <section className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
            <h2 className="text-sm font-semibold text-white mb-3">Steve&rsquo;s disposition</h2>
            <DispositionActions determinationId={d.id} modelVerdict={d.verdict} />
          </section>
        )}
      </div>
    </div>
  );
}

interface ExistingDisposition {
  id: string;
  disposition: string;
  confirmation_note: string | null;
  decided_at: string;
  decided_by: string;
  disagreed_with_model: boolean;
}

function ExistingDispositionCard({ disp }: { disp: ExistingDisposition }) {
  return (
    <section className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-4">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-sm font-semibold text-emerald-200">Disposition recorded</span>
        <span className="text-[11px] text-white/50">{new Date(disp.decided_at).toISOString().slice(0, 16).replace('T', ' ')}</span>
        {disp.disagreed_with_model ? (
          <span className="text-[11px] rounded-md border border-amber-400/40 bg-amber-500/20 text-amber-200 px-1.5 py-0.5">
            disagreed with model
          </span>
        ) : null}
      </div>
      <div className="text-xs text-white/80 font-mono mb-2">{disp.disposition}</div>
      {disp.confirmation_note ? (
        <div className="text-sm text-white/80 whitespace-pre-wrap">{disp.confirmation_note}</div>
      ) : (
        <div className="text-xs text-white/40 italic">No note recorded.</div>
      )}
    </section>
  );
}

function ImagePlaceholder({ storageKey, label, compact }: { storageKey: string; label: string; compact?: boolean }) {
  // Signed-URL fetching is deferred to P5; for P4 we render a readable
  // placeholder so the admin can still navigate + confirm the pipeline
  // routed the right row.
  const height = compact ? 'h-24' : 'h-48 md:h-64';
  return (
    <div className={`${height} w-full rounded-md border border-dashed border-white/[0.12] bg-black/20 flex items-center justify-center text-[10px] text-white/40 font-mono text-center px-2`}>
      <span className="truncate" title={storageKey}>{label}</span>
    </div>
  );
}
