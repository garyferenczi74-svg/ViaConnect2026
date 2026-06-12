// Tests for src/lib/scoring/pill-routes.ts.
//
// PILL_ROUTES is the SSOT for the BOS card pill destination_key to
// path map. The card's pill primitive looks up a route via
// getPillRoute(); a null return means the route is not wired and the
// pill renders disabled with a "Coming Soon" treatment per #162 §2.4.

import { describe, it, expect } from 'vitest';
import { PILL_ROUTES, getPillRoute, type PillDestinationKey } from '../pill-routes';

describe('PILL_ROUTES table', () => {
  it('contains all ten destination keys from #162 §2.4', () => {
    const expected: PillDestinationKey[] = [
      'caq_resume',
      'labs_upload',
      'genex360_purchase',
      'genex360_status',
      'nutrition_log',
      'supplements_protocol',
      'body_tracker',
      'wearable_dashboard',
      'plug_ins_directory',
      'helix_challenges',
    ];
    for (const key of expected) {
      expect(PILL_ROUTES[key]).toBeTypeOf('string');
      expect(PILL_ROUTES[key].length).toBeGreaterThan(0);
    }
    expect(Object.keys(PILL_ROUTES).sort()).toEqual([...expected].sort());
  });

  it('routes all start with a forward slash', () => {
    for (const route of Object.values(PILL_ROUTES)) {
      expect(route.startsWith('/')).toBe(true);
    }
  });

  it('uses verified consumer routes', () => {
    // Routes verified to exist on disk on 2026-05-12 (see module doc).
    expect(PILL_ROUTES.caq_resume).toBe('/onboarding/i-caq-intro');
    expect(PILL_ROUTES.labs_upload).toBe('/genetics#upload-lab-results');
    expect(PILL_ROUTES.genex360_purchase).toBe('/shop/genex360');
    expect(PILL_ROUTES.genex360_status).toBe('/genetics');
    expect(PILL_ROUTES.nutrition_log).toBe('/nutrition/photo-ai');
    expect(PILL_ROUTES.supplements_protocol).toBe('/supplements');
    expect(PILL_ROUTES.body_tracker).toBe('/body-tracker');
    expect(PILL_ROUTES.wearable_dashboard).toBe('/wearables');
    expect(PILL_ROUTES.plug_ins_directory).toBe('/plugins');
    expect(PILL_ROUTES.helix_challenges).toBe('/helix');
  });
});

describe('getPillRoute()', () => {
  it('returns the mapped route for a known key', () => {
    expect(getPillRoute('caq_resume')).toBe('/onboarding/i-caq-intro');
    expect(getPillRoute('helix_challenges')).toBe('/helix');
  });

  it('returns null for an unknown key', () => {
    expect(getPillRoute('unknown_key')).toBeNull();
    expect(getPillRoute('')).toBeNull();
  });

  it('returns null for null or undefined input', () => {
    expect(getPillRoute(null)).toBeNull();
    expect(getPillRoute(undefined)).toBeNull();
  });

  it('does not return inherited Object.prototype keys', () => {
    expect(getPillRoute('toString')).toBeNull();
    expect(getPillRoute('hasOwnProperty')).toBeNull();
  });
});
