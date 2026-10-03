import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AI_DATA_SHARING_CONSENT_VERSION,
  aiRouteNeedsConsent,
  consentIsCurrent,
  decideAiConsentAccess,
} from '../consent';

const CURRENT = {
  acceptedAt: '2026-10-03T12:00:00.000Z',
  revokedAt: null,
  version: AI_DATA_SHARING_CONSENT_VERSION,
};

describe('consentIsCurrent', () => {
  it('accepts the current version with no revoke', () => {
    expect(consentIsCurrent(CURRENT)).toBe(true);
  });

  it('rejects a missing row, an old version, and a later revoke', () => {
    expect(consentIsCurrent(null)).toBe(false);
    expect(consentIsCurrent({ ...CURRENT, version: '2026-01-01.v0' })).toBe(false);
    expect(
      consentIsCurrent({
        ...CURRENT,
        revokedAt: '2026-10-03T13:00:00.000Z',
      }),
    ).toBe(false);
  });

  it('accepts a revoke that happened before a later agree', () => {
    expect(
      consentIsCurrent({
        ...CURRENT,
        acceptedAt: '2026-10-03T14:00:00.000Z',
        revokedAt: '2026-10-03T13:00:00.000Z',
      }),
    ).toBe(true);
  });
});

describe('decideAiConsentAccess', () => {
  it('allows every call while the gate is off', () => {
    expect(decideAiConsentAccess(false, null, 'error')).toBe('allow');
  });

  it('fails closed while the gate is on', () => {
    expect(decideAiConsentAccess(true, null, CURRENT)).toBe('unauthenticated');
    expect(decideAiConsentAccess(true, 'user-1', 'error')).toBe('denied');
    expect(decideAiConsentAccess(true, 'user-1', null)).toBe('denied');
    expect(decideAiConsentAccess(true, 'user-1', CURRENT)).toBe('allow');
  });
});

describe('aiRouteNeedsConsent', () => {
  it('covers personal-data AI posts and skips the consent and report routes', () => {
    expect(aiRouteNeedsConsent('/api/advisor/chat', 'POST')).toBe(true);
    expect(aiRouteNeedsConsent('/api/hannah/ask', 'POST')).toBe(true);
    expect(aiRouteNeedsConsent('/api/hannah/avatar/session', 'POST')).toBe(true);
    expect(aiRouteNeedsConsent('/api/ai/meal-analysis', 'POST')).toBe(true);
    expect(aiRouteNeedsConsent('/api/nutrition/voice/transcribe', 'POST')).toBe(true);
    expect(aiRouteNeedsConsent('/api/nutrition/voice-native/parse', 'POST')).toBe(true);
    expect(aiRouteNeedsConsent('/api/admin/legal/cases/abc/triage', 'POST')).toBe(true);
    expect(aiRouteNeedsConsent('/api/ai/consent', 'POST')).toBe(false);
    expect(aiRouteNeedsConsent('/api/ai/report', 'POST')).toBe(false);
    expect(aiRouteNeedsConsent('/api/advisor/history', 'GET')).toBe(false);
    expect(aiRouteNeedsConsent('/api/advisor/chat', 'GET')).toBe(false);
    expect(aiRouteNeedsConsent('/api/nutrition/meals', 'POST')).toBe(false);
  });
});

describe('edge consent version', () => {
  it('matches the Next.js consent text version', () => {
    const edge = readFileSync(
      resolve(process.cwd(), 'supabase/functions/_shared/ai-data-sharing-consent.ts'),
      'utf8',
    );
    expect(edge).toContain(`'${AI_DATA_SHARING_CONSENT_VERSION}'`);
  });
});
