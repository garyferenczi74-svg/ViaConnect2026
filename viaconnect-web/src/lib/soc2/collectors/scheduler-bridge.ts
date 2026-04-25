// Prompt #125 P10: scheduler-bridge SOC 2 collector.
//
// Produces a pseudonymized CSV aggregating scheduler_scans outcomes
// over the packet period. Surfaces connection counts by platform,
// decision distribution, interception success rate, override rate
// and pattern-flag count, and fail-closed event count. Evidence
// supports:
//   CC4 (monitoring)
//   CC5 (control activities)
//   CC7 (system operations)
//   P5 (preventative user notice prior to publication)
//   P6 (practitioner choice to override with consequences)
//
// Draft plaintext never lands in a persisted row anywhere; the
// collector already works with the content_hash_sha256 + decision +
// findings_summary (counts) shape enforced by the P1 schema.

import type { Period } from '../types';
import type { CollectorRunCtx, SOC2Collector } from './types';
import { buildAttestation, collectorFileFromCsv, frozenTimer, periodParams, realTimer, utf8 } from './helpers';

interface ScanAggregateRow {
  platform: string;
  decision: string;
  count: number;
  distinct_practitioners: number;
}

interface RawScan {
  connection_id: string;
  practitioner_id: string;
  decision: string;
  platform?: string;
}

interface RawInterception {
  platform: string;
  succeeded: boolean | null;
}

interface RawOverride {
  platform?: string;
  pattern_flag_triggered: boolean;
}

