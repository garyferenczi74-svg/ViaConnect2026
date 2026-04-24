// Prompt #127 P3: HIPAA device / media events collector.
// Serves 45 CFR 164.310(d) Device and Media Controls (Disposal, Re-use,
// Accountability, Data Backup and Storage).

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
  'event_date', 'event_kind', 'device_id',
  'method', 'notes_length',
] as const;

const OUTPUT_PATH = 'physical-safeguards/164-310-d-device-and-media-controls/hipaa-device-media-events.csv';
const COLLECTOR_ID = 'hipaa-device-media-control-collector';

interface DbRow {
  event_date: string;
  event_kind: string;
  device_id: string;
  method: string | null;
  notes: string | null;
}

export const hipaaDeviceMediaControlCollector: SOC2Collector = {
  id: COLLECTOR_ID,
  version: '1.0.0',
  dataSource: 'hipaa_device_media_events',
  controls: ['164.310(d)(1)', '164.310(d)(2)(i)', '164.310(d)(2)(ii)', '164.310(d)(2)(iii)'],

  async collect(period: Period, ctx: CollectorCtxLike) {
    const timer = ctx.timer ?? realTimer();
    const startedAt = timer.now();

    const query = {
      table: 'hipaa_device_media_events',
      columns: ['event_date', 'event_kind', 'device_id', 'method', 'notes'],
      filters: [
        { column: 'event_date', op: 'gte' as const, value: period.start.slice(0, 10) },
        { column: 'event_date', op: 'lte' as const, value: period.end.slice(0, 10) },
      ],
      orderBy: [
        { column: 'event_date', ascending: true },
        { column: 'device_id', ascending: true },
      ],
      sqlRepresentation:
        'SELECT event_date, event_kind, device_id, method, notes FROM public.hipaa_device_media_events WHERE event_date BETWEEN $1 AND $2 ORDER BY event_date ASC, device_id ASC',
    };

    const rows = await ctx.fetch<DbRow>(query);
    const emitted = rows.map((r) => ({
      event_date: r.event_date,
      event_kind: r.event_kind,
      device_id: r.device_id,
      method: r.method ?? '',
      notes_length: (r.notes ?? '').length,
    }));

    const csv = toCsv(COLS as unknown as string[], emitted);
    const file = collectorFileFromCsv(OUTPUT_PATH, csv);

    return {
      files: [file],
      attestation: buildAttestation({
        collectorId: COLLECTOR_ID,
        collectorVersion: '1.0.0',
        dataSource: hipaaDeviceMediaControlCollector.dataSource,
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
