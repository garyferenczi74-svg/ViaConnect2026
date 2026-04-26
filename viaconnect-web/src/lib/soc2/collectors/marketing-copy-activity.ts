// Prompt #138a Phase 6: SOC 2 marketing-copy activity collector.
//
// Emits a pseudonymized CSV of marketing_copy_variant_events for the period,
// joined with marketing_copy_variants for slot_id + framing context.
// Supports Trust Services Criteria:
//   CC4 (monitoring) — variant lifecycle gates are observed in audit
//   CC7 (system operations) — operational pipeline produces immutable
//                             append-only audit trail
//
// PII / data-handling rules:
//   - event_id, variant_id, slot_id, framing, surface, event_kind:
//     retained as-is (operational identifiers + enum values, not PII)
//   - actor_user_id is PSEUDONYMIZED via per-packet HMAC; auditors can see
//     "user X performed N actions" within a packet but cannot correlate the
//     same user across quarterly packets
//   - event_detail JSONB is summarized to scalar booleans + counts; the
//     free-text Steve approval notes / revocation reasons are NEVER
//     included because they may quote the variant copy
//   - occurred_at is rendered as ISO date (day-only) to avoid timing
//     fingerprinting; the precise timestamp stays in the source table

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
  'event_id',
  'variant_id',
  'slot_id',
  'surface',
  'framing',
  'event_kind',
  'precheck_passed',
  'precheck_blocker_count',
  'precheck_warn_count',
  'has_actor',
  'actor_pseudonym',
  'occurred_at_day',
] as const;

const OUTPUT_PATH = 'CC4-monitoring-activities/marketing-copy-activity.csv';
const COLLECTOR_ID = 'marketing-copy-activity-collector';

interface DbRow {
  id: string;
  variant_id: string;
  event_kind: string;
  event_detail: Record<string, unknown> | null;
  actor_user_id: string | null;
  occurred_at: string;
  marketing_copy_variants: {
    slot_id: string;
    surface: string;
    framing: string;
  } | null;
}

type CollectorCtxLike = CollectorRunCtx & { timer?: ReturnType<typeof frozenTimer> };

export const marketingCopyActivityCollector: SOC2Collector = {
  id: COLLECTOR_ID,
  version: '1.0.0',
  dataSource: 'marketing_copy_variant_events + marketing_copy_variants',
  controls: ['CC4.1', 'CC7.1'],

  async collect(period: Period, ctx: CollectorCtxLike) {
    const timer = ctx.timer ?? realTimer();
    const startedAt = timer.now();

    const query = {
      table: 'marketing_copy_variant_events',
      columns: [
        'id', 'variant_id', 'event_kind', 'event_detail', 'actor_user_id', 'occurred_at',
        'marketing_copy_variants(slot_id,surface,framing)',
      ],
      filters: [
        { column: 'occurred_at', op: 'gte' as const, value: period.start },
        { column: 'occurred_at', op: 'lte' as const, value: period.end },
      ],
      orderBy: [
        { column: 'occurred_at', ascending: true },
        { column: 'id', ascending: true },
      ],
      sqlRepresentation:
        'SELECT e.id, e.variant_id, e.event_kind, e.event_detail, e.actor_user_id, e.occurred_at, v.slot_id, v.surface, v.framing FROM public.marketing_copy_variant_events e JOIN public.marketing_copy_variants v ON v.id = e.variant_id WHERE e.occurred_at BETWEEN $1 AND $2 ORDER BY e.occurred_at ASC, e.id ASC',
    };

    const rows = await ctx.fetch<DbRow>(query);

    const emitted = rows.map((r) => {
      const detail = r.event_detail ?? {};
      const precheckPassed = typeof detail.passed === 'boolean' ? detail.passed : null;
      const blockerCount = typeof detail.blocker_count === 'number' ? detail.blocker_count : null;
      const warnCount = typeof detail.warn_count === 'number' ? detail.warn_count : null;

      const actorPseudonym = r.actor_user_id
        ? pseudonymize({
            packetUuid: ctx.packetUuid,
            context: 'marketing_copy_actor',
            realId: r.actor_user_id,
            key: ctx.pseudonymKey,
          })
        : '';

      return {
        event_id: r.id,
        variant_id: r.variant_id,
        slot_id: r.marketing_copy_variants?.slot_id ?? '',
        surface: r.marketing_copy_variants?.surface ?? '',
        framing: r.marketing_copy_variants?.framing ?? '',
        event_kind: r.event_kind,
        precheck_passed: precheckPassed === null ? '' : precheckPassed,
        precheck_blocker_count: blockerCount === null ? '' : blockerCount,
        precheck_warn_count: warnCount === null ? '' : warnCount,
        has_actor: r.actor_user_id !== null,
        actor_pseudonym: actorPseudonym,
        occurred_at_day: r.occurred_at.slice(0, 10),
      };
    });

    const csv = toCsv(COLS as unknown as string[], emitted);
    const file = collectorFileFromCsv(OUTPUT_PATH, csv);

    return {
      files: [file],
      attestation: buildAttestation({
        collectorId: COLLECTOR_ID,
        collectorVersion: '1.0.0',
        dataSource: marketingCopyActivityCollector.dataSource,
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
