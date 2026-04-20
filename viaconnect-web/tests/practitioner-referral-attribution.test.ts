// Prompt #98 Phase 2: Pure attribution resolver tests.

import { describe, it, expect } from 'vitest';
import {
  resolveAttributionFromSignals,
  detectSelfReferralSignalsPure,
  pickFirstClickWinner,
  isWithinAttributionWindow,
  type ResolverInput,
  type ClickRecord,
  type PractitionerSignals,
} from '@/lib/practitioner-referral/attribution-resolver';
import { ATTRIBUTION_WINDOW_DAYS_DEFAULT } from '@/lib/practitioner-referral/schema-types';

const NOW = new Date('2026-04-20T00:00:00.000Z');

function click(over: Partial<ClickRecord> = {}): ClickRecord {
  return {
    id: 'click_1',
    referral_code_id: 'code_A',
    referring_practitioner_id: 'prac_referrer',
    code_is_active: true,
    clicked_at: '2026-04-19T00:00:00.000Z',
    ...over,
  };
}

function practitionerSignals(over: Partial<PractitionerSignals> = {}): PractitionerSignals {
  return {
    practitioner_id: 'prac_referred',
    user_id: 'user_referred',
    practice_name: 'Smith Wellness LLC',
    practice_street_address: '123 Main St',
    practice_city: 'Buffalo',
    practice_state: 'NY',
    practice_postal_code: '14203',
    practice_phone: '+1-716-555-0100',
    ...over,
  };
}

function referrerSignals(over: Partial<PractitionerSignals> = {}): PractitionerSignals {
  return {
    practitioner_id: 'prac_referrer',
    user_id: 'user_referrer',
    practice_name: 'Jones Naturopathic',
    practice_street_address: '456 Oak Ave',
    practice_city: 'Rochester',
    practice_state: 'NY',
    practice_postal_code: '14604',
    practice_phone: '+1-585-555-0200',
    ...over,
  };
}

// ---------------------------------------------------------------------------
// isWithinAttributionWindow
// ---------------------------------------------------------------------------

