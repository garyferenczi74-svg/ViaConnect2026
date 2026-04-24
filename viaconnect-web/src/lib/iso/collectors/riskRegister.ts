// Prompt #127 P5: ISO 27001 risk register collector.
//
// Serves ISMS Clause 6.1 (risk-based planning), 8.2 (risk assessment),
// and 8.3 (risk treatment). Owner is pseudonymized with the per-packet
// HMAC key so cross-packet correlation of internal accountability is
// cryptographically impossible.

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
  'risk_ref', 'threat_length', 'vulnerability_length', 'likelihood', 'impact', 'inherent_risk',
  'treatment_option', 'residual_likelihood', 'residual_impact', 'residual_risk',
  'status', 'identified_at', 'next_review_date', 'owner_pseudonym',
] as const;

const OUTPUT_PATH = 'risk-management/iso-risk-register.csv';
const COLLECTOR_ID = 'iso-risk-register-collector';

interface DbRow {
  risk_ref: string;
  threat: string;
  vulnerability: string;
  likelihood: number;
  impact: number;
  inherent_risk: number;
  treatment_option: string;
  residual_likelihood: number | null;
  residual_impact: number | null;
  residual_risk: number | null;
  status: string;
  identified_at: string;
  next_review_date: string | null;
  owner: string | null;
}

export const isoRiskRegisterCollector: SOC2Collector = {
  id: COLLECTOR_ID,
  version: '1.0.0',
  dataSource: 'iso_risk_register',
  controls: ['Clause 6.1', 'Clause 8.2', 'Clause 8.3'],

  async collect(period: Period, ctx: CollectorCtxLike) {
    const timer = ctx.timer ?? realTimer();
    const startedAt = timer.now();

    const query = {
      table: 'iso_risk_register',
      columns: ['risk_ref', 'threat', 'vulnerability', 'likelihood', 'impact', 'inherent_risk',
        'treatment_option', 'residual_likelihood', 'residual_impact', 'residual_risk',
        'status', 'identified_at', 'next_review_date', 'owner'],
      filters: [
        { column: 'identified_at', op: 'lte' as const, value: period.end.slice(0, 10) },
      ],
      orderBy: [
        { column: 'identified_at', ascending: true },
        { column: 'risk_ref', ascending: true },
      ],
      sqlRepresentation:
        'SELECT risk_ref, threat, vulnerability, likelihood, impact, inherent_risk, treatment_option, residual_likelihood, residual_impact, residual_risk, status, identified_at, next_review_date, owner FROM public.iso_risk_register WHERE identified_at <= $1 ORDER BY identified_at ASC, risk_ref ASC',
    };

    const rows = await ctx.fetch<DbRow>(query);
    const emitted = rows.map((r) => ({
      risk_ref: r.risk_ref,
      threat_length: (r.threat ?? '').length,
      vulnerability_length: (r.vulnerability ?? '').length,
      likelihood: r.likelihood,
      impact: r.impact,
      inherent_risk: r.inherent_risk,
      treatment_option: r.treatment_option,
      residual_likelihood: r.residual_likelihood ?? '',
      residual_impact: r.residual_impact ?? '',
      residual_risk: r.residual_risk ?? '',
      status: r.status,
      identified_at: r.identified_at,
      next_review_date: r.next_review_date ?? '',
      owner_pseudonym: r.owner
        ? pseudonymize({ packetUuid: ctx.packetUuid, context: 'user', realId: r.owner, key: ctx.pseudonymKey })
        : '',
    }));

    const csv = toCsv(COLS as unknown as string[], emitted);
    const file = collectorFileFromCsv(OUTPUT_PATH, csv);

    return {
      files: [file],
      attestation: buildAttestation({
        collectorId: COLLECTOR_ID,
        collectorVersion: '1.0.0',
        dataSource: isoRiskRegisterCollector.dataSource,
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
