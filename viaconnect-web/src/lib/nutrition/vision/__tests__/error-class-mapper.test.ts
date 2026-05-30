// Prompt #170a supplement §20.B: exhaustive map AIRouteError -> error_class.

import { describe, it, expect } from 'vitest';
import { mapAIErrorToClass } from '../error-class-mapper';

describe('mapAIErrorToClass', () => {
  it('maps BUDGET_HIT to budget_hard_stop regardless of message', () => {
    expect(mapAIErrorToClass('BUDGET_HIT')).toBe('budget_hard_stop');
    expect(mapAIErrorToClass('BUDGET_HIT', 'whatever')).toBe('budget_hard_stop');
  });

  it('maps INVALID_INPUT with "too large" to image_too_large', () => {
    expect(mapAIErrorToClass('INVALID_INPUT', 'payload too large')).toBe('image_too_large');
    expect(mapAIErrorToClass('INVALID_INPUT', 'Payload Too Large')).toBe('image_too_large');
  });

  it('maps INVALID_INPUT with "413" to image_too_large', () => {
    expect(mapAIErrorToClass('INVALID_INPUT', 'http 413')).toBe('image_too_large');
  });

  it('maps INVALID_INPUT with corrupt hints to image_corrupt', () => {
    expect(mapAIErrorToClass('INVALID_INPUT', 'image corrupt')).toBe('image_corrupt');
    expect(mapAIErrorToClass('INVALID_INPUT', 'failed to decode jpeg')).toBe('image_corrupt');
    expect(mapAIErrorToClass('INVALID_INPUT', 'unsupported heic file')).toBe('image_corrupt');
  });

  it('maps INVALID_INPUT with other messages to unknown', () => {
    expect(mapAIErrorToClass('INVALID_INPUT', 'missing field')).toBe('unknown');
    expect(mapAIErrorToClass('INVALID_INPUT')).toBe('unknown');
  });

  it('maps API_DOWN with timeout hints to provider_timeout', () => {
    expect(mapAIErrorToClass('API_DOWN', 'gateway timeout')).toBe('provider_timeout');
    expect(mapAIErrorToClass('API_DOWN', '504 gateway')).toBe('provider_timeout');
  });

  it('maps API_DOWN without timeout hints to provider_outage', () => {
    expect(mapAIErrorToClass('API_DOWN', 'service unavailable')).toBe('provider_outage');
    expect(mapAIErrorToClass('API_DOWN')).toBe('provider_outage');
  });

  it('maps TIMEOUT to provider_timeout', () => {
    expect(mapAIErrorToClass('TIMEOUT')).toBe('provider_timeout');
  });

  it('maps RATE_LIMITED to provider_outage', () => {
    expect(mapAIErrorToClass('RATE_LIMITED')).toBe('provider_outage');
  });

  it('maps CONFIG_MISSING, MALFORMED_RESPONSE, NO_RECOGNITION, UNAUTHENTICATED to unknown', () => {
    expect(mapAIErrorToClass('CONFIG_MISSING')).toBe('unknown');
    expect(mapAIErrorToClass('MALFORMED_RESPONSE')).toBe('unknown');
    expect(mapAIErrorToClass('NO_RECOGNITION')).toBe('unknown');
    expect(mapAIErrorToClass('UNAUTHENTICATED')).toBe('unknown');
  });

  it('maps AUTH_MISSING and AUTH_INVALID to unknown (auth wall is upstream)', () => {
    expect(mapAIErrorToClass('AUTH_MISSING')).toBe('unknown');
    expect(mapAIErrorToClass('AUTH_INVALID')).toBe('unknown');
  });

  it('maps UNKNOWN to unknown', () => {
    expect(mapAIErrorToClass('UNKNOWN')).toBe('unknown');
  });

  it('is case-insensitive on message hints', () => {
    expect(mapAIErrorToClass('INVALID_INPUT', 'CORRUPT image')).toBe('image_corrupt');
    expect(mapAIErrorToClass('API_DOWN', 'TIMEOUT detected')).toBe('provider_timeout');
  });
});