describe('isWithinAttributionWindow', () => {
  it('exposes the spec default (90 days)', () => {
    expect(ATTRIBUTION_WINDOW_DAYS_DEFAULT).toBe(90);
  });

  it('returns true for a click 30 days ago', () => {
    const clickedAt = new Date(NOW.getTime() - 30 * 86_400_000).toISOString();
    expect(isWithinAttributionWindow(clickedAt, NOW)).toBe(true);
  });

  it('returns true for a click exactly 90 days ago', () => {
    const clickedAt = new Date(NOW.getTime() - 90 * 86_400_000).toISOString();
    expect(isWithinAttributionWindow(clickedAt, NOW)).toBe(true);
  });

  it('returns false for a click 91 days ago', () => {
    const clickedAt = new Date(NOW.getTime() - 91 * 86_400_000).toISOString();
    expect(isWithinAttributionWindow(clickedAt, NOW)).toBe(false);
  });

  it('honors a custom windowDays override', () => {
    const clickedAt = new Date(NOW.getTime() - 31 * 86_400_000).toISOString();
    expect(isWithinAttributionWindow(clickedAt, NOW, 30)).toBe(false);
    expect(isWithinAttributionWindow(clickedAt, NOW, 60)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// pickFirstClickWinner
// ---------------------------------------------------------------------------

describe('pickFirstClickWinner', () => {
  it('returns null when no clicks supplied', () => {
    expect(pickFirstClickWinner([])).toBeNull();
  });

  it('returns the only click when there is just one', () => {
    const c = click();
    expect(pickFirstClickWinner([c])?.id).toBe(c.id);
  });

  it('returns the earliest click across multiple codes (first-click wins)', () => {
    const earlier = click({ id: 'c_early', clicked_at: '2026-04-10T00:00:00.000Z', referral_code_id: 'code_A', referring_practitioner_id: 'prac_a' });
    const later   = click({ id: 'c_late',  clicked_at: '2026-04-15T00:00:00.000Z', referral_code_id: 'code_B', referring_practitioner_id: 'prac_b' });
    expect(pickFirstClickWinner([later, earlier])?.id).toBe('c_early');
  });

  it('skips clicks tied to inactive codes', () => {
    const inactive = click({ id: 'c_inactive', clicked_at: '2026-04-10T00:00:00.000Z', code_is_active: false });
    const active   = click({ id: 'c_active',   clicked_at: '2026-04-15T00:00:00.000Z', code_is_active: true });
    expect(pickFirstClickWinner([inactive, active])?.id).toBe('c_active');
  });

  it('returns null when all candidate codes are inactive', () => {
    expect(pickFirstClickWinner([
      click({ code_is_active: false }),
      click({ id: 'c2', code_is_active: false }),
    ])).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// detectSelfReferralSignalsPure
// ---------------------------------------------------------------------------

describe('detectSelfReferralSignalsPure', () => {
  it('returns zero blocking signals when practitioners are clearly different', () => {
    const r = detectSelfReferralSignalsPure(referrerSignals(), practitionerSignals());
    expect(r.blocking_count).toBe(0);
    expect(r.same_user_id).toBe(false);
  });

  it('flags same_user_id as blocking', () => {
    const r = detectSelfReferralSignalsPure(
      referrerSignals({ user_id: 'shared_user' }),
      practitionerSignals({ user_id: 'shared_user' }),
    );
    expect(r.blocking_count).toBeGreaterThan(0);
    expect(r.same_user_id).toBe(true);
  });

  it('flags fuzzy practice-name match (>0.85 similarity)', () => {
    const r = detectSelfReferralSignalsPure(
      referrerSignals({ practice_name: 'Smith Wellness LLC' }),
      practitionerSignals({ practice_name: 'Smyth Wellness LLC' }),
    );
    expect(r.name_similarity).toBeGreaterThan(0.85);
    expect(r.blocking_count).toBeGreaterThan(0);
    expect(r.primary_flag_type).toBe('self_referral_name_match');
  });

  it('does not flag dissimilar names', () => {
    const r = detectSelfReferralSignalsPure(
      referrerSignals({ practice_name: 'Acme Wellness Group' }),
      practitionerSignals({ practice_name: 'Beta Holistic Center' }),
    );
    expect(r.name_similarity).toBeLessThan(0.85);
  });

  it('flags exact normalized address match', () => {
    const r = detectSelfReferralSignalsPure(
      referrerSignals({
        practice_street_address: '123 Main St',
        practice_city: 'Buffalo', practice_state: 'NY', practice_postal_code: '14203',
      }),
      practitionerSignals({
        practice_street_address: '123 MAIN ST',
        practice_city: 'buffalo', practice_state: 'ny', practice_postal_code: '14203',
      }),
    );
    expect(r.address_match).toBe(true);
    expect(r.blocking_count).toBeGreaterThan(0);
  });

  it('flags phone match after normalization', () => {
    const r = detectSelfReferralSignalsPure(
      referrerSignals({ practice_phone: '+1 (716) 555-0100' }),
      practitionerSignals({ practice_phone: '716.555.0100' }),
    );
    expect(r.phone_match).toBe(true);
    expect(r.blocking_count).toBeGreaterThan(0);
  });

  it('does not flag distinct phones', () => {
    const r = detectSelfReferralSignalsPure(
      referrerSignals({ practice_phone: '+1 (716) 555-0100' }),
      practitionerSignals({ practice_phone: '+1 (585) 555-0200' }),
    );
    expect(r.phone_match).toBe(false);
  });

  it('aggregates multiple signals into blocking_count', () => {
    const r = detectSelfReferralSignalsPure(
      referrerSignals({
        practice_name: 'Smith Wellness',
        practice_phone: '7165550100',
        practice_street_address: '1 Main', practice_city: 'B', practice_state: 'NY', practice_postal_code: '14203',
      }),
      practitionerSignals({
        practice_name: 'Smith Wellness',
        practice_phone: '7165550100',
        practice_street_address: '1 Main', practice_city: 'B', practice_state: 'NY', practice_postal_code: '14203',
      }),
    );
    // name + address + phone all match
    expect(r.blocking_count).toBeGreaterThanOrEqual(3);
  });

  it('payment_fingerprint_match always false in Phase 2 (Phase 5 wires Stripe)', () => {
    const r = detectSelfReferralSignalsPure(referrerSignals(), practitionerSignals());
    expect(r.payment_fingerprint_match).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// resolveAttributionFromSignals (composed)
// ---------------------------------------------------------------------------

describe('resolveAttributionFromSignals', () => {
  function input(over: Partial<ResolverInput> = {}): ResolverInput {
    return {
      now: NOW,
      visitor_uuid: 'visitor_1',
      cookie_code_slug: 'prac-jonesnatu-x',
      candidate_clicks: [click()],
      referrer_signals_lookup: async () => referrerSignals(),
      referred_signals: practitionerSignals(),
      ...over,
    };
  }

  it('returns attributed=false when no cookie or visitor uuid', async () => {
    const r1 = await resolveAttributionFromSignals(input({ visitor_uuid: null }));
    expect(r1.attributed).toBe(false);
    expect(r1.reason).toMatch(/no_cookie_or_visitor/);

    const r2 = await resolveAttributionFromSignals(input({ cookie_code_slug: null }));
    expect(r2.attributed).toBe(false);
  });

  it('returns attributed=false when no clicks match the visitor', async () => {
    const r = await resolveAttributionFromSignals(input({ candidate_clicks: [] }));
    expect(r.attributed).toBe(false);
    expect(r.reason).toMatch(/no_click/);
  });

  it('returns attributed=false when winner is outside the 90-day window', async () => {
    const oldClick = click({ clicked_at: new Date(NOW.getTime() - 100 * 86_400_000).toISOString() });
    const r = await resolveAttributionFromSignals(input({ candidate_clicks: [oldClick] }));
    expect(r.attributed).toBe(false);
    expect(r.reason).toMatch(/window_expired/);
  });

  it('blocks when referring practitioner equals referred practitioner (trivial self-referral)', async () => {
    const r = await resolveAttributionFromSignals(input({
      candidate_clicks: [click({ referring_practitioner_id: 'prac_referred' })],
      referrer_signals_lookup: async () => practitionerSignals({ practitioner_id: 'prac_referred' }),
    }));
    expect(r.attributed).toBe(false);
    expect(r.reason).toMatch(/self_referral/);
  });

  it('returns attributed=true with first-click winner picked correctly', async () => {
    const earlier = click({ id: 'c_a', clicked_at: '2026-04-10T00:00:00.000Z', referral_code_id: 'code_A', referring_practitioner_id: 'prac_a' });
    const later   = click({ id: 'c_b', clicked_at: '2026-04-15T00:00:00.000Z', referral_code_id: 'code_B', referring_practitioner_id: 'prac_b' });
    const r = await resolveAttributionFromSignals(input({
      candidate_clicks: [later, earlier],
      referrer_signals_lookup: async (id) => referrerSignals({ practitioner_id: id }),
    }));
    expect(r.attributed).toBe(true);
    expect(r.winning_click_id).toBe('c_a');
    expect(r.referring_practitioner_id).toBe('prac_a');
    expect(r.proposed_status).toBe('pending_verification');
  });

  it('proposes blocked_self_referral status when multi-signal match detected', async () => {
    const r = await resolveAttributionFromSignals(input({
      referrer_signals_lookup: async () => referrerSignals({
        practice_name: 'Smith Wellness LLC',
        practice_street_address: '123 Main St',
        practice_city: 'Buffalo', practice_state: 'NY', practice_postal_code: '14203',
        practice_phone: '+1 (716) 555-0100',
      }),
      // referred has same name + address + phone
    }));
    expect(r.attributed).toBe(false);
    expect(r.proposed_status).toBe('blocked_self_referral');
    expect(r.self_referral_signals?.blocking_count).toBeGreaterThanOrEqual(2);
  });

  it('exposes days_from_first_click_to_signup on success', async () => {
    const c = click({ clicked_at: new Date(NOW.getTime() - 5 * 86_400_000).toISOString() });
    const r = await resolveAttributionFromSignals(input({ candidate_clicks: [c] }));
    expect(r.attributed).toBe(true);
    expect(r.days_from_first_click_to_signup).toBe(5);
  });
});
