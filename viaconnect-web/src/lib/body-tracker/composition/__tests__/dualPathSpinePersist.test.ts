/**
 * Dual-path Body Tracker spine persist.
 *
 * Gary: keep BOTH update paths. Manual Body Tracker entry and FormaVision
 * image/scan persist must write the same body_tracker_* spine. This suite
 * locks that contract so neither path can silently stop updating Body Tracker.
 *
 * No live DB. No PHI. No fabricated composition math.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildScanWrite, buildCircumferenceWrite } from '../buildScanWrite';
import type { ExtractedMeasurements, MeasuredValue } from '@/lib/arnold/scanning/types';

const root = process.cwd();

const SPINE_TABLES = [
  'body_tracker_entries',
  'body_tracker_segmental_fat',
  'body_tracker_circumference',
  'body_tracker_weight',
] as const;

type CapturedInsert = { table: string; row: Record<string, unknown> };

function makeInsertClient(captured: CapturedInsert[]) {
  return {
    from(table: string) {
      return {
        insert(row: Record<string, unknown>) {
          captured.push({ table, row });
          const result = {
            data: table === 'body_tracker_entries' ? { id: 'entry-shared-1' } : null,
            error: null,
          };
          return {
            select() {
              return {
                single: () => Promise.resolve(result),
              };
            },
            then(
              resolve: (v: typeof result) => unknown,
              reject?: (e: unknown) => unknown,
            ) {
              return Promise.resolve(result).then(resolve, reject);
            },
          };
        },
      };
    },
  };
}

function measured(cm: number | null): MeasuredValue {
  return {
    cm,
    uncertaintyCm: 1,
    confidence: cm === null ? 'low' : 'high',
    source: cm === null ? 'missing' : 'ellipse_frontSide',
  };
}

function scanMeasurements(waistCm: number): ExtractedMeasurements {
  const unknown = measured(null);
  const nullAx = { aCm: null, bCm: null, aspectRatio: null } as const;
  return {
    neckCirc: unknown,
    shoulderCirc: unknown,
    chestCirc: unknown,
    waistNaturalCirc: measured(waistCm),
    waistNavelCirc: unknown,
    hipCirc: measured(98),
    rightBicepCirc: unknown,
    leftBicepCirc: unknown,
    rightForearmCirc: unknown,
    leftForearmCirc: unknown,
    rightThighCirc: unknown,
    leftThighCirc: unknown,
    rightCalfCirc: unknown,
    leftCalfCirc: unknown,
    waistToHipRatio: 0,
    waistToHeightRatio: 0,
    shoulderToWaistRatio: 0,
    inseamCm: 0,
    torsoLengthCm: 0,
    corroborationSignals: { lrCorroboration: 0, fbCorroboration: 0, lrAsymmetry: null },
    semiAxes: {
      neck: nullAx,
      shoulder: nullAx,
      chest: nullAx,
      waistNatural: nullAx,
      waistNavel: nullAx,
      hip: nullAx,
      bicepR: nullAx,
      bicepL: nullAx,
      forearmR: nullAx,
      forearmL: nullAx,
      thighR: nullAx,
      thighL: nullAx,
      calfR: nullAx,
      calfL: nullAx,
    },
  };
}

describe('dual-path Body Tracker spine persist', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('manual submitEntry writes a parent entry plus weight and circumference on the same entry_id', async () => {
    const captured: CapturedInsert[] = [];
    vi.doMock('@/lib/supabase/client', () => ({
      createClient: () => makeInsertClient(captured),
    }));

    const { submitEntry } = await import(
      '@/components/body-tracker/manual-input/submitEntry'
    );

    const result = await submitEntry({
      userId: 'user-1',
      entryDate: '2026-08-23',
      manualSourceId: 'tape_measure',
      details: [
        {
          table: 'body_tracker_weight',
          row: { weight_lbs: 180, waist_in: 34, hips_in: 40 },
        },
        {
          table: 'body_tracker_circumference',
          row: {
            entry_unit: 'in',
            source: 'manual',
            waist: 34,
            neck: null,
            chest: null,
          },
        },
      ],
    });

    expect(result.entryId).toBe('entry-shared-1');

    const tables = captured.map((c) => c.table);
    expect(tables).toContain('body_tracker_entries');
    expect(tables).toContain('body_tracker_weight');
    expect(tables).toContain('body_tracker_circumference');

    const header = captured.find((c) => c.table === 'body_tracker_entries');
    expect(header?.row.source).toBe('manual');
    expect(header?.row.user_id).toBe('user-1');

    const weight = captured.find((c) => c.table === 'body_tracker_weight');
    expect(weight?.row.entry_id).toBe('entry-shared-1');
    expect(weight?.row.user_id).toBe('user-1');
    expect(weight?.row.weight_lbs).toBe(180);

    const circ = captured.find((c) => c.table === 'body_tracker_circumference');
    expect(circ?.row.entry_id).toBe('entry-shared-1');
    expect(circ?.row.user_id).toBe('user-1');
    expect(circ?.row.source).toBe('manual');
    expect(circ?.row.waist).toBe(34);
  });

  it('FormaVision scan write lands on the same parent entry plus fat, girths, and hip', () => {
    const { entry, segFat } = buildScanWrite({
      userId: 'user-1',
      scanId: 'scan-1',
      scanDate: '2026-08-23',
      derived: { totalBodyFatPct: 21.4, confidence: 0.65 },
    });
    expect(entry.source).toBe('scan');
    expect(entry.device_name).toBe('FormaVision');
    expect(entry.scan_id).toBe('scan-1');
    expect(entry.user_id).toBe('user-1');
    expect(segFat.total_body_fat_pct).toBe(21.4);
    expect(segFat.user_id).toBe('user-1');

    const { circ, hips } = buildCircumferenceWrite({
      userId: 'user-1',
      entryId: 'entry-shared-1',
      scanId: 'scan-1',
      measurements: scanMeasurements(86),
    });

    expect(circ.user_id).toBe('user-1');
    expect(circ.entry_id).toBe('entry-shared-1');
    expect(circ.source).toBe('scan');
    expect(circ.waist).toBe(86);
    expect(circ.scan_id).toBeNull();
    expect(hips.hips_in).not.toBeNull();
  });

  it('both paths name the same Body Tracker spine tables', () => {
    const manualForm = readFileSync(
      join(
        root,
        'src/components/body-tracker/manual-input/forms/WeightMeasurementsForm.tsx',
      ),
      'utf8',
    );
    const logDataForm = readFileSync(
      join(root, 'src/components/body-tracker/BodyCompositionForm.tsx'),
      'utf8',
    );
    const persistRoute = readFileSync(
      join(root, 'src/app/api/body/scan/persist/route.ts'),
      'utf8',
    );
    const scanWrite = readFileSync(
      join(root, 'src/lib/body-tracker/composition/buildScanWrite.ts'),
      'utf8',
    );
    const circRoute = readFileSync(
      join(root, 'src/app/api/body/circumference/route.ts'),
      'utf8',
    );
    const uploader = readFileSync(
      join(root, 'src/components/body-tracker/BodyScanUploader.tsx'),
      'utf8',
    );

    expect(manualForm).toMatch(/body_tracker_weight/);
    expect(manualForm).toMatch(/body_tracker_circumference/);
    expect(manualForm).toMatch(/source:\s*'manual'/);

    expect(logDataForm).toMatch(/body_tracker_segmental_fat/);
    expect(logDataForm).toMatch(/body_tracker_circumference/);
    expect(logDataForm).toMatch(/source:\s*'manual'/);
    expect(logDataForm).toMatch(/submitEntry/);

    expect(persistRoute).toMatch(/body_tracker_entries/);
    expect(persistRoute).toMatch(/body_tracker_segmental_fat/);
    expect(scanWrite).toMatch(/source:\s*'scan'/);
    expect(scanWrite).toMatch(/device_name:\s*'FormaVision'/);

    expect(circRoute).toMatch(/body_tracker_circumference/);
    expect(circRoute).toMatch(/body_tracker_weight/);
    expect(circRoute).toMatch(/circ_insert_failed|circInsert/);

    expect(uploader).toMatch(/persistScan/);
    expect(uploader).toMatch(/\/api\/body\/circumference/);

    for (const table of SPINE_TABLES) {
      const inManual = manualForm.includes(table) || logDataForm.includes(table);
      const inScan = persistRoute.includes(table) || circRoute.includes(table);
      // Weight is scan-written via the circumference route (hip), not persist.
      if (table === 'body_tracker_weight') {
        expect(inManual).toBe(true);
        expect(circRoute.includes(table)).toBe(true);
        continue;
      }
      if (table === 'body_tracker_segmental_fat') {
        expect(logDataForm.includes(table)).toBe(true);
        expect(persistRoute.includes(table)).toBe(true);
        continue;
      }
      expect(inManual || inScan).toBe(true);
      expect(inScan).toBe(true);
    }
  });
});
