// Prompt #122 P3: RLS policy snapshot. CC6.1, C1.1.
//
// Reads pg_policies (exposed via supabase .from('pg_policies')) for every
// public table and serializes each policy's SQL. No PHI involved; the policy
// SQL itself is the evidence.

import type { Period } from '../types';
import type { CollectorRunCtx, SOC2Collector } from './types';
import { buildAttestation, collectorFileFromJson, frozenTimer, periodParams, realTimer, utf8 } from './helpers';

const COLS = ['schemaname', 'tablename', 'policyname', 'permissive', 'roles', 'cmd', 'qual', 'with_check'] as const;

export const rlsPoliciesCollector: SOC2Collector = {
  id: 'rls-policies-collector',
  version: '1.0.0',
  dataSource: 'pg_policies',
  controls: ['CC6.1', 'C1.1'],

  async collect(period: Period, ctx: CollectorRunCtx & { timer?: ReturnType<typeof frozenTimer> }) {
    const timer = ctx.timer ?? realTimer();
    const startedAt = timer.now();

    const query = {
      table: 'pg_policies',
      columns: COLS,
      filters: [{ column: 'schemaname', op: 'eq' as const, value: 'public' }],
      orderBy: [
        { column: 'tablename', ascending: true },
        { column: 'policyname', ascending: true },
      ],
      sqlRepresentation:
        "SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname='public' ORDER BY tablename ASC, policyname ASC",
    };

    const rows = await ctx.fetch<Record<string, unknown>>(query);
    const snapshot = { period, policies: rows };
    const file = collectorFileFromJson('CC6-logical-access/rls-policies-audit.json', snapshot);

    return {
      files: [file],
      attestation: buildAttestation({
        collectorId: rlsPoliciesCollector.id,
        collectorVersion: rlsPoliciesCollector.version,
        dataSource: rlsPoliciesCollector.dataSource,
        query, parameters: periodParams(period), rowCount: rows.length,
        outputBytes: file.bytes ?? utf8(''),
        executedAt: startedAt, durationMs: timer.elapsedMs(),
      }),
    };
  },
};
