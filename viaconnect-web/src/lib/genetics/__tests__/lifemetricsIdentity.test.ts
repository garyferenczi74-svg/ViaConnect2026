/**
 * LifeMetrics identity resolver tests.
 * Never fall back to a hardcoded member. Ambiguous or empty matches stay unmatched.
 * No em or en dashes.
 */

import { describe, expect, it } from 'vitest';
import {
  extractLifemetricsIdentityHints,
  pickExclusiveUserId,
  resolveLifemetricsUserId,
} from '../lifemetricsIdentity';

const GARY = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('pickExclusiveUserId', () => {
  it('returns the only match', () => {
    expect(pickExclusiveUserId([OTHER])).toBe(OTHER);
  });

  it('returns null when empty or when more than one member matches', () => {
    expect(pickExclusiveUserId([])).toBeNull();
    expect(pickExclusiveUserId([GARY, OTHER])).toBeNull();
  });
});

describe('resolveLifemetricsUserId', () => {
  it('never writes onto a fallback member when hints are empty', async () => {
    const userId = await resolveLifemetricsUserId(
      {},
      {
        findProfileId: async () => GARY,
        findUserIdsByEmail: async () => [GARY],
        findUserIdsByKitBarcode: async () => [GARY],
      },
    );
    expect(userId).toBeNull();
  });

  it('rejects an explicit user id that is not a live profile', async () => {
    const userId = await resolveLifemetricsUserId(
      { userId: GARY },
      {
        findProfileId: async () => null,
        findUserIdsByEmail: async () => [GARY],
        findUserIdsByKitBarcode: async () => [GARY],
      },
    );
    expect(userId).toBeNull();
  });

  it('uses an exclusive email match and not a second member', async () => {
    const userId = await resolveLifemetricsUserId(
      { email: 'member@example.test' },
      {
        findProfileId: async () => GARY,
        findUserIdsByEmail: async () => [OTHER],
        findUserIdsByKitBarcode: async () => [GARY],
      },
    );
    expect(userId).toBe(OTHER);
  });

  it('stays unmatched when email hits more than one account', async () => {
    const userId = await resolveLifemetricsUserId(
      { email: 'shared@example.test' },
      {
        findProfileId: async () => GARY,
        findUserIdsByEmail: async () => [GARY, OTHER],
        findUserIdsByKitBarcode: async () => [OTHER],
      },
    );
    expect(userId).toBeNull();
  });
});

describe('extractLifemetricsIdentityHints', () => {
  it('reads nested patient email and kit barcode without inventing a user id', () => {
    const hints = extractLifemetricsIdentityHints({
      event_id: 'evt_hints',
      data: { patient: { email: 'member@example.test' }, kit_barcode: 'KIT-TEST-1' },
    });
    expect(hints.email).toBe('member@example.test');
    expect(hints.kitBarcode).toBe('KIT-TEST-1');
    expect(hints.userId).toBeNull();
  });
});