export const schedulerBridgeCollector: SOC2Collector = {
  id: 'scheduler-bridge-collector',
  version: '1.0.0',
  dataSource: 'scheduler_scans',
  controls: ['CC4.1', 'CC5.2', 'CC7.3', 'P5.1', 'P6.1'],

  async collect(period: Period, ctx: CollectorRunCtx & { timer?: ReturnType<typeof frozenTimer> }) {
    const timer = ctx.timer ?? realTimer();
    const startedAt = timer.now();

    // 1. Scans over the period, joined to connection to get platform.
    const scansQuery = {
      table: 'scheduler_scans',
      columns: ['connection_id', 'practitioner_id', 'decision', 'platform'] as const,
      filters: [
        { column: 'scanned_at', op: 'gte' as const, value: period.start },
        { column: 'scanned_at', op: 'lte' as const, value: period.end },
      ],
      orderBy: [{ column: 'scanned_at', ascending: true }],
      sqlRepresentation:
        'SELECT s.connection_id, s.practitioner_id, s.decision, c.platform '
        + 'FROM public.scheduler_scans s '
        + 'JOIN public.scheduler_connections c ON c.id = s.connection_id '
        + 'WHERE s.scanned_at BETWEEN $1 AND $2',
    };
    const scans = await ctx.fetch<RawScan>(scansQuery);

    // 2. Interceptions over the period.
    const interceptionsQuery = {
      table: 'scheduler_interceptions',
      columns: ['platform', 'succeeded'] as const,
      filters: [
        { column: 'attempted_at', op: 'gte' as const, value: period.start },
        { column: 'attempted_at', op: 'lte' as const, value: period.end },
      ],
      orderBy: [{ column: 'attempted_at', ascending: true }],
      sqlRepresentation:
        'SELECT platform, succeeded FROM public.scheduler_interceptions WHERE attempted_at BETWEEN $1 AND $2',
    };
    const interceptions = await ctx.fetch<RawInterception>(interceptionsQuery);

    // 3. Overrides over the period. Practitioner ID is pseudonymized at
    // the packet-key level in #122 redaction so we just count here.
    const overridesQuery = {
      table: 'scheduler_overrides',
      columns: ['platform', 'pattern_flag_triggered'] as const,
      filters: [
        { column: 'signed_at', op: 'gte' as const, value: period.start },
        { column: 'signed_at', op: 'lte' as const, value: period.end },
      ],
      orderBy: [{ column: 'signed_at', ascending: true }],
      sqlRepresentation:
        'SELECT COALESCE(c.platform, \'unknown\') AS platform, o.pattern_flag_triggered '
        + 'FROM public.scheduler_overrides o '
        + 'LEFT JOIN public.scheduler_scans s ON s.id = o.scan_id '
        + 'LEFT JOIN public.scheduler_connections c ON c.id = s.connection_id '
        + 'WHERE o.signed_at BETWEEN $1 AND $2',
    };
    const overrides = await ctx.fetch<RawOverride>(overridesQuery);

    // 4. Active connections snapshot at period end.
    const connectionsQuery = {
      table: 'scheduler_connections',
      columns: ['platform', 'active'] as const,
      filters: [
        { column: 'connected_at', op: 'lte' as const, value: period.end },
      ],
      orderBy: [{ column: 'connected_at', ascending: true }],
      sqlRepresentation:
        'SELECT platform, active FROM public.scheduler_connections WHERE connected_at <= $1',
    };
    const connections = await ctx.fetch<{ platform: string; active: boolean }>(connectionsQuery);

    // Aggregate by (platform, decision).
    const aggKey = (p: string, d: string) => `${p}|${d}`;
    const aggCounts = new Map<string, number>();
    const aggPractitioners = new Map<string, Set<string>>();
    for (const row of scans) {
      const platform = row.platform ?? 'unknown';
      const key = aggKey(platform, row.decision);
      aggCounts.set(key, (aggCounts.get(key) ?? 0) + 1);
      const set = aggPractitioners.get(key) ?? new Set<string>();
      set.add(row.practitioner_id);
      aggPractitioners.set(key, set);
    }

    const aggregateRows: ScanAggregateRow[] = Array.from(aggCounts.entries())
      .map(([key, count]) => {
        const [platform, decision] = key.split('|');
        return {
          platform,
          decision,
          count,
          distinct_practitioners: (aggPractitioners.get(key) ?? new Set()).size,
        };
      })
      .sort((a, b) =>
        a.platform.localeCompare(b.platform) || a.decision.localeCompare(b.decision),
      );

    // Interception success by platform.
    const interceptStats = new Map<string, { attempted: number; succeeded: number }>();
    for (const row of interceptions) {
      const cur = interceptStats.get(row.platform) ?? { attempted: 0, succeeded: 0 };
      cur.attempted += 1;
      if (row.succeeded === true) cur.succeeded += 1;
      interceptStats.set(row.platform, cur);
    }

    // Override stats.
    const overrideStats = new Map<string, { total: number; patternFlagged: number }>();
    for (const row of overrides) {
      const p = row.platform ?? 'unknown';
      const cur = overrideStats.get(p) ?? { total: 0, patternFlagged: 0 };
      cur.total += 1;
      if (row.pattern_flag_triggered) cur.patternFlagged += 1;
      overrideStats.set(p, cur);
    }

    // Active connection snapshot.
    const connStats = new Map<string, { active: number; inactive: number }>();
    for (const row of connections) {
      const cur = connStats.get(row.platform) ?? { active: 0, inactive: 0 };
      if (row.active) cur.active += 1;
      else cur.inactive += 1;
      connStats.set(row.platform, cur);
    }

    // Fail-closed count (across all platforms).
    const failClosedTotal = scans.filter((s) => s.decision === 'fail_closed').length;

    // ── CSV assembly ────────────────────────────────────────────────
    const lines: string[] = [];
    lines.push('section,platform,metric,value,distinct_practitioners');
    for (const row of aggregateRows) {
      lines.push(`scans,${row.platform},decision.${row.decision},${row.count},${row.distinct_practitioners}`);
    }
    for (const [platform, stats] of Array.from(interceptStats.entries()).sort()) {
      lines.push(`interceptions,${platform},attempted,${stats.attempted},`);
      lines.push(`interceptions,${platform},succeeded,${stats.succeeded},`);
    }
    for (const [platform, stats] of Array.from(overrideStats.entries()).sort()) {
      lines.push(`overrides,${platform},total,${stats.total},`);
      lines.push(`overrides,${platform},pattern_flagged,${stats.patternFlagged},`);
    }
    for (const [platform, stats] of Array.from(connStats.entries()).sort()) {
      lines.push(`connections,${platform},active,${stats.active},`);
      lines.push(`connections,${platform},inactive,${stats.inactive},`);
    }
    lines.push(`summary,all,fail_closed_total,${failClosedTotal},`);
    lines.push(`summary,all,scan_total,${scans.length},`);

    const csv = lines.join('\n') + '\n';
    const file = collectorFileFromCsv('scheduler-bridge/aggregate.csv', csv);

    return {
      files: [file],
      attestation: buildAttestation({
        collectorId: 'scheduler-bridge-collector',
        collectorVersion: '1.0.0',
        dataSource: schedulerBridgeCollector.dataSource,
        query: scansQuery,
        parameters: periodParams(period),
        rowCount: scans.length + interceptions.length + overrides.length + connections.length,
        outputBytes: file.bytes ?? utf8(''),
        executedAt: startedAt,
        durationMs: timer.elapsedMs(),
      }),
    };
  },
};
