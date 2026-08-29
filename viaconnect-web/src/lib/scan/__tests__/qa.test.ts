import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { evaluatePose, evaluateWeakFrame, messageForCode } from '../qa';

const dir = join(__dirname, '..', '__fixtures__');
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));

describe('evaluatePose against fixtures', () => {
  for (const f of files) {
    it(`${f} returns its expected code`, () => {
      const fx = JSON.parse(readFileSync(join(dir, f), 'utf8'));
      const r = evaluatePose({ landmarks: fx.landmarks, pose: fx.pose, frameWidth: 1080, frameHeight: 1920, blurScore: fx.blurScore ?? 1000 });
      expect(r.code).toBe(fx.expected);
      expect(r.pass).toBe(fx.expected === 'PASS');
      expect(r.message).toBe(messageForCode(fx.expected));
      expect(r.mode).toBe('landmarker');
    });
  }
  it('null landmarks is NO_BODY', () => {
    const r = evaluatePose({ landmarks: null, pose: 'front', frameWidth: 1080, frameHeight: 1920, blurScore: 1000 });
    expect(r.code).toBe('NO_BODY');
  });
  it('weak fallback passes facing but still fails on blur', () => {
    expect(evaluateWeakFrame({ luminanceVariance: 500, exposure: 0.5, blurScore: 1000 }).pass).toBe(true);
    expect(evaluateWeakFrame({ luminanceVariance: 500, exposure: 0.5, blurScore: 1 }).code).toBe('BLURRY');
  });
});
