// Prompt #127 P5: ISO 27001 ISMS scope collector (Clause 4.3).
//
// Every generated packet needs the currently-effective ISMS scope as
// a first-class auditor-facing document. This collector emits a single
// JSON row describing the approved scope and the approval chain.

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
  'version', 'scope_length', 'included_boundaries_count', 'exclusions_count',
  'effective_from', 'effective_until', 'approved',
] as const;

const OUTPUT_PATH = 'isms-clauses/clause-4-context/iso-isms-scope-documents.csv';
const COLLECTOR_ID = 'iso-isms-scope-collector';

interface DbRow {
  version: number;
  scope_description: string;
  included_boundaries: unknown[] | null;
  exclusions: unknown[] | null;
  effective_from: string;
  effective_until: string | null;
  approved_at: string | null;
}

export const isoIsmsScopeCollector: SOC2Collector = {
  id: COLLECTOR_ID,
  version: '1.0.0',
  dataSource: 'iso_isms_scope_documents',
  controls: ['Clause 4.3'],

  async collect(period: Period, ctx: CollectorCtxLike) {
    const timer = ctx.timer ?? realTimer();
    const startedAt = timer.now();

    const query = {
      table: 'iso_isms_scope_documents',
      columns: ['version', 'scope_description', 'included_boundaries', 'exclusions',
        'effective_from', 'effective_until', 'approved_at'],
      filters: [
        { column: 'effective_from', op: 'lte' as const, value: period.end.slice(0, 10) },
      ],
      orderBy: [{ column: 'version', ascending: true }],
      sqlRepresentation:
        'SELECT version, scope_description, included_boundaries, exclusions, effective_from, effective_until, approved_at FROM public.iso_isms_scope_documents WHERE effective_from <= $1 ORDER BY version ASC',
    };

    const rows = await ctx.fetch<DbRow>(query);
    const emitted = rows.map((r) => ({
      version: r.version,
      scope_length: (r.scope_description ?? '').length,
      included_boundaries_count: Array.isArray(r.included_boundaries) ? r.included_boundaries.length : 0,
      exclusions_count: Array.isArray(r.exclusions) ? r.exclusions.length : 0,
      effective_from: r.effective_from,
      effective_until: r.effective_until ?? '',
      approved: r.approved_at ? 'yes' : 'no',
    }));

    const csv = toCsv(COLS as unknown as string[], emitted);
    const file = collectorFileFromCsv(OUTPUT_PATH, csv);

    return {
      files: [file],
      attestation: buildAttestation({
        collectorId: COLLECTOR_ID,
        collectorVersion: '1.0.0',
        dataSource: isoIsmsScopeCollector.dataSource,
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
