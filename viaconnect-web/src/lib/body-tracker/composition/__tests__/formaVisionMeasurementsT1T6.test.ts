/**
 * FormaVision Measurements FULL T1–T6.
 * No live DB. No invented muscle lbs. Cards SSOT = body_tracker_circumference.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ExtractedMeasurements, MeasuredValue } from '@/lib/arnold/scanning/types';
import { buildCircumferenceWrite } from '../buildScanWrite';
import {
  CIRC_WRITE_FAIL_COPY,
  ENTER_HEIGHT_CTA,
  HEIGHT_MISSING_GEOMETRIC_COPY,
  LOG_MEASUREMENTS_CTA,
  MEASUREMENTS_EMPTY_COPY,
  hasFiniteGeometricGirth,
  isUniqueScanConstraintError,
  parseCircWriteResponse,
  resolveCircumferenceScanId,
} from '../circWriteContract';
import { allCircumferenceCardsEmpty, emptyMeasurements } from '@/lib/body-tracker/circumference';
import { MeasurementsGrid } from '@/components/body-tracker/MeasurementsGrid';
import { MeasurementCard } from '@/components/body-tracker/MeasurementCard';

const root = process.cwd();

function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

function measured(cm: number | null): MeasuredValue {
  return {
    cm,
    uncertaintyCm: 1,
    confidence: cm === null ? 'low' : 'high',
    source: cm === null ? 'missing' : 'ellipse_frontSide',
  };
}

const NULL_AX = { aCm: null, bCm: null, aspectRatio: null } as const;

function makeMeasurements(waistCm: number | null): ExtractedMeasurements {
  const unknown = measured(null);
  return {
    neckCirc: unknown,
    shoulderCirc: unknown,
    chestCirc: unknown,
    waistNaturalCirc: measured(waistCm),
    waistNavelCirc: unknown,
    hipCirc: unknown,
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
      neck: NULL_AX,
      shoulder: NULL_AX,
      chest: NULL_AX,
      waistNatural: NULL_AX,
      waistNavel: NULL_AX,
      hip: NULL_AX,
      bicepR: NULL_AX,
      bicepL: NULL_AX,
      forearmR: NULL_AX,
      forearmL: NULL_AX,
      thighR: NULL_AX,
      thighL: NULL_AX,
      calfR: NULL_AX,
      calfL: NULL_AX,
    },
  };
}

describe('T1 dual-path circ write + ok:false', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('treats HTTP non-ok and JSON ok:false as fail', () => {
    expect(parseCircWriteResponse({ httpOk: false, json: { ok: true } })).toEqual({
      ok: false,
      reason: 'http_not_ok',
    });
    expect(parseCircWriteResponse({ httpOk: true, json: { ok: false, reason: 'entry_not_found' } })).toEqual({
      ok: false,
      reason: 'entry_not_found',
    });
    expect(parseCircWriteResponse({ httpOk: true, json: { ok: true, entryId: 'e1' } })).toEqual({
      ok: true,
      skipped: false,
      reason: undefined,
      entryId: 'e1',
    });
  });

  it('skips all-UNKNOWN payloads and writes finite girths', () => {
    expect(hasFiniteGeometricGirth(makeMeasurements(null))).toBe(false);
    expect(hasFiniteGeometricGirth(makeMeasurements(86))).toBe(true);
    expect(hasFiniteGeometricGirth(makeMeasurements(Number.NaN))).toBe(false);
  });

  it('writeCircumferencesFromScan skips all-UNKNOWN and fails on ok:false without throwing', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { writeCircumferencesFromScan } = await import('../runFormaVisionAnalyze');

    const skipped = await writeCircumferencesFromScan(makeMeasurements(null), 'scan-1');
    expect(skipped).toEqual({ ok: true, skipped: true, reason: 'all_unknown' });
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: false, reason: 'circ_insert_failed' }),
    });
    const failed = await writeCircumferencesFromScan(makeMeasurements(86), 'scan-1');
    expect(failed.ok).toBe(false);
    expect(failed.reason).toBe('circ_insert_failed');

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, entryId: 'entry-1' }),
    });
    const ok = await writeCircumferencesFromScan(makeMeasurements(86), 'scan-1');
    expect(ok).toEqual({ ok: true, skipped: false, reason: undefined, entryId: 'entry-1' });
  });

  it('surfaces circ fail but BodyScanUploader still calls onComplete after persist-ok', () => {
    const uploader = src('src/components/body-tracker/BodyScanUploader.tsx');
    expect(uploader).toMatch(/CIRC_WRITE_FAIL_COPY/);
    expect(uploader).toMatch(/body-scan-circ-notice/);
    expect(uploader).toMatch(/toast\(CIRC_WRITE_FAIL_COPY/);
    expect(uploader).toMatch(/await circWritePromiseRef\.current/);
    expect(uploader).toMatch(/if \(!persistRes\.ok\)/);
    expect(uploader).toMatch(/onComplete\(spine\.result\)/);
    const persistBlock = uploader.slice(
      uploader.indexOf('if (circWritePromiseRef.current)'),
      uploader.indexOf('if (spine.result)'),
    );
    expect(persistBlock).toMatch(/Circ fail is best-effort/);
    expect(CIRC_WRITE_FAIL_COPY).toMatch(/still ready/i);
  });

  it('live Ready / SUBMIT_OK stays on composition.ok, not circ write', () => {
    const live = src('src/components/scan/ScanExperience.tsx');
    expect(live).toMatch(/await converge\.composition\.circWritePromise/);
    expect(live).toMatch(/setCompositionPhase\(converge\.composition\?\.ok \? 'ok' : 'error'\)/);
    expect(live).toMatch(/Circ fail is best-effort/);
  });
});

describe('T2 height gate honesty', () => {
  it('skips geometric when height is missing and never invents a default', () => {
    const analyze = src('src/lib/body-tracker/composition/runFormaVisionAnalyze.ts');
    expect(analyze).toMatch(/heightMissing/);
    expect(analyze).toMatch(/HEIGHT_MISSING_GEOMETRIC_COPY/);
    expect(analyze).toMatch(/Skipping geometric measurement/);
    expect(analyze).not.toMatch(/heightCm\s*=\s*170/);
    expect(analyze).not.toMatch(/heightCm\s*\?\?\s*1[567]\d/);
    expect(HEIGHT_MISSING_GEOMETRIC_COPY).toMatch(/never guess/i);
    expect(ENTER_HEIGHT_CTA).toBe('Enter height');
  });

  it('uploader shows honest height CTA without blocking BF persist', () => {
    const uploader = src('src/components/body-tracker/BodyScanUploader.tsx');
    expect(uploader).toMatch(/scan-height-missing/);
    expect(uploader).toMatch(/ENTER_HEIGHT_CTA/);
    expect(uploader).toMatch(/heightCm: localHeightCm/);
  });
});

describe('T3 empty-state CTA', () => {
  it('keeps Not yet logged and adds Log measurements when every card is null', () => {
    expect(allCircumferenceCardsEmpty(null)).toBe(true);
    expect(allCircumferenceCardsEmpty(emptyMeasurements())).toBe(true);
    const filled = emptyMeasurements();
    filled.waist = 32;
    expect(allCircumferenceCardsEmpty(filled)).toBe(false);

    const html = renderToStaticMarkup(
      React.createElement(MeasurementsGrid, {
        data: emptyMeasurements(),
        previous: null,
        unit: 'in',
        onLogMeasurements: () => undefined,
      }),
    );
    expect(html).toContain('measurements-empty-cta');
    expect(html).toContain(LOG_MEASUREMENTS_CTA);
    expect(html).toContain(MEASUREMENTS_EMPTY_COPY);
    expect(html).toContain('Not yet logged');
    expect(html).toContain('stroke-width="1.5"');

    const card = renderToStaticMarkup(
      React.createElement(MeasurementCard, {
        label: 'Waist Circumference',
        value: null,
        previousValue: null,
        unit: 'in',
      }),
    );
    expect(card).toContain('Not yet logged');
  });

  it('composition Measurements tab opens the Theme 3 / manual form', () => {
    const page = src('src/app/(app)/(consumer)/body-tracker/composition/page.tsx');
    expect(page).toMatch(/onLogMeasurements/);
    expect(page).toMatch(/setOpen\(true\)/);
    expect(page).toMatch(/BodyCompositionForm/);
    expect(page).toMatch(/CircumferenceEntryForm|initialSection=\{section\}/);
  });
});

describe('T4 morph ≠ cards', () => {
  it('estimateCircumferencesFromComposition / resolveAvatarCircumferences never write circ cards', () => {
    const estimate = src('src/lib/body-tracker/composition/estimateCircumferencesFromComposition.ts');
    const resolve = src('src/lib/body-tracker/composition/resolveAvatarCircumferences.ts');
    for (const file of [estimate, resolve]) {
      expect(file).toMatch(/AVATAR MORPH ONLY/);
      expect(file).not.toMatch(/from\('body_tracker_circumference'\)/);
      expect(file).not.toMatch(/\/api\/body\/circumference/);
      expect(file).not.toMatch(/writeCircumferencesFromScan/);
      expect(file).not.toMatch(/\.insert\(/);
      expect(file).not.toMatch(/from\('body_tracker_segmental_muscle'\)/);
    }
  });
});

describe('T5 vision scan_id stays null; entry lookup still uses photo_scans id', () => {
  it('builder keeps circ.scan_id null when only a vision id is known', () => {
    const visionId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
    expect(resolveCircumferenceScanId({ visionScanId: visionId })).toBeNull();
    const { circ } = buildCircumferenceWrite({
      userId: 'u',
      entryId: 'e',
      scanId: visionId,
      measurements: makeMeasurements(90),
    });
    expect(circ.scan_id).toBeNull();
    expect(circ.waist).toBe(90);
  });

  it('circumference route still looks up body_tracker_entries by vision scan_id', () => {
    const route = src('src/app/api/body/circumference/route.ts');
    expect(route).toMatch(/\.eq\('scan_id', scanId\)/);
    expect(route).toMatch(/body_tracker_entries/);
    expect(route).toMatch(/photoSessionId/);
    expect(route).toMatch(/hasFiniteGeometricGirth/);
    expect(route).toMatch(/all_unknown/);
  });
});

describe('T6 retain-FRBL remasure: finite cm + session scan_id + idempotency', () => {
  it('writes only a valid photo-session UUID as circ.scan_id', () => {
    const sessionId = '11111111-2222-4333-8444-555555555555';
    expect(
      resolveCircumferenceScanId({
        visionScanId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
        photoSessionId: sessionId,
      }),
    ).toBe(sessionId);
    expect(resolveCircumferenceScanId({ photoSessionId: 'not-a-uuid' })).toBeNull();

    const { circ } = buildCircumferenceWrite({
      userId: 'u',
      entryId: 'e',
      scanId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      photoSessionId: sessionId,
      measurements: makeMeasurements(88.44),
    });
    expect(circ.scan_id).toBe(sessionId);
    expect(circ.waist).toBe(88.4);
  });

  it('treats unique scan constraint as idempotent success', () => {
    expect(isUniqueScanConstraintError('23505')).toBe(true);
    expect(isUniqueScanConstraintError('23503')).toBe(false);
    const route = src('src/app/api/body/circumference/route.ts');
    expect(route).toMatch(/isUniqueScanConstraintError/);
    expect(route).toMatch(/idempotent: true/);
    expect(route).toMatch(/uq_body_tracker_circumference_scan|scan unique/);
  });

  it('analyze spine remasures after retain and does not let T6 fail block persist-ok', () => {
    const analyze = src('src/lib/body-tracker/composition/runFormaVisionAnalyze.ts');
    expect(analyze).toMatch(/flushT6/);
    expect(analyze).toMatch(/photoSessionId/);
    expect(analyze).toMatch(/runGeometricFromPhotos/);
    expect(analyze).toMatch(/T6 remasure failed \(non-fatal\)/);
    expect(analyze).toMatch(/never blocks BF persist/);
    expect(analyze).toMatch(/retainFrblFn/);
  });

  it('writeCircumferencesFromScan posts photoSessionId for the session FK', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, entryId: 'e1' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { writeCircumferencesFromScan } = await import('../runFormaVisionAnalyze');
    const sessionId = '11111111-2222-4333-8444-555555555555';
    await writeCircumferencesFromScan(makeMeasurements(80), 'vision-scan', {
      photoSessionId: sessionId,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    const body = JSON.parse(init.body) as {
      scanId: string;
      photoSessionId?: string;
      measurements: ExtractedMeasurements;
    };
    expect(body.scanId).toBe('vision-scan');
    expect(body.photoSessionId).toBe(sessionId);
    expect(body.measurements.waistNaturalCirc.cm).toBe(80);
  });
});
