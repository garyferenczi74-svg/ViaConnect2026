import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  HEIGHT_CM_STAMP_SOURCES,
  stampFiniteHeight,
  stampHeightCmSource,
} from '../heightCmSourceStamp';

describe('stampHeightCmSource CHECK map', () => {
  it('maps resolver sources onto the LIVE CHECK set', () => {
    expect(HEIGHT_CM_STAMP_SOURCES).toEqual(['caq_phase_1', 'pre_scan_update', 'manual']);
    expect(stampHeightCmSource('caq_demographics')).toBe('caq_phase_1');
    expect(stampHeightCmSource('clinical_assessment')).toBe('manual');
    expect(stampHeightCmSource('body_goals')).toBe('manual');
  });

  it('passes through already-allowed CHECK values', () => {
    expect(stampHeightCmSource('caq_phase_1')).toBe('caq_phase_1');
    expect(stampHeightCmSource('pre_scan_update')).toBe('pre_scan_update');
    expect(stampHeightCmSource('manual')).toBe('manual');
  });

  it('fails open to null for missing or unknown sources — never invents', () => {
    expect(stampHeightCmSource(null)).toBeNull();
    expect(stampHeightCmSource(undefined)).toBeNull();
    expect(stampHeightCmSource('')).toBeNull();
    expect(stampHeightCmSource('invented')).toBeNull();
  });

  it('stamps finite height only and never invents 170', () => {
    expect(stampFiniteHeight({ heightCm: 180, source: 'caq_demographics' })).toEqual({
      heightCm: 180,
      source: 'caq_phase_1',
    });
    expect(stampFiniteHeight({ heightCm: 178, source: 'clinical_assessment' })).toEqual({
      heightCm: 178,
      source: 'manual',
    });
    expect(stampFiniteHeight({ heightCm: null, source: 'caq_demographics' })).toBeNull();
    expect(stampFiniteHeight({ heightCm: Number.NaN, source: 'caq_demographics' })).toBeNull();
    expect(stampFiniteHeight({ heightCm: 0, source: 'caq_demographics' })).toBeNull();
    expect(stampFiniteHeight({ heightCm: 180, source: null })).toEqual({
      heightCm: 180,
      source: null,
    });
  });
});

describe('height stamp writers use the CHECK map', () => {
  it('retain-frbl prepareRetain and scan prepare stamp via stampHeightCmSource', () => {
    const retain = readFileSync(
      join(process.cwd(), 'src/app/api/formavision/retain-frbl/route.ts'),
      'utf8',
    );
    const prepare = readFileSync(join(process.cwd(), 'src/app/api/scan/prepare/route.ts'), 'utf8');
    for (const src of [retain, prepare]) {
      expect(src).toMatch(/stampFiniteHeight|stampHeightCmSource/);
      expect(src).not.toMatch(/height_cm_source:\s*resolvedHeight\.source/);
      expect(src).not.toMatch(/heightCm\s*=\s*170|heightCm\s*\?\?\s*170/);
    }
  });
});
