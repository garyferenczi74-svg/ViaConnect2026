// Prompt #127 P3: HIPAA emergency access invocations collector.
//
// Serves 45 CFR 164.312(a)(2)(ii) Emergency Access Procedure.
// invoked_by and reviewed_by are pseudonymized with the per-packet HMAC
// key so cross-packet correlation is cryptographically impossible.

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
  'invoked_at_day',
  'invoked_by_pseudonym',
  'justification_length',
  'scope_of_access',
  'reviewed_by_pseudonym',
  'reviewed_at_day',
  'closed_at_day',
] as const;

const OUTPUT_PATH = 'technical-safeguards/164-312-a-access-control/hipaa-emergency-access.csv';
const COLLECTOR_ID = 'hipaa-emergency-access-collector';

interface DbRow {
  invoked_at: string;
  invoked_by: string;
  justification: string;
  scope_of_access: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  closed_at: string | null;
}

export const hipaaEmergencyAccessCollector: SOC2Collector = {
  id: COLLECTOR_ID,
  version: '1.0.0',
  dataSource: 'hipaa_emergency_access_invocations',
  controls: ['164.312(a)(2)(ii)'],

  async collect(period: Period, ctx: CollectorCtxLike) {
    const timer = ctx.timer ?? realTimer();
    const startedAt = timer.now();

    const query = {
      table: 'hipaa_emergency_access_invocations',
      columns: ['invoked_at', 'invoked_by', 'justification', 'scope_of_access', 'reviewed_by', 'reviewed_at', 'closed_at'],
      filters: [
        { column: 'invoked_at', op: 'gte' as const, value: period.start },
        { column: 'invoked_at', op: 'lte' as const, value: period.end },
      ],
      orderBy: [{ column: 'invoked_at', ascending: true }],
      sqlRepresentation:
        'SELECT invoked_at, invoked_by, justification, scope_of_access, reviewed_by, reviewed_at, closed_at FROM public.hipaa_emergency_access_invocations WHERE invoked_at BETWEEN $1 AND $2 ORDER BY invoked_at ASC',
    };

    const rows = await ctx.fetch<DbRow>(query);
    const emitted = rows.map((r) => ({
      invoked_at_day: r.invoked_at.slice(0, 10),
      invoked_by_pseudonym: pseudonymize({
        packetUuid: ctx.packetUuid,
        context: 'user',
        realId: r.invoked_by,
        key: ctx.pseudonymKey,
      }),
      justification_length: (r.justification ?? '').length,
      scope_of_access: r.scope_of_access,
      reviewed_by_pseudonym: r.reviewed_by
        ? pseudonymize({ packetUuid: ctx.packetUuid, context: 'user', realId: r.reviewed_by, key: ctx.pseudonymKey })
        : '',
      reviewed_at_day: r.reviewed_at ? r.reviewed_at.slice(0, 10) : '',
      closed_at_day: r.closed_at ? r.closed_at.slice(0, 10) : '',
    }));

    const csv = toCsv(COLS as unknown as string[], emitted);
    const file = collectorFileFromCsv(OUTPUT_PATH, csv);

    return {
      files: [file],
      attestation: buildAttestation({
        collectorId: COLLECTOR_ID,
        collectorVersion: '1.0.0',
        dataSource: hipaaEmergencyAccessCollector.dataSource,
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
