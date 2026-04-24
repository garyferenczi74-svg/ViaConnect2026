// Prompt #127 P3: HIPAA workforce training collector.
//
// Emits a pseudonymized CSV of training completion records for the period.
// workforce_member_pseudonym is already HMAC'd at insert time by Steve's
// ingestion workflow; the collector passes it through without re-hashing.
// Serves 45 CFR 164.308(a)(5) Security Awareness and Training.

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
  'workforce_member_pseudonym', 'training_module', 'completion_date',
  'expiry_date', 'score_percent',
] as const;

const OUTPUT_PATH = 'administrative-safeguards/164-308-a-5-security-awareness-training/hipaa-workforce-training.csv';
const COLLECTOR_ID = 'hipaa-workforce-training-collector';

interface DbRow {
  workforce_member_pseudonym: string;
  training_module: string;
  completion_date: string;
  expiry_date: string | null;
  score_percent: number | null;
}

export const hipaaWorkforceTrainingCollector: SOC2Collector = {
  id: COLLECTOR_ID,
  version: '1.0.0',
  dataSource: 'hipaa_workforce_training',
  controls: ['164.308(a)(5)(i)', '164.308(a)(5)(ii)(A)', '164.308(a)(5)(ii)(B)', '164.308(a)(5)(ii)(C)', '164.308(a)(5)(ii)(D)'],

  async collect(period: Period, ctx: CollectorCtxLike) {
    const timer = ctx.timer ?? realTimer();
    const startedAt = timer.now();

    const query = {
      table: 'hipaa_workforce_training',
      columns: [
        'workforce_member_pseudonym', 'training_module', 'completion_date',
        'expiry_date', 'score_percent',
      ],
      filters: [
        { column: 'completion_date', op: 'gte' as const, value: period.start.slice(0, 10) },
        { column: 'completion_date', op: 'lte' as const, value: period.end.slice(0, 10) },
      ],
      orderBy: [
        { column: 'completion_date', ascending: true },
        { column: 'workforce_member_pseudonym', ascending: true },
      ],
      sqlRepresentation:
        'SELECT workforce_member_pseudonym, training_module, completion_date, expiry_date, score_percent FROM public.hipaa_workforce_training WHERE completion_date BETWEEN $1 AND $2 ORDER BY completion_date ASC, workforce_member_pseudonym ASC',
    };

    const rows = await ctx.fetch<DbRow>(query);
    const emitted = rows.map((r) => ({
      workforce_member_pseudonym: r.workforce_member_pseudonym,
      training_module: r.training_module,
      completion_date: r.completion_date,
      expiry_date: r.expiry_date ?? '',
      score_percent: r.score_percent ?? '',
    }));

    const csv = toCsv(COLS as unknown as string[], emitted);
    const file = collectorFileFromCsv(OUTPUT_PATH, csv);

    return {
      files: [file],
      attestation: buildAttestation({
        collectorId: COLLECTOR_ID,
        collectorVersion: '1.0.0',
        dataSource: hipaaWorkforceTrainingCollector.dataSource,
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
