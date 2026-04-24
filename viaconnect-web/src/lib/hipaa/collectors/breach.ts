// Prompt #127 P3: HIPAA breach determinations collector.
//
// Emits a CSV of the four-factor breach risk assessments for the period.
// Serves 45 CFR 164.308(a)(6) Security Incident Procedures + 164.402
// Definitions / notification-required determinations.

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
  'incident_id', 'assessment_date', 'determination',
  'notification_required', 'individuals_affected_count',
  'notification_sent', 'ocr_notification_sent', 'media_notification_sent',
  'rationale_length',
] as const;

const OUTPUT_PATH = 'administrative-safeguards/164-308-a-6-security-incident-procedures/hipaa-breach-determinations.csv';
const COLLECTOR_ID = 'hipaa-breach-determinations-collector';

interface DbRow {
  incident_id: string;
  assessment_date: string;
  determination: string;
  rationale: string;
  notification_required: boolean;
  individuals_affected_count: number | null;
  notification_sent_at: string | null;
  ocr_notification_sent_at: string | null;
  media_notification_sent_at: string | null;
}

export const hipaaBreachDeterminationsCollector: SOC2Collector = {
  id: COLLECTOR_ID,
  version: '1.0.0',
  dataSource: 'hipaa_breach_determinations',
  controls: ['164.308(a)(6)(ii)', '164.402', '164.404', '164.406', '164.408'],

  async collect(period: Period, ctx: CollectorCtxLike) {
    const timer = ctx.timer ?? realTimer();
    const startedAt = timer.now();

    const query = {
      table: 'hipaa_breach_determinations',
      columns: [
        'incident_id', 'assessment_date', 'determination', 'rationale',
        'notification_required', 'individuals_affected_count',
        'notification_sent_at', 'ocr_notification_sent_at', 'media_notification_sent_at',
      ],
      filters: [
        { column: 'assessment_date', op: 'gte' as const, value: period.start.slice(0, 10) },
        { column: 'assessment_date', op: 'lte' as const, value: period.end.slice(0, 10) },
      ],
      orderBy: [
        { column: 'assessment_date', ascending: true },
        { column: 'incident_id', ascending: true },
      ],
      sqlRepresentation:
        'SELECT incident_id, assessment_date, determination, rationale, notification_required, individuals_affected_count, notification_sent_at, ocr_notification_sent_at, media_notification_sent_at FROM public.hipaa_breach_determinations WHERE assessment_date BETWEEN $1 AND $2 ORDER BY assessment_date ASC, incident_id ASC',
    };

    const rows = await ctx.fetch<DbRow>(query);
    const emitted = rows.map((r) => ({
      incident_id: r.incident_id,
      assessment_date: r.assessment_date,
      determination: r.determination,
      notification_required: r.notification_required,
      individuals_affected_count: r.individuals_affected_count ?? '',
      notification_sent: r.notification_sent_at ? 'yes' : 'no',
      ocr_notification_sent: r.ocr_notification_sent_at ? 'yes' : 'no',
      media_notification_sent: r.media_notification_sent_at ? 'yes' : 'no',
      rationale_length: (r.rationale ?? '').length,
    }));

    const csv = toCsv(COLS as unknown as string[], emitted);
    const file = collectorFileFromCsv(OUTPUT_PATH, csv);

    return {
      files: [file],
      attestation: buildAttestation({
        collectorId: COLLECTOR_ID,
        collectorVersion: '1.0.0',
        dataSource: hipaaBreachDeterminationsCollector.dataSource,
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
