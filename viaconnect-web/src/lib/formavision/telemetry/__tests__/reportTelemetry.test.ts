/**
 * src/lib/formavision/telemetry/__tests__/reportTelemetry.test.ts
 *
 * Prompt 211a Workstream 3: unit tests for the scan-report telemetry helper.
 * Node-safe (no jsdom); the pure payload builder is tested directly. Zero any.
 * Rules: no em dashes, no en dashes, no emojis.
 */

import { describe, it, expect } from 'vitest';
import {
  ALL_REPORT_EVENTS,
  buildReportEventPayload,
} from '@/lib/formavision/telemetry/reportTelemetry';

describe('reportTelemetry: event set', () => {
  it('declares exactly the two report events', () => {
    expect(ALL_REPORT_EVENTS).toEqual([
      'formavision.report_generated',
      'formavision.report_shared',
    ]);
  });
});

describe('reportTelemetry: buildReportEventPayload is pure + PII-clean', () => {
  it('keeps only coarse properties (surface, channel, ok)', () => {
    const payload = buildReportEventPayload('formavision.report_shared', {
      surface: '/body-tracker/composition',
      channel: 'download',
      ok: true,
    });
    expect(payload.event).toBe('formavision.report_shared');
    expect(payload.properties).toEqual({
      surface: '/body-tracker/composition',
      channel: 'download',
      ok: true,
    });
    expect(payload.page).toBe('/body-tracker/composition');
  });

  it('drops undefined fields (no null noise in the payload)', () => {
    const payload = buildReportEventPayload('formavision.report_generated', { ok: true });
    expect(payload.properties).toEqual({ ok: true });
    expect(Object.keys(payload.properties)).not.toContain('surface');
    expect(Object.keys(payload.properties)).not.toContain('channel');
  });

  it('never carries a name, email, url, or storage path key', () => {
    const payload = buildReportEventPayload('formavision.report_shared', {
      surface: 's',
      channel: 'native_share',
      ok: false,
    });
    const keys = Object.keys(payload.properties);
    for (const forbidden of ['name', 'email', 'signedUrl', 'url', 'storagePath', 'displayName']) {
      expect(keys).not.toContain(forbidden);
    }
  });

  it('falls back to the composition surface page when surface is omitted', () => {
    const payload = buildReportEventPayload('formavision.report_generated', {});
    expect(payload.page).toBe('/body-tracker/composition');
  });
});
