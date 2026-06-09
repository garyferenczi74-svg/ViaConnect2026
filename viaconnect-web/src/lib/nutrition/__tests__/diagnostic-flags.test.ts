import { afterEach, describe, expect, it } from 'vitest';
import {
  isNutritionDiagnosticsEnabled,
  isNutritionBenchmarkMode,
} from '../diagnostic-flags';

const DIAGNOSTICS_KEY = 'NUTRITION_DIAGNOSTICS_ENABLED';
const BENCHMARK_KEY = 'NUTRITION_BENCHMARK_MODE';

afterEach(() => {
  delete process.env[DIAGNOSTICS_KEY];
  delete process.env[BENCHMARK_KEY];
});

describe('isNutritionDiagnosticsEnabled', () => {
  it('defaults to false when the env var is unset', () => {
    delete process.env[DIAGNOSTICS_KEY];
    expect(isNutritionDiagnosticsEnabled()).toBe(false);
  });

  it.each(['true', '1', 'yes', 'on', 'TRUE', 'Yes', ' on '])(
    'returns true for the truthy token %s',
    (value) => {
      process.env[DIAGNOSTICS_KEY] = value;
      expect(isNutritionDiagnosticsEnabled()).toBe(true);
    }
  );

  it.each(['false', '0', 'no', 'off', 'garbage', ''])(
    'returns false for the non-truthy value %s',
    (value) => {
      process.env[DIAGNOSTICS_KEY] = value;
      expect(isNutritionDiagnosticsEnabled()).toBe(false);
    }
  );

  it('does not throw when the env var is undefined', () => {
    delete process.env[DIAGNOSTICS_KEY];
    expect(() => isNutritionDiagnosticsEnabled()).not.toThrow();
  });
});

describe('isNutritionBenchmarkMode', () => {
  it('defaults to false when the env var is unset', () => {
    delete process.env[BENCHMARK_KEY];
    expect(isNutritionBenchmarkMode()).toBe(false);
  });

  it('returns true for a truthy token', () => {
    process.env[BENCHMARK_KEY] = 'true';
    expect(isNutritionBenchmarkMode()).toBe(true);
  });

  it('is independent of the diagnostics flag', () => {
    process.env[DIAGNOSTICS_KEY] = 'true';
    delete process.env[BENCHMARK_KEY];
    expect(isNutritionDiagnosticsEnabled()).toBe(true);
    expect(isNutritionBenchmarkMode()).toBe(false);
  });
});
