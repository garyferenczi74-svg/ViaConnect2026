// Prompt #122 P3: marshall-audit-chain collector.
//
// CC4.3 (monitoring effectiveness), CC7.5 (evidence integrity). Produces a
// hash-chain verification report for the period: full row count, prev_hash /
// row_hash pairs for the period edges, and a boolean `chain_intact` signal.

import type { Period } from '../types';
import type { CollectorRunCtx, SOC2Collector } from './types';
import {
  buildAttestation, collectorFileFromJson, frozenTimer, periodParams,
  realTimer,
} from './helpers';
import { redactRows } from '../redaction/redact';
import { utf8, sha256Hex } from './helpers';

const COLS = ['id', 'event_type', 'actor_type', 'actor_id', 'payload', 'prev_hash', 'row_hash', 'created_at'] as const;

export const marshallAuditChainCollector: SOC2Collector = {
  id: 'marshall-audit-chain-collector',
  version: '1.0.0',
  dataSource: 'compliance_audit_log',
  controls: ['CC4.3', 'CC7.5'],

  async collect(period: Period, ctx: CollectorRunCtx & { timer?: ReturnType<typeof frozenTimer> }) {
    const timer = ctx.timer ?? realTimer();
    const startedAt = timer.now();

    const query = {
      table: 'compliance_audit_log',
      columns: COLS,
      filters: [
        { column: 'created_at', op: 'gte' as const, value: period.start },
        { column: 'created_at', op: 'lte' as const, value: period.end },
      ],
      orderBy: [{ column: 'id', ascending: true }],
      sqlRepresentation:
        'SELECT id, event_type, actor_type, actor_id, payload, prev_hash, row_hash, created_at FROM public.compliance_audit_log WHERE created_at BETWEEN $1 AND $2 ORDER BY id ASC',
    };

    const rows = await ctx.fetch<Record<string, unknown>>(query);

    // Redact first so nothing sensitive enters the report.
    const redacted = redactRows('compliance_audit_log', rows, {
      packetUuid: ctx.packetUuid,
      pseudonymKey: ctx.pseudonymKey,
    });

    // Verify chain integrity in the collector itself. If a link is broken,
    // the report still ships — it just flags the breach. Auditors expect to
    // see the evidence either way.
    let chainIntact = true;
    let firstBadRow: unknown = null;
    for (let i = 1; i < redacted.length; i++) {
      const prev = redacted[i - 1];
      const curr = redacted[i];
      if (curr.prev_hash !== prev.row_hash) {
        chainIntact = false;
        firstBadRow = curr.id;
        break;
      }
    }

    const summary = {
      period,
      total_rows_in_period: redacted.length,
      chain_intact: chainIntact,
      first_bad_row: firstBadRow,
      period_first_row_hash: redacted[0]?.row_hash ?? null,
      period_last_row_hash: redacted.at(-1)?.row_hash ?? null,
    };
    const file = collectorFileFromJson(
      'CC4-monitoring-activities/audit-log-chain-verification.json',
      summary,
    );

    return {
      files: [file],
      attestation: buildAttestation({
        collectorId: marshallAuditChainCollector.id,
        collectorVersion: marshallAuditChainCollector.version,
        dataSource: marshallAuditChainCollector.dataSource,
        query,
        parameters: periodParams(period),
        rowCount: redacted.length,
        outputBytes: file.bytes ?? utf8(''),
        executedAt: startedAt,
        durationMs: timer.elapsedMs(),
      }),
    };
  },
};

// unused re-exports kept for clarity + dead-code elimination safety
void sha256Hex;
