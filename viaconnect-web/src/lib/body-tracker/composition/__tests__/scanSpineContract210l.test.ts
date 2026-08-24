/**
 * Prompt 210l: scan spine write/read contract + timeout budgets.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  assertScanSpineContract,
  anyCircumferencePresent,
  hasRenderableSpine,
} from '../scanSpineContract';
import { SCAN_PERSIST_CLIENT_TIMEOUT_MS } from '../persistScanClient';
import { emptyMeasurements } from '@/lib/body-tracker/circumference';

const root = process.cwd();

describe('Prompt 210l scan spine contract', () => {
  it('exports a client persist timeout long enough for multi-step server work', () => {
    expect(SCAN_PERSIST_CLIENT_TIMEOUT_MS).toBeGreaterThanOrEqual(30_000);
  });

  it('assertScanSpineContract passes when entry and fat land', () => {
    const res = assertScanSpineContract({
      write: {
        entryId: 'e1',
        source: 'scan',
        totalBodyFatPct: 22,
        hasAnyCircumference: false,
      },
      read: {
        snapshot: {
          entryId: 'e1',
          source: 'scan',
          recordedAt: '2026-08-15T00:00:00Z',
          totalBodyFatPct: 22,
          regionFatPct: {
            right_arm: null,
            left_arm: null,
            trunk: null,
            right_leg: null,
            left_leg: null,
          },
          visceralFatRating: null,
          bodyWaterPct: null,
          regionMuscleLbs: {
            right_arm: null,
            left_arm: null,
            trunk: null,
            right_leg: null,
            left_leg: null,
          },
          totalMuscleMassLbs: null,
          skeletalMuscleMassLbs: null,
        },
        circumferences: null,
      },
    });
    expect(res).toEqual({ ok: true });
  });

  it('assertScanSpineContract fails when write claimed girths but read has none', () => {
    const circ = emptyMeasurements();
    circ.waist = 32;
    const res = assertScanSpineContract({
      write: {
        entryId: 'e2',
        source: 'scan',
        totalBodyFatPct: 20,
        hasAnyCircumference: true,
      },
      read: {
        snapshot: {
          entryId: 'e2',
          source: 'scan',
          recordedAt: '2026-08-15T00:00:00Z',
          totalBodyFatPct: 20,
          regionFatPct: {
            right_arm: null,
            left_arm: null,
            trunk: null,
            right_leg: null,
            left_leg: null,
          },
          visceralFatRating: null,
          bodyWaterPct: null,
          regionMuscleLbs: {
            right_arm: null,
            left_arm: null,
            trunk: null,
            right_leg: null,
            left_leg: null,
          },
          totalMuscleMassLbs: null,
          skeletalMuscleMassLbs: null,
        },
        circumferences: emptyMeasurements(),
      },
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe('read_missing_girths_after_write');
    expect(anyCircumferencePresent(circ)).toBe(true);
    expect(hasRenderableSpine({ snapshot: null, circumferences: circ })).toBe(true);
  });

  it('circumference route uses an extended entry lookup retry window', () => {
    const src = readFileSync(
      join(root, 'src/app/api/body/circumference/route.ts'),
      'utf8',
    );
    expect(src).toMatch(/ENTRY_LOOKUP_RETRIES\s*=\s*1[0-9]/);
    expect(src).toMatch(/ENTRY_LOOKUP_DELAY_MS\s*=\s*1000/);
  });

  it('manual weight form dual-writes body_tracker_circumference', () => {
    const src = readFileSync(
      join(
        root,
        'src/components/body-tracker/manual-input/forms/WeightMeasurementsForm.tsx',
      ),
      'utf8',
    );
    expect(src).toMatch(/body_tracker_circumference/);
    expect(src).toMatch(/hasAnyGirth/);
    // Does not invent body fat from girths
    expect(src).not.toMatch(/total_body_fat_pct/);
  });

  it('useLatestComposition falls back to latest entry without segmental rows', () => {
    const src = readFileSync(
      join(root, 'src/hooks/body-tracker/useLatestComposition.ts'),
      'utf8',
    );
    expect(src).toMatch(/entry_fallback|entry fallback/);
    expect(src).toMatch(/order\('created_at',\s*\{\s*ascending:\s*false\s*\}/);
  });

  it('BodyScanUploader persists before circumference flush', () => {
    const src = readFileSync(
      join(root, 'src/components/body-tracker/BodyScanUploader.tsx'),
      'utf8',
    );
    expect(src).toMatch(/persistScan/);
    expect(src).toMatch(/persistRes/);
    expect(src).toMatch(/flushCirc/);
    expect(src).toMatch(/ANALYZE_CLIENT_TIMEOUT_MS/);
  });
});
