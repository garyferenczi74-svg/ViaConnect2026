import { describe, expect, it } from 'vitest';
import { emptyMeasurements } from '@/lib/body-tracker/circumference';
import { estimateCircumferencesFromComposition } from '@/lib/body-tracker/composition/estimateCircumferencesFromComposition';
import { snapshotFromPhotoScanSummary } from '@/lib/body-tracker/composition/snapshotFromScanResult';
import {
  applyAvatarMorphStamp,
  buildAvatarMorphStamp,
} from '../avatarMorphStamp';

function ready31() {
  return snapshotFromPhotoScanSummary({
    id: 'photo-31',
    date: '2026-09-01',
    estimatedBodyFatMin: 29,
    estimatedBodyFatMax: 33,
  });
}

describe('buildAvatarMorphStamp', () => {
  it('marks Ready BF 31% estimate circs as applied with a non-template waist', () => {
    const scan = ready31();
    const circs = estimateCircumferencesFromComposition(scan, 'male', 'in');
    const stamp = buildAvatarMorphStamp({
      scan,
      circumferences: circs,
      sex: 'male',
      unit: 'in',
      source: 'estimate',
    });
    expect(stamp.bf).toBe('31.0');
    expect(stamp.source).toBe('estimate');
    expect(stamp.morph).toBe('applied');
    expect(stamp.templateWaistM).toBe('0.900');
    expect(Number(stamp.waistM)).toBeGreaterThan(0.9);
  });

  it('stays template when circs are empty (NO-FABRICATION)', () => {
    const stamp = buildAvatarMorphStamp({
      scan: ready31(),
      circumferences: emptyMeasurements(),
      sex: 'male',
      unit: 'in',
    });
    expect(stamp.morph).toBe('template');
    expect(stamp.waistM).toBe('');
    expect(stamp.bf).toBe('31.0');
    expect(stamp.source).toBe('none');
  });

  it('writes data-morph attrs onto an element', () => {
    const scan = ready31();
    const stamp = buildAvatarMorphStamp({
      scan,
      circumferences: estimateCircumferencesFromComposition(scan, 'male', 'in'),
      sex: 'male',
      unit: 'in',
      source: 'estimate',
    });
    const el = { attrs: {} as Record<string, string>, setAttribute(k: string, v: string) {
      this.attrs[k] = v;
    } };
    applyAvatarMorphStamp(el as unknown as Element, stamp);
    expect(el.attrs['data-morph']).toBe('applied');
    expect(el.attrs['data-morph-source']).toBe('estimate');
    expect(el.attrs['data-morph-bf']).toBe('31.0');
    expect(Number(el.attrs['data-morph-waist-m'])).toBeGreaterThan(0.9);
    expect(el.attrs['data-morph-template-waist-m']).toBe('0.900');
  });
});
