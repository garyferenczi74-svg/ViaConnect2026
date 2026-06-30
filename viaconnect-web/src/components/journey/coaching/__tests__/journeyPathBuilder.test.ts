/**
 * src/components/journey/coaching/__tests__/journeyPathBuilder.test.ts
 *
 * Unit tests for buildLinePath (Prompt 208k Task T3).
 *
 * Tests: empty array, all-null, all-present, leading/trailing/internal gaps,
 * single-point islands, multiple islands, gap at start then line, line then gap.
 */

import { describe, expect, it } from 'vitest';
import { buildLinePath } from '../journeyPathBuilder';

// Simple coordinate mappers: x = index * 10, y = 100 - value.
// xOf(0)=0, xOf(1)=10, xOf(2)=20, xOf(3)=30, xOf(4)=40.
// yOf(50)=50, yOf(60)=40, yOf(70)=30, yOf(80)=20, yOf(0)=100, yOf(100)=0.
const xOf = (i: number) => i * 10;
const yOf = (v: number) => 100 - v;

describe('buildLinePath', () => {
  it('returns empty string for empty array', () => {
    expect(buildLinePath([], xOf, yOf)).toBe('');
  });

  it('returns empty string when all values are null (all-null)', () => {
    expect(buildLinePath([null, null, null], xOf, yOf)).toBe('');
  });

  it('all-present series: M at first point, L for all subsequent', () => {
    expect(buildLinePath([50, 60, 70], xOf, yOf)).toBe(
      'M 0.0 50.0 L 10.0 40.0 L 20.0 30.0',
    );
  });

  it('single point produces M only, no L command', () => {
    const path = buildLinePath([42], xOf, yOf);
    expect(path).toBe('M 0.0 58.0');
    expect(path).not.toContain('L');
  });

  it('leading gap: skips null prefix, M starts at first non-null', () => {
    const path = buildLinePath([null, 50, 60], xOf, yOf);
    expect(path).toBe('M 10.0 50.0 L 20.0 40.0');
    // Index 0 x-coord must not appear as a path start
    expect(path).not.toMatch(/^M 0\.0/);
  });

  it('trailing gap: path ends at last non-null, does not reach gap bucket', () => {
    const path = buildLinePath([50, 60, null], xOf, yOf);
    expect(path).toBe('M 0.0 50.0 L 10.0 40.0');
  });

  it('internal gap: produces two separate sub-paths, not connected across gap', () => {
    const path = buildLinePath([50, 60, null, 70, 80], xOf, yOf);
    expect(path).toBe('M 0.0 50.0 L 10.0 40.0 M 30.0 30.0 L 40.0 20.0');
    // Two M commands: one per sub-path
    expect((path.match(/M /g) ?? []).length).toBe(2);
    // The gap index (i=2, xOf(2)=20) must not appear as an x-coordinate in a move or line command
    expect(path).not.toMatch(/[ML] 20\.0 /);
  });

  it('single-point island (null - value - null): M only, no L', () => {
    const path = buildLinePath([null, 50, null], xOf, yOf);
    expect(path).toBe('M 10.0 50.0');
    expect(path).not.toContain('L');
  });

  it('multiple single-point islands: separate M for each, no L between', () => {
    const path = buildLinePath([50, null, 60, null, 70], xOf, yOf);
    expect(path).toBe('M 0.0 50.0 M 20.0 40.0 M 40.0 30.0');
    expect((path.match(/M /g) ?? []).length).toBe(3);
    expect(path).not.toContain('L');
  });

  it('island at start then continuous run: solo M then M+L block', () => {
    const path = buildLinePath([50, null, 60, 70], xOf, yOf);
    expect(path).toBe('M 0.0 50.0 M 20.0 40.0 L 30.0 30.0');
  });

  it('continuous run then trailing island: M+L block then solo M', () => {
    const path = buildLinePath([50, 60, null, 70], xOf, yOf);
    expect(path).toBe('M 0.0 50.0 L 10.0 40.0 M 30.0 30.0');
  });

  it('multiple leading nulls then two points', () => {
    const path = buildLinePath([null, null, 50, 60], xOf, yOf);
    expect(path).toBe('M 20.0 50.0 L 30.0 40.0');
  });

  it('two points then multiple trailing nulls', () => {
    const path = buildLinePath([50, 60, null, null], xOf, yOf);
    expect(path).toBe('M 0.0 50.0 L 10.0 40.0');
  });

  it('maps y correctly: v=0 -> yOf(0)=100, v=100 -> yOf(100)=0', () => {
    // custom yOf: 200 - v*2, so v=0 -> 200, v=100 -> 0
    const customYOf = (v: number) => 200 - v * 2;
    const path = buildLinePath([0, 100], xOf, customYOf);
    expect(path).toBe('M 0.0 200.0 L 10.0 0.0');
  });
});
