// Prompt #122 P4: GitHub PRs collector.
//
// CC8.1 (change management), CC8.2 (PR approvals, review evidence).
// Gated on soc2_collector_config — empty CSV when not yet configured.

import type { Period } from '../types';
import type { CollectorRunCtx, SOC2Collector } from './types';
import {
  buildAttestation,
  collectorFileFromCsv,
  frozenTimer,
  periodParams,
  realTimer,
  redactAndCsv,
  utf8,
} from './helpers';
import { buildDisabledOutput, loadCollectorConfig } from './external-helpers';

const COLS = [
  'id', 'repo', 'pr_number', 'title', 'author_login',
  'state', 'merged_at', 'closed_at', 'created_at',
  'approvers', 'review_count', 'checks_passed',
] as const;
const OUTPUT_PATH = 'CC8-change-management/github-prs.csv';
const COLLECTOR_ID = 'github-prs-collector';

export const githubPrsCollector: SOC2Collector = {
  id: COLLECTOR_ID,
  version: '1.0.0',
  dataSource: 'soc2_external_github_prs',
  controls: ['CC8.1', 'CC8.2'],

  async collect(period: Period, ctx: CollectorCtxLike) {
    const cfg = await loadCollectorConfig(COLLECTOR_ID, ctx.fetch);
    if (!cfg.enabled) {
      return buildDisabledOutput({
        collectorId: COLLECTOR_ID,
        collectorVersion: '1.0.0',
        dataSource: 'soc2_external_github_prs',
        headers: COLS,
        outputPath: OUTPUT_PATH,
        period,
        reason: cfg.notes ?? 'collector disabled',
        timer: ctx.timer,
      });
    }

    const timer = ctx.timer ?? realTimer();
    const startedAt = timer.now();

    const query = {
      table: 'soc2_external_github_prs',
      columns: COLS,
      filters: [
        { column: 'created_at', op: 'gte' as const, value: period.start },
        { column: 'created_at', op: 'lte' as const, value: period.end },
      ],
      orderBy: [
        { column: 'created_at', ascending: true },
        { column: 'id', ascending: true },
      ],
      sqlRepresentation:
        'SELECT id, repo, pr_number, title, author_login, state, merged_at, closed_at, created_at, approvers, review_count, checks_passed FROM public.soc2_external_github_prs WHERE created_at BETWEEN $1 AND $2 ORDER BY created_at ASC, id ASC',
    };

    const rows = await ctx.fetch<Record<string, unknown>>(query);
    const { csv, rowCount } = redactAndCsv('soc2_external_github_prs', COLS as unknown as string[], rows, ctx);

    const file = collectorFileFromCsv(OUTPUT_PATH, csv);

    return {
      files: [file],
      attestation: buildAttestation({
        collectorId: COLLECTOR_ID,
        collectorVersion: '1.0.0',
        dataSource: 'soc2_external_github_prs',
        query,
        parameters: periodParams(period),
        rowCount,
        outputBytes: file.bytes ?? utf8(''),
        executedAt: startedAt,
        durationMs: timer.elapsedMs(),
        nonDeterministicSources: ['github_api_scraper'],
      }),
    };
  },
};

type CollectorCtxLike = CollectorRunCtx & { timer?: ReturnType<typeof frozenTimer> };
