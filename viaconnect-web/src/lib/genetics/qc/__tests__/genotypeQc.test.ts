// Prompt 208a Task A2 (2026-06-21): TDD tests for the genotype QC engine.
// Written RED first, then implementation makes them GREEN.

import { describe, it, expect } from 'vitest';
import {
  isNoCall,
  isPalindromic,
  classifyCall,
  resolveOrientation,
  runUploadQc,
} from '../genotypeQc';

// ---------------------------------------------------------------------------
// 1. isNoCall
// ---------------------------------------------------------------------------
describe('isNoCall', () => {
  it('flags -- as no-call', () => {
    expect(isNoCall('--')).toBe(true);
  });
  it('flags 00 as no-call', () => {
    expect(isNoCall('00')).toBe(true);
  });
  it('flags NN as no-call', () => {
    expect(isNoCall('NN')).toBe(true);
  });
  it('flags empty string as no-call', () => {
    expect(isNoCall('')).toBe(true);
  });
  it('flags DD as no-call', () => {
    expect(isNoCall('DD')).toBe(true);
  });
  it('flags II as no-call', () => {
    expect(isNoCall('II')).toBe(true);
  });
  it('does NOT flag CT as no-call', () => {
    expect(isNoCall('CT')).toBe(false);
  });
  it('does NOT flag AA as no-call', () => {
    expect(isNoCall('AA')).toBe(false);
  });
  it('does NOT flag a slash-separated call as no-call', () => {
    expect(isNoCall('C/T')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. isPalindromic
// ---------------------------------------------------------------------------
describe('isPalindromic', () => {
  it('AT is palindromic', () => {
    expect(isPalindromic('AT')).toBe(true);
  });
  it('TA is palindromic', () => {
    expect(isPalindromic('TA')).toBe(true);
  });
  it('CG is palindromic', () => {
    expect(isPalindromic('CG')).toBe(true);
  });
  it('GC is palindromic', () => {
    expect(isPalindromic('GC')).toBe(true);
  });
  it('AG is NOT palindromic', () => {
    expect(isPalindromic('AG')).toBe(false);
  });
  it('CT is NOT palindromic', () => {
    expect(isPalindromic('CT')).toBe(false);
  });
  it('AA homozygous is NOT palindromic', () => {
    expect(isPalindromic('AA')).toBe(false);
  });
  it('TT homozygous is NOT palindromic', () => {
    expect(isPalindromic('TT')).toBe(false);
  });
  it('slash-separated AT is palindromic', () => {
    expect(isPalindromic('A/T')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. resolveOrientation
// ---------------------------------------------------------------------------
describe('resolveOrientation', () => {
  describe('with expectedAlleles provided', () => {
    const expected = ['C', 'T'];

    it('CT is ok when alleles match expected', () => {
      expect(resolveOrientation('CT', expected)).toBe('ok');
    });
    it('GA (complement of CT) is reversed - strand flip caught', () => {
      expect(resolveOrientation('GA', expected)).toBe('reversed');
    });
    it('AA (neither CT nor GA) is ambiguous', () => {
      expect(resolveOrientation('AA', expected)).toBe('ambiguous');
    });
    it('-- (no-call) is unresolved even with expected alleles', () => {
      expect(resolveOrientation('--', expected)).toBe('unresolved');
    });
    it('TC (same alleles as CT, different order) is ok', () => {
      expect(resolveOrientation('TC', expected)).toBe('ok');
    });
    it('AG (complement of CT, different order) is reversed', () => {
      expect(resolveOrientation('AG', expected)).toBe('reversed');
    });
  });

  describe('without expectedAlleles (flag-off mode)', () => {
    it('AT is ambiguous (palindromic, cannot resolve without reference)', () => {
      expect(resolveOrientation('AT')).toBe('ambiguous');
    });
    it('CT is ok (non-palindromic, assume forward strand)', () => {
      expect(resolveOrientation('CT')).toBe('ok');
    });
    it('-- is unresolved (no-call)', () => {
      expect(resolveOrientation('--')).toBe('unresolved');
    });
    it('CG is ambiguous (palindromic)', () => {
      expect(resolveOrientation('CG')).toBe('ambiguous');
    });
    it('AA is ok (homozygous non-palindromic)', () => {
      expect(resolveOrientation('AA')).toBe('ok');
    });
    it('GC is ambiguous (palindromic)', () => {
      expect(resolveOrientation('GC')).toBe('ambiguous');
    });
  });
});

// ---------------------------------------------------------------------------
// 4. classifyCall
// ---------------------------------------------------------------------------
describe('classifyCall', () => {
  it('-- is no_call quality', () => {
    const r = classifyCall('--');
    expect(r.is_no_call).toBe(true);
    expect(r.call_quality).toBe('no_call');
    expect(r.is_imputed).toBe(false);
  });
  it('NN is no_call quality', () => {
    const r = classifyCall('NN');
    expect(r.is_no_call).toBe(true);
    expect(r.call_quality).toBe('no_call');
  });
  it('CT is high quality', () => {
    const r = classifyCall('CT');
    expect(r.is_no_call).toBe(false);
    expect(r.call_quality).toBe('high');
    expect(r.is_imputed).toBe(false);
  });
  it('AA is high quality', () => {
    const r = classifyCall('AA');
    expect(r.is_no_call).toBe(false);
    expect(r.call_quality).toBe('high');
  });
  it('empty string is no_call quality', () => {
    const r = classifyCall('');
    expect(r.is_no_call).toBe(true);
    expect(r.call_quality).toBe('no_call');
  });
});

// ---------------------------------------------------------------------------
// 5. runUploadQc
// ---------------------------------------------------------------------------
describe('runUploadQc', () => {
  it('detects build from buildMarkers fixture', () => {
    const rows = [{ rsid: 'rs1234567', genotype: 'CT' }];
    const opts = {
      buildMarkers: { rs1234567: 'GRCh37' as const },
    };
    const result = runUploadQc(rows, opts);
    expect(result.detected_build).toBe('GRCh37');
    expect(result.normalized_build).toBe('GRCh37');
  });

  it('detected_build is unknown when no buildMarkers provided', () => {
    const rows = [{ rsid: 'rs1234567', genotype: 'CT' }];
    const result = runUploadQc(rows);
    expect(result.detected_build).toBe('unknown');
  });

  it('strand-flipped call yields orientation reversed and orientation_resolved false', () => {
    const rows = [{ rsid: 'rs123', genotype: 'GA' }];
    const opts = {
      expectedAllelesByRsid: { rs123: ['C', 'T'] },
    };
    const result = runUploadQc(rows, opts);
    const call = result.calls[0];
    expect(call.orientation).toBe('reversed');
    expect(call.orientation_resolved).toBe(false);
  });

  it('no-call row has orientation_resolved false and is_no_call true', () => {
    const rows = [{ rsid: 'rs456', genotype: '--' }];
    const result = runUploadQc(rows);
    const call = result.calls[0];
    expect(call.is_no_call).toBe(true);
    expect(call.orientation_resolved).toBe(false);
  });

  it('clean forward call has orientation_resolved true', () => {
    const rows = [{ rsid: 'rs789', genotype: 'CT' }];
    const opts = {
      expectedAllelesByRsid: { rs789: ['C', 'T'] },
    };
    const result = runUploadQc(rows, opts);
    const call = result.calls[0];
    expect(call.orientation).toBe('ok');
    expect(call.orientation_resolved).toBe(true);
  });

  it('qc_status is clean when all calls resolved and no no-calls', () => {
    const rows = [
      { rsid: 'rs1', genotype: 'CT' },
      { rsid: 'rs2', genotype: 'AA' },
    ];
    const opts = {
      expectedAllelesByRsid: {
        rs1: ['C', 'T'],
        rs2: ['A', 'G'],
      },
    };
    const result = runUploadQc(rows, opts);
    expect(result.qc_status).toBe('clean');
    expect(result.normalization_confidence).toBe(1);
  });

  it('qc_status is blocked when NO call is resolved', () => {
    const rows = [
      { rsid: 'rs1', genotype: '--' },
      { rsid: 'rs2', genotype: 'NN' },
    ];
    const result = runUploadQc(rows);
    expect(result.qc_status).toBe('blocked');
    expect(result.normalization_confidence).toBe(0);
  });

  it('qc_status is flagged when some but not all calls resolve', () => {
    const rows = [
      { rsid: 'rs1', genotype: 'CT' },
      { rsid: 'rs2', genotype: '--' },
    ];
    const opts = {
      expectedAllelesByRsid: { rs1: ['C', 'T'] },
    };
    const result = runUploadQc(rows, opts);
    expect(result.qc_status).toBe('flagged');
    expect(result.normalization_confidence).toBe(0.5);
  });

  it('normalization_confidence is correct fraction', () => {
    // 2 resolved, 1 no-call -> 2/3
    const rows = [
      { rsid: 'rs1', genotype: 'CT' },
      { rsid: 'rs2', genotype: 'AA' },
      { rsid: 'rs3', genotype: '--' },
    ];
    const opts = {
      expectedAllelesByRsid: {
        rs1: ['C', 'T'],
        rs2: ['A', 'G'],
      },
    };
    const result = runUploadQc(rows, opts);
    expect(result.normalization_confidence).toBeCloseTo(2 / 3, 5);
  });

  it('all calls are present in the calls array', () => {
    const rows = [
      { rsid: 'rs1', genotype: 'CT' },
      { rsid: 'rs2', genotype: '--' },
    ];
    const result = runUploadQc(rows);
    expect(result.calls).toHaveLength(2);
    expect(result.calls[0].rsid).toBe('rs1');
    expect(result.calls[1].rsid).toBe('rs2');
  });

  it('normalized_genotype strips separators and uppercases', () => {
    const rows = [{ rsid: 'rs1', genotype: 'c/t' }];
    const result = runUploadQc(rows);
    expect(result.calls[0].normalized_genotype).toBe('CT');
  });

  it('empty rows array returns clean status with confidence 0 edge case', () => {
    const result = runUploadQc([]);
    // No calls -> no blocked calls either; treat as clean (nothing to fail)
    expect(result.calls).toHaveLength(0);
    expect(result.normalization_confidence).toBe(0);
  });

  it('palindromic call (AT) without reference is ambiguous and not resolved', () => {
    const rows = [{ rsid: 'rs1', genotype: 'AT' }];
    const result = runUploadQc(rows);
    const call = result.calls[0];
    expect(call.orientation).toBe('ambiguous');
    expect(call.orientation_resolved).toBe(false);
  });
});
