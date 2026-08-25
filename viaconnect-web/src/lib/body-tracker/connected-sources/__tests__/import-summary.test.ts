import { describe, it, expect } from 'vitest';
import { parseImportSummary, isImportComplete } from '../import-summary';

const serverSuccess = {
  status: 'complete', records_seen: 200, records_ingested: 142,
  records_deduped: 12, records_attributed_hume: 4,
  date_range_start: '2026-01-01', date_range_end: '2026-08-01',
};

describe('parseImportSummary', () => {
  it('reads the server snake_case count keys (not 0)', () => {
    const s = parseImportSummary(serverSuccess);
    expect(s.recordsIngested).toBe(142);
    expect(s.recordsDeduped).toBe(12);
    expect(s.recordsAttributedHume).toBe(4);
    expect(s.recordsSeen).toBe(200);
    expect(s.dateRangeStart).toBe('2026-01-01');
  });
  it('treats a non-complete status as not complete (fail-open guard)', () => {
    expect(isImportComplete(serverSuccess)).toBe(true);
    expect(isImportComplete({ status: 'error', error: 'parse failed' })).toBe(false);
    expect(isImportComplete(null)).toBe(false);
  });
});
