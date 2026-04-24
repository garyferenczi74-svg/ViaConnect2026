// Prompt #122 P3: pseudonymized user + role list. CC6.1.
//
// Snapshot of profiles as of period end. User identity stripped; only
// (pseudonym, role, creation-month-truncated) retained.

import type { Period } from '../types';
import type { CollectorRunCtx, SOC2Collector } from './types';
import { buildAttestation, collectorFileFromCsv, frozenTimer, periodParams, realTimer, redactAndCsv, utf8 } from './helpers';

const COLS = ['id', 'email', 'display_name', 'phone', 'role', 'created_at', 'updated_at'] as const;

export const usersRolesCollector: SOC2Collector = {
  id: 'users-roles-collector',
  version: '1.0.0',
  dataSource: 'profiles',
  controls: ['CC6.1'],

  async collect(period: Period, ctx: CollectorRunCtx & { timer?: ReturnType<typeof frozenTimer> }) {
    const timer = ctx.timer ?? realTimer();
    const startedAt = timer.now();

    const query = {
      table: 'profiles',
      columns: COLS,
      filters: [{ column: 'created_at', op: 'lte' as const, value: period.end }],
      orderBy: [{ column: 'id', ascending: true }],
      sqlRepresentation:
        'SELECT id, email, display_name, phone, role, created_at, updated_at FROM public.profiles WHERE created_at <= $1 ORDER BY id ASC',
    };

    const rows = await ctx.fetch<Record<string, unknown>>(query);
    const { csv, rowCount } = redactAndCsv('profiles', COLS as unknown as string[], rows, ctx);

    const file = collectorFileFromCsv('CC6-logical-access/user-access-list.csv', csv);
    return {
      files: [file],
      attestation: buildAttestation({
        collectorId: usersRolesCollector.id,
        collectorVersion: usersRolesCollector.version,
        dataSource: usersRolesCollector.dataSource,
        query, parameters: [period.end], rowCount,
        outputBytes: file.bytes ?? utf8(''),
        executedAt: startedAt, durationMs: timer.elapsedMs(),
      }),
    };
  },
};

void periodParams;
