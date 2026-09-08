import { describe, expect, it } from 'vitest';
import {
  CIRC_FAIL_COPY,
  CIRC_FAIL_REASONS,
  classifyCircFail,
  isCircFailReason,
  resolveSurfaceCircFail,
} from '../circFailReason';

describe('circFailReason surface taxonomy', () => {
  it('lists timeout | empty_landmarks | extract_throw | all_unknown | height', () => {
    expect(CIRC_FAIL_REASONS).toEqual([
      'timeout',
      'empty_landmarks',
      'extract_throw',
      'all_unknown',
      'height',
    ]);
  });

  it('never invents cm / girths / Muscle lbs in copy', () => {
    for (const reason of CIRC_FAIL_REASONS) {
      expect(CIRC_FAIL_COPY[reason]).toMatch(/not invented|never guess/i);
      expect(CIRC_FAIL_COPY[reason]).not.toMatch(/\d+\s*cm/i);
      expect(CIRC_FAIL_COPY[reason]).not.toMatch(/muscle\s*lbs/i);
    }
  });

  it('prefers height, then front view, then all_unknown', () => {
    expect(resolveSurfaceCircFail({ heightMissing: true })).toBe('height');
    expect(
      resolveSurfaceCircFail({
        viewFails: [
          { pose: 'back', reason: 'timeout' },
          { pose: 'front', reason: 'empty_landmarks' },
        ],
      }),
    ).toBe('empty_landmarks');
    expect(resolveSurfaceCircFail({ hasFiniteGirth: false })).toBe('all_unknown');
    expect(resolveSurfaceCircFail({ hasFiniteGirth: true })).toBeNull();
  });

  it('classifies timeout vs empty landmarks vs extract throw', () => {
    expect(classifyCircFail({ landmarkCount: 0 })).toBe('empty_landmarks');
    expect(classifyCircFail({ error: new Error('Pose detection timeout') })).toBe('timeout');
    expect(classifyCircFail({ error: new Error('Front silhouette required') })).toBe('extract_throw');
  });

  it('maps non-timeout detect/process throws to empty_landmarks, not extract_throw', () => {
    expect(classifyCircFail({
      error: new Error('Landmark detection failed for front'),
      viewStage: 'detect',
    })).toBe('empty_landmarks');
    expect(classifyCircFail({
      error: new Error('IMAGE Pose detect threw'),
      viewStage: 'detect',
    })).toBe('empty_landmarks');
    expect(classifyCircFail({
      error: new Error('Segmentation failed for front'),
      viewStage: 'process',
    })).toBe('empty_landmarks');
    expect(classifyCircFail({
      error: new Error('Pose detection timeout'),
      viewStage: 'detect',
    })).toBe('timeout');
    expect(classifyCircFail({
      error: new Error('[T9] front view CV timeout after 12000ms'),
      viewStage: 'process',
    })).toBe('timeout');
    expect(classifyCircFail({
      error: new Error('Unable to compute pixel-to-cm scale. Verify user height and landmark detection.'),
    })).toBe('extract_throw');
  });

  it('guards unknown strings without inventing a reason', () => {
    expect(isCircFailReason('timeout')).toBe(true);
    expect(isCircFailReason('all_unknown')).toBe(true);
    expect(isCircFailReason('invented')).toBe(false);
    expect(isCircFailReason(undefined)).toBe(false);
  });
});
