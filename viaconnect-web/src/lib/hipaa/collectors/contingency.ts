// Prompt #127 P3: HIPAA contingency plan test collector.
// Serves 45 CFR 164.308(a)(7) Contingency Plan, specifically (ii)(D) Testing
// and Revision Procedures.

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
  'test_date', 'test_kind', 'scope', 'outcome_summary',
  'corrective_actions_count',
] as const;

const OUTPUT_PATH = 'administrative-safeguards/164-308-a-7-contingency-plan/hipaa-contingency-plan-tests.csv';
const COLLECTOR_ID = 'hipaa-contingency-plan-test-collector';

interface DbRow {
  test_date: string;
  test_kind: string;
  scope: string;
  outcome_summary: string;
  corrective_actions: unknown;
}

export const hipaaContingencyPlanTestCollector: SOC2Collector = {
  id: COLLECTOR_ID,
  version: '1.0.0',
  dataSource: 'hipaa_contingency_plan_tests',
  controls: ['164.308(a)(7)(ii)(B)', '164.308(a)(7)(ii)(C)', '164.308(a)(7)(ii)(D)'],

  async collect(period: Period, ctx: CollectorCtxLike) {
    const timer = ctx.timer ?? realTimer();
    const startedAt = timer.now();

    const query = {
      table: 'hipaa_contingency_plan_tests',
      columns: ['test_date', 'test_kind', 'scope', 'outcome_summary', 'corrective_actions'],
      filters: [
        { column: 'test_date', op: 'gte' as const, value: period.start.slice(0, 10) },
        { column: 'test_date', op: 'lte' as const, value: period.end.slice(0, 10) },
      ],
      orderBy: [
        { column: 'test_date', ascending: true },
        { column: 'test_kind', ascending: true },
      ],
      sqlRepresentation:
        'SELECT test_date, test_kind, scope, outcome_summary, corrective_actions FROM public.hipaa_contingency_plan_tests WHERE test_date BETWEEN $1 AND $2 ORDER BY test_date ASC, test_kind ASC',
    };

    const rows = await ctx.fetch<DbRow>(query);
    const emitted = rows.map((r) => ({
      test_date: r.test_date,
      test_kind: r.test_kind,
      scope: r.scope,
      outcome_summary: r.outcome_summary,
      corrective_actions_count: Array.isArray(r.corrective_actions) ? r.corrective_actions.length : 0,
    }));

    const csv = toCsv(COLS as unknown as string[], emitted);
    const file = collectorFileFromCsv(OUTPUT_PATH, csv);

    return {
      files: [file],
      attestation: buildAttestation({
        collectorId: COLLECTOR_ID,
        collectorVersion: '1.0.0',
        dataSource: hipaaContingencyPlanTestCollector.dataSource,
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
