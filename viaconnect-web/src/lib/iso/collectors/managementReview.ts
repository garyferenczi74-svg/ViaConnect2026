// Prompt #127 P5: ISO 27001 management review collector (Clause 9.3).
//
// Signer identity is pseudonymized with the per-packet HMAC key so
// cross-packet identity correlation remains cryptographically infeasible.

import { pseudonymize } from '@/lib/soc2/redaction/pseudonymize';
import type { Period } from '@/lib/soc2/types';
import type { CollectorRunCtx, SOC2Collector } from '@/lib/soc2/collectors/types';
import {
  buildAttestation,
  collectorFileFromCsv,
  frozenTimer,
  periodParams,
  realTimer,
  toCsv,
  utf8,
} from '@/lib/soc2/collectors/helpers';

const COLS = [
  'review_date', 'attendees_length', 'inputs_summary_length',
  'decisions_count', 'action_items_count',
  'minutes_attached', 'signed_off_by_pseudonym', 'signed_off_at_day',
] as const;

const OUTPUT_PATH = 'isms-clauses/clause-9-performance-evaluation/iso-management-reviews.csv';
const COLLECTOR_ID = 'iso-management-review-collector';

interface DbRow {
  review_date: string;
  attendees: string;
  inputs_summary: string;
  decisions: unknown[] | null;
  action_items: unknown[] | null;
  storage_key: string | null;
  signed_off_by: string | null;
  signed_off_at: string | null;
}

export const isoManagementReviewCollector: SOC2Collector = {
  id: COLLECTOR_ID,
  version: '1.0.0',
  dataSource: 'iso_management_reviews',
  controls: ['Clause 5.1', 'Clause 9.3'],

  async collect(period: Period, ctx: CollectorCtxLike) {
    const timer = ctx.timer ?? realTimer();
    const startedAt = timer.now();

    const query = {
      table: 'iso_management_reviews',
      columns: ['review_date', 'attendees', 'inputs_summary', 'decisions', 'action_items',
        'storage_key', 'signed_off_by', 'signed_off_at'],
      filters: [
        { column: 'review_date', op: 'gte' as const, value: period.start.slice(0, 10) },
        { column: 'review_date', op: 'lte' as const, value: period.end.slice(0, 10) },
      ],
      orderBy: [{ column: 'review_date', ascending: true }],
      sqlRepresentation:
        'SELECT review_date, attendees, inputs_summary, decisions, action_items, storage_key, signed_off_by, signed_off_at FROM public.iso_management_reviews WHERE review_date BETWEEN $1 AND $2 ORDER BY review_date ASC',
    };

    const rows = await ctx.fetch<DbRow>(query);
    const emitted = rows.map((r) => ({
      review_date: r.review_date,
      attendees_length: (r.attendees ?? '').length,
      inputs_summary_length: (r.inputs_summary ?? '').length,
      decisions_count: Array.isArray(r.decisions) ? r.decisions.length : 0,
      action_items_count: Array.isArray(r.action_items) ? r.action_items.length : 0,
      minutes_attached: r.storage_key ? 'yes' : 'no',
      signed_off_by_pseudonym: r.signed_off_by
        ? pseudonymize({ packetUuid: ctx.packetUuid, context: 'user', realId: r.signed_off_by, key: ctx.pseudonymKey })
        : '',
      signed_off_at_day: r.signed_off_at ? r.signed_off_at.slice(0, 10) : '',
    }));

    const csv = toCsv(COLS as unknown as string[], emitted);
    const file = collectorFileFromCsv(OUTPUT_PATH, csv);

    return {
      files: [file],
      attestation: buildAttestation({
        collectorId: COLLECTOR_ID,
        collectorVersion: '1.0.0',
        dataSource: isoManagementReviewCollector.dataSource,
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
