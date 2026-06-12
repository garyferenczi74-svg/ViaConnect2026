// Prompt 192 Task 3 (TDD): Helix digest award gating and once per ISO
// week behavior with an injected fake client.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DIGEST_AWARD_AMOUNT,
  INSIGHTS_DIGEST_SOURCE,
  awardFirstWeeklyDigestReview,
  isoWeekKey,
} from '../helixAward';
import { findCall, makeFakeAdmin, type FakeCall } from './fake-admin';

const FLAG_ENV = 'INSIGHTS_HELIX_AWARD';

let savedFlag: string | undefined;

beforeEach(() => {
  savedFlag = process.env[FLAG_ENV];
  delete process.env[FLAG_ENV];
});

afterEach(() => {
  if (savedFlag !== undefined) process.env[FLAG_ENV] = savedFlag;
  else delete process.env[FLAG_ENV];
});

describe('isoWeekKey', () => {
  it('computes ISO weeks including year boundary spill', () => {
    expect(isoWeekKey('2026-01-01T00:00:00.000Z')).toBe('2026-W01');
    expect(isoWeekKey('2026-01-04T23:59:59.000Z')).toBe('2026-W01'); // Sunday closes W01
    expect(isoWeekKey('2026-01-05T00:00:00.000Z')).toBe('2026-W02'); // Monday opens W02
    expect(isoWeekKey('2025-12-29T12:00:00.000Z')).toBe('2026-W01'); // spill into next ISO year
    expect(isoWeekKey('2026-06-12T15:00:00.000Z')).toBe('2026-W24');
  });
});

describe('awardFirstWeeklyDigestReview', () => {
  it('is a logged no-op when the flag is off (launch state, registry default)', async () => {
    const { client, calls } = makeFakeAdmin();
    await awardFirstWeeklyDigestReview(client, 'user-1');
    expect(calls).toEqual([]);
  });

  it('stays a no-op when the env override is explicitly false', async () => {
    process.env[FLAG_ENV] = 'false';
    const { client, calls } = makeFakeAdmin();
    await awardFirstWeeklyDigestReview(client, 'user-1');
    expect(calls).toEqual([]);
  });

  it('awards one helix-bridge shaped row when on with no prior row this week', async () => {
    process.env[FLAG_ENV] = 'true';
    const { client, calls } = makeFakeAdmin({
      helix_transactions: (call: FakeCall) => (call.op === 'select' ? { data: [] } : {}),
    });
    await awardFirstWeeklyDigestReview(client, 'user-1');

    const insert = findCall(calls, 'helix_transactions', 'insert');
    expect(insert).toBeDefined();
    const row = insert?.payload as Record<string, unknown>;
    expect(row.user_id).toBe('user-1');
    expect(row.amount).toBe(DIGEST_AWARD_AMOUNT);
    expect(row.type).toBe('earn');
    expect(row.source).toBe(INSIGHTS_DIGEST_SOURCE);
    expect(row.event_type_id).toBe(INSIGHTS_DIGEST_SOURCE);
    const metadata = row.metadata as Record<string, unknown>;
    expect(metadata.event_key).toBe(INSIGHTS_DIGEST_SOURCE);
    expect(metadata.source).toBe('insights');
    expect(metadata.week_key).toMatch(/^\d{4}-W\d{2}$/);
    expect(metadata.week_key).toBe(isoWeekKey(new Date().toISOString()));
  });

  it('skips the insert when a row for the current ISO week already exists', async () => {
    process.env[FLAG_ENV] = 'true';
    const { client, calls } = makeFakeAdmin({
      helix_transactions: (call: FakeCall) =>
        call.op === 'select' ? { data: [{ id: 'tx-1' }] } : {},
    });
    await awardFirstWeeklyDigestReview(client, 'user-1');

    expect(findCall(calls, 'helix_transactions', 'insert')).toBeUndefined();
    const check = findCall(calls, 'helix_transactions', 'select');
    expect(check?.filters.some((f) => f.method === 'contains')).toBe(true);
    expect(
      check?.filters.some((f) => f.method === 'eq' && f.args[1] === INSIGHTS_DIGEST_SOURCE),
    ).toBe(true);
  });

  it('never throws when the insert errors (best effort contract)', async () => {
    process.env[FLAG_ENV] = 'true';
    const { client } = makeFakeAdmin({
      helix_transactions: (call: FakeCall) =>
        call.op === 'insert' ? { error: { message: 'boom' } } : { data: [] },
    });
    await expect(awardFirstWeeklyDigestReview(client, 'user-1')).resolves.toBeUndefined();
  });
});
