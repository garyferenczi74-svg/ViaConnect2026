// Prompt #122 P3: Supabase migrations applied during period. CC8.1.

import type { Period } from '../types';
import type { CollectorRunCtx, SOC2Collector } from './types';
import { buildAttestation, collectorFileFromCsv, frozenTimer, periodParams, realTimer, toCsv, utf8 } from './helpers';

const COLS = ['version', 'name'] as const;

export const migrationsCollector: SOC2Collector = {
  id: 'migrations-collector',
  version: '1.0.0',
  dataSource: 'supabase_migrations.schema_migrations',
  controls: ['CC8.1'],

  async collect(period: Period, ctx: CollectorRunCtx & { timer?: ReturnType<typeof frozenTimer> }) {
    const timer = ctx.timer ?? realTimer();
    const startedAt = timer.now();

    // Migration version is a YYYYMMDDHHMMSS string; filter by lexicographic
    // comparison against period-start and period-end collapsed to versions.
    const startVersion = period.start.replace(/[^0-9]/g, '').slice(0, 14);
    const endVersion = period.end.replace(/[^0-9]/g, '').slice(0, 14);

    const query = {
      table: 'supabase_migrations.schema_migrations',
      columns: COLS,
      filters: [
        { column: 'version', op: 'gte' as const, value: startVersion },
        { column: 'version', op: 'lte' as const, value: endVersion },
      ],
      orderBy: [{ column: 'version', ascending: true }],
      sqlRepresentation:
        'SELECT version, name FROM supabase_migrations.schema_migrations WHERE version BETWEEN $1 AND $2 ORDER BY version ASC',
    };

    const rows = await ctx.fetch<Record<string, unknown>>(query);
    // No redaction needed — migration version/name is non-PHI.
    const csv = toCsv(COLS as unknown as string[], rows);
    const file = collectorFileFromCsv('CC8-change-management/migration-history.csv', csv);

    return {
      files: [file],
      attestation: buildAttestation({
        collectorId: migrationsCollector.id,
        collectorVersion: migrationsCollector.version,
        dataSource: migrationsCollector.dataSource,
        query, parameters: [startVersion, endVersion], rowCount: rows.length,
        outputBytes: file.bytes ?? utf8(''),
        executedAt: startedAt, durationMs: timer.elapsedMs(),
      }),
    };
  },
};

// Keep periodParams reachable if future revision switches to date-based filter.
void periodParams;
