// Prompt #124 P5: SOC 2 counterfeit-determinations collector.
//
// Emits a pseudonymized CSV of counterfeit_determinations for the period,
// joined with source metadata from counterfeit_evaluations. Supports
// Trust Services Criteria:
//   CC4 (monitoring) — show the counterfeit-detection queue is running
//   CC7 (system operations) — operational pipeline produces audited output
//   C1  (confidentiality) — brand protection evidence
//
// PHI/PII rules:
//   - verdict + confidence + model metadata are retained
//   - matched_sku is retained (public product catalog)
//   - evaluation_id is retained (opaque identifier)
//   - mismatch_flags are retained (non-identifying rule output)
//   - listing_url is PSEUDONYMIZED (cross-packet HMAC); preserves pattern
//     analysis without exposing the specific URL to auditors
//   - consumer email / address / phone are NEVER included
//   - source is retained (enum value)

import type { Period } from '../types';
import type { CollectorRunCtx, SOC2Collector } from './types';
import {
  buildAttestation,
  collectorFileFromCsv,
  frozenTimer,
  periodParams,
  realTimer,
  toCsv,
  utf8,
} from './helpers';
import { pseudonymize } from '../redaction/pseudonymize';

const COLS = [
  'evaluation_id',
  'source',
  'verdict',
  'confidence',
  'matched_sku',
  'mismatch_flag_count',
  'human_review_required',
  'phi_redacted',
  'content_safety_skip',
  'model_version',
  'reference_corpus_version',
  'listing_url_pseudonym',
  'evaluated_at_day',
] as const;

const OUTPUT_PATH = 'CC4-monitoring-activities/counterfeit-determinations.csv';
const COLLECTOR_ID = 'counterfeit-determinations-collector';

interface DbRow {
  verdict: string;
  confidence: number;
  matched_sku: string | null;
  mismatch_flags: string[] | null;
  human_review_required: boolean;
  created_at: string;
  counterfeit_evaluations: {
    evaluation_id: string;
    source: string;
    source_reference: Record<string, unknown> | null;
    phi_redacted: boolean;
    content_safety_skip: boolean;
    model_version: string;
    reference_corpus_version: string;
    evaluated_at: string;
  };
}

export const counterfeitDeterminationsCollector: SOC2Collector = {
  id: COLLECTOR_ID,
  version: '1.0.0',
  dataSource: 'counterfeit_determinations + counterfeit_evaluations',
  controls: ['CC4.1', 'CC7.1', 'C1.1'],

  async collect(period: Period, ctx: CollectorCtxLike) {
    const timer = ctx.timer ?? realTimer();
    const startedAt = timer.now();

    const query = {
      table: 'counterfeit_determinations',
      columns: [
        'verdict', 'confidence', 'matched_sku', 'mismatch_flags', 'human_review_required',
        'created_at', 'evaluation_id',
        'counterfeit_evaluations(evaluation_id,source,source_reference,phi_redacted,content_safety_skip,model_version,reference_corpus_version,evaluated_at)',
      ],
      filters: [
        { column: 'created_at', op: 'gte' as const, value: period.start },
        { column: 'created_at', op: 'lte' as const, value: period.end },
      ],
      orderBy: [
        { column: 'created_at', ascending: true },
      ],
      sqlRepresentation:
        'SELECT d.verdict, d.confidence, d.matched_sku, d.mismatch_flags, d.human_review_required, d.created_at, e.evaluation_id, e.source, e.source_reference, e.phi_redacted, e.content_safety_skip, e.model_version, e.reference_corpus_version, e.evaluated_at FROM public.counterfeit_determinations d JOIN public.counterfeit_evaluations e ON e.id = d.evaluation_id WHERE d.created_at BETWEEN $1 AND $2 ORDER BY d.created_at ASC',
    };

    const rows = await ctx.fetch<DbRow>(query);

    // Pseudonymize listing URLs with a per-packet HMAC so cross-packet
    // correlation is impossible. Aggregate counts of mismatch flags rather
    // than expose the raw arrays (they never contain PII but aggregate is
    // sufficient for the CC4 monitoring control).
    const emitted = rows.map((r) => {
      const listingUrl = (r.counterfeit_evaluations?.source_reference as { listing_url?: string } | null | undefined)?.listing_url;
      const listingPseudonym = listingUrl
        ? pseudonymize({
            packetUuid: ctx.packetUuid,
            context: 'listing_url',
            realId: listingUrl,
            key: ctx.pseudonymKey,
          })
        : '';
      const dayISO = r.counterfeit_evaluations?.evaluated_at
        ? r.counterfeit_evaluations.evaluated_at.slice(0, 10)
        : '';
      return {
        evaluation_id: r.counterfeit_evaluations?.evaluation_id ?? '',
        source: r.counterfeit_evaluations?.source ?? '',
        verdict: r.verdict,
        confidence: Number(r.confidence).toFixed(2),
        matched_sku: r.matched_sku ?? '',
        mismatch_flag_count: (r.mismatch_flags ?? []).length,
        human_review_required: r.human_review_required,
        phi_redacted: r.counterfeit_evaluations?.phi_redacted ?? false,
        content_safety_skip: r.counterfeit_evaluations?.content_safety_skip ?? false,
        model_version: r.counterfeit_evaluations?.model_version ?? '',
        reference_corpus_version: r.counterfeit_evaluations?.reference_corpus_version ?? '',
        listing_url_pseudonym: listingPseudonym,
        evaluated_at_day: dayISO,
      };
    });

    const csv = toCsv(COLS as unknown as string[], emitted);
    const file = collectorFileFromCsv(OUTPUT_PATH, csv);

    return {
      files: [file],
      attestation: buildAttestation({
        collectorId: COLLECTOR_ID,
        collectorVersion: '1.0.0',
        dataSource: counterfeitDeterminationsCollector.dataSource,
        query,
        parameters: periodParams(period),
        rowCount: emitted.length,
        outputBytes: file.bytes ?? utf8(''),
        executedAt: startedAt,
        durationMs: timer.elapsedMs(),
      }),
    };
  },
};

type CollectorCtxLike = CollectorRunCtx & { timer?: ReturnType<typeof frozenTimer> };
