// Prompt Brief 2: compare telemetry payload tests. PII-clean, no any.

import { describe, it, expect } from 'vitest';
import { ALL_COMPARE_EVENTS, buildCompareEventPayload } from '../compareTelemetry';

describe('compareTelemetry: event set', () => {
  it('declares the single ab_compared event', () => {
    expect(ALL_COMPARE_EVENTS).toEqual(['formavision.ab_compared']);
  });
});

describe('buildCompareEventPayload', () => {
  it('keeps only coarse properties and defaults the FormaVision surface', () => {
    const payload = buildCompareEventPayload('formavision.ab_compared', {
      baseline: 'last_scan',
      ok: true,
    });
    expect(payload.event).toBe('formavision.ab_compared');
    expect(payload.properties).toEqual({ baseline: 'last_scan', ok: true });
    expect(payload.page).toBe('/body-tracker/formavision');
  });

  it('never carries a name, email, url, or storage path key', () => {
    const payload = buildCompareEventPayload('formavision.ab_compared', {
      surface: '/body-tracker/formavision',
      baseline: 'first_scan_fallback',
      ok: true,
    });
    const keys = Object.keys(payload.properties);
    for (const forbidden of ['name', 'email', 'signedUrl', 'url', 'storagePath', 'displayName']) {
      expect(keys).not.toContain(forbidden);
    }
  });
});
