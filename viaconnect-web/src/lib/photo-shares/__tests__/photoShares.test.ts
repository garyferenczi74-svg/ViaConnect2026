import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

// Prompt 231b: photoShares.ts is the data layer for user-facing management
// of practitioner access to body photos (R5a-1). These tests mock a
// supabase client passed directly into each function (the module takes the
// client as an argument rather than importing one, so no live DB / request
// context is needed here). They assert the query filters that make this
// safe (RLS-scoped columns, the tombstone-style revoked_at/expires_at
// filters), the fail-open resilience contract on reads, the explicit
// { ok: false } contract on write failures, the UNIQUE(photo_session_id,
// practitioner_id) upsert-based reactivation, and that revoke clears every
// non-revoked row for the owner+practitioner pair (account-wide, matching
// the folder-scoped storage grant).

vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  listShareablePractitioners,
  listActivePhotoShares,
  grantPhotoShare,
  revokePhotoShare,
} from '../photoShares';

type ChainResult = { data: unknown; error: unknown };

interface MockBuilder {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  gt: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  then: (
    resolve: (value: ChainResult) => void,
    reject: (reason?: unknown) => void,
  ) => void;
}

function makeBuilder(getResult: () => ChainResult | Promise<ChainResult>): MockBuilder {
  const builder = {} as MockBuilder;
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.is = vi.fn(() => builder);
  builder.gt = vi.fn(() => builder);
  builder.order = vi.fn(() => builder);
  builder.limit = vi.fn(() => builder);
  builder.in = vi.fn(() => builder);
  builder.upsert = vi.fn(() => builder);
  builder.update = vi.fn(() => builder);
  builder.single = vi.fn(() => builder);
  builder.then = (resolve, reject) => {
    Promise.resolve(getResult()).then(resolve, reject);
  };
  return builder;
}

function installTables(
  tables: Record<string, ChainResult | (() => ChainResult | Promise<ChainResult>)>,
): { from: ReturnType<typeof vi.fn>; builders: Record<string, MockBuilder> } {
  const builders: Record<string, MockBuilder> = {};
  for (const [table, result] of Object.entries(tables)) {
    builders[table] = makeBuilder(typeof result === 'function' ? result : () => result);
  }
  const from = vi.fn((table: string) => {
    const builder = builders[table];
    if (!builder) throw new Error(`unexpected table ${table}`);
    return builder;
  });
  return { from, builders };
}

function asSupabase(from: ReturnType<typeof vi.fn>): SupabaseClient {
  return { from } as unknown as SupabaseClient;
}

const PRACTITIONER_ROW = {
  user_id: 'pract-1',
  display_name: 'Casey Practitioner',
  patient_facing_display_name: 'Dr. Casey',
  practice_name: 'Casey Clinic',
};

describe('listShareablePractitioners', () => {
  it('queries practitioner_patients filtered to patient_id + status=active', async () => {
    const { from, builders } = installTables({
      practitioner_patients: { data: [{ practitioner_id: 'pract-1' }], error: null },
      practitioners: { data: [PRACTITIONER_ROW], error: null },
    });
    await listShareablePractitioners(asSupabase(from), 'user-1');
    expect(builders.practitioner_patients.eq.mock.calls).toContainEqual(['patient_id', 'user-1']);
    expect(builders.practitioner_patients.eq.mock.calls).toContainEqual(['status', 'active']);
  });

  it('resolves practitioners via user_id .in() and prefers patient_facing_display_name', async () => {
    const { from, builders } = installTables({
      practitioner_patients: { data: [{ practitioner_id: 'pract-1' }], error: null },
      practitioners: { data: [PRACTITIONER_ROW], error: null },
    });
    const result = await listShareablePractitioners(asSupabase(from), 'user-1');
    expect(builders.practitioners.in.mock.calls).toContainEqual(['user_id', ['pract-1']]);
    expect(result).toEqual([
      { practitionerId: 'pract-1', displayName: 'Dr. Casey', practiceName: 'Casey Clinic' },
    ]);
  });

  it('falls back to display_name when patient_facing_display_name is null', async () => {
    const { from } = installTables({
      practitioner_patients: { data: [{ practitioner_id: 'pract-1' }], error: null },
      practitioners: {
        data: [{ ...PRACTITIONER_ROW, patient_facing_display_name: null }],
        error: null,
      },
    });
    const result = await listShareablePractitioners(asSupabase(from), 'user-1');
    expect(result[0].displayName).toBe('Casey Practitioner');
  });

  it('dedups repeated practitioner_id links', async () => {
    const { from } = installTables({
      practitioner_patients: {
        data: [{ practitioner_id: 'pract-1' }, { practitioner_id: 'pract-1' }],
        error: null,
      },
      practitioners: { data: [PRACTITIONER_ROW], error: null },
    });
    const result = await listShareablePractitioners(asSupabase(from), 'user-1');
    expect(result).toHaveLength(1);
  });

  it('returns [] with no practitioners query when there are no active links', async () => {
    const { from, builders } = installTables({
      practitioner_patients: { data: [], error: null },
      practitioners: { data: [], error: null },
    });
    const result = await listShareablePractitioners(asSupabase(from), 'user-1');
    expect(result).toEqual([]);
    expect(builders.practitioners.select).not.toHaveBeenCalled();
  });

  it('fails open to [] on a links query error, never throws', async () => {
    const { from } = installTables({
      practitioner_patients: { data: null, error: { message: 'boom' } },
    });
    await expect(listShareablePractitioners(asSupabase(from), 'user-1')).resolves.toEqual([]);
  });

  it('fails open to [] on a practitioners query error, never throws', async () => {
    const { from } = installTables({
      practitioner_patients: { data: [{ practitioner_id: 'pract-1' }], error: null },
      practitioners: { data: null, error: { message: 'boom' } },
    });
    await expect(listShareablePractitioners(asSupabase(from), 'user-1')).resolves.toEqual([]);
  });

  it('fails open to [] when the query rejects (timeout-shaped), never throws', async () => {
    const { from } = installTables({
      practitioner_patients: () => Promise.reject(new Error('network down')),
    });
    await expect(listShareablePractitioners(asSupabase(from), 'user-1')).resolves.toEqual([]);
  });
});

describe('listActivePhotoShares', () => {
  const SHARE_ROW = {
    id: 'share-1',
    practitioner_id: 'pract-1',
    granted_at: '2026-08-01T00:00:00.000Z',
    expires_at: '2026-09-01T00:00:00.000Z',
  };

  it('filters to owner + non-revoked + not-yet-expired', async () => {
    const { from, builders } = installTables({
      photo_share_permissions: { data: [SHARE_ROW], error: null },
      practitioners: { data: [PRACTITIONER_ROW], error: null },
    });
    await listActivePhotoShares(asSupabase(from), 'user-1');
    expect(builders.photo_share_permissions.eq.mock.calls).toContainEqual([
      'photo_session_user_id',
      'user-1',
    ]);
    expect(builders.photo_share_permissions.is.mock.calls).toContainEqual(['revoked_at', null]);
    expect(builders.photo_share_permissions.gt.mock.calls[0][0]).toBe('expires_at');
  });

  it('groups multiple rows for the same practitioner into one entry', async () => {
    const { from } = installTables({
      photo_share_permissions: {
        data: [
          SHARE_ROW,
          { ...SHARE_ROW, id: 'share-2', granted_at: '2026-07-01T00:00:00.000Z' },
        ],
        error: null,
      },
      practitioners: { data: [PRACTITIONER_ROW], error: null },
    });
    const result = await listActivePhotoShares(asSupabase(from), 'user-1');
    expect(result).toHaveLength(1);
    expect(result[0].rowIds.sort()).toEqual(['share-1', 'share-2']);
    expect(result[0].grantedAt).toBe('2026-07-01T00:00:00.000Z');
  });

  it('attaches resolved practitioner display fields', async () => {
    const { from } = installTables({
      photo_share_permissions: { data: [SHARE_ROW], error: null },
      practitioners: { data: [PRACTITIONER_ROW], error: null },
    });
    const result = await listActivePhotoShares(asSupabase(from), 'user-1');
    expect(result[0]).toMatchObject({
      practitionerId: 'pract-1',
      displayName: 'Dr. Casey',
      practiceName: 'Casey Clinic',
    });
  });

  it('returns [] with no practitioners lookup when there are no active shares', async () => {
    const { from, builders } = installTables({
      photo_share_permissions: { data: [], error: null },
    });
    const result = await listActivePhotoShares(asSupabase(from), 'user-1');
    expect(result).toEqual([]);
    expect(builders.photo_share_permissions).toBeDefined();
  });

  it('fails open to [] on a query error, never throws', async () => {
    const { from } = installTables({
      photo_share_permissions: { data: null, error: { message: 'boom' } },
    });
    await expect(listActivePhotoShares(asSupabase(from), 'user-1')).resolves.toEqual([]);
  });

  it('fails open to [] when the query rejects, never throws', async () => {
    const { from } = installTables({
      photo_share_permissions: () => Promise.reject(new Error('down')),
    });
    await expect(listActivePhotoShares(asSupabase(from), 'user-1')).resolves.toEqual([]);
  });
});

// grantPhotoShare's first step is the active-link check against
// practitioner_patients; every test below that expects the flow to reach
// body_photo_sessions / photo_share_permissions must supply this so the
// active-link lookup itself succeeds.
const ACTIVE_LINK_RESULT = { data: [{ id: 'link-1' }], error: null };
const NOT_LINKED_RESULT = { data: [], error: null };

const UPSERTED_SHARE_RESULT = {
  data: {
    id: 'row-1',
    practitioner_id: 'pract-1',
    granted_at: '2026-08-01T00:00:00.000Z',
    expires_at: '2026-08-31T00:00:00.000Z',
  },
  error: null,
};

describe('grantPhotoShare', () => {
  it('returns not_linked when practitioner_patients has no ACTIVE row for this pair, and does not insert', async () => {
    const { from, builders } = installTables({
      practitioner_patients: NOT_LINKED_RESULT,
    });
    const result = await grantPhotoShare(asSupabase(from), 'user-1', 'pract-1');
    expect(result).toEqual({ ok: false, reason: 'not_linked' });
    expect(builders.practitioner_patients.eq.mock.calls).toContainEqual(['patient_id', 'user-1']);
    expect(builders.practitioner_patients.eq.mock.calls).toContainEqual([
      'practitioner_id',
      'pract-1',
    ]);
    expect(builders.practitioner_patients.eq.mock.calls).toContainEqual(['status', 'active']);
  });

  it('grants successfully when practitioner_patients has an ACTIVE row for this pair', async () => {
    const { from } = installTables({
      practitioner_patients: ACTIVE_LINK_RESULT,
      body_photo_sessions: { data: [{ id: 'sess-latest' }], error: null },
      photo_share_permissions: UPSERTED_SHARE_RESULT,
    });
    const result = await grantPhotoShare(asSupabase(from), 'user-1', 'pract-1');
    expect(result.ok).toBe(true);
  });

  it('returns { ok: false, reason: error } when the active-link query itself errors, not not_linked', async () => {
    const { from } = installTables({
      practitioner_patients: { data: null, error: { message: 'boom' } },
    });
    const result = await grantPhotoShare(asSupabase(from), 'user-1', 'pract-1');
    expect(result).toEqual({ ok: false, reason: 'error' });
  });

  it('returns no_photos when the user has no body_photo_sessions rows', async () => {
    const { from } = installTables({
      practitioner_patients: ACTIVE_LINK_RESULT,
      body_photo_sessions: { data: [], error: null },
    });
    const result = await grantPhotoShare(asSupabase(from), 'user-1', 'pract-1');
    expect(result).toEqual({ ok: false, reason: 'no_photos' });
  });

  it('returns { ok: false, reason: error } (not no_photos) when the body_photo_sessions query itself errors', async () => {
    const { from } = installTables({
      practitioner_patients: ACTIVE_LINK_RESULT,
      body_photo_sessions: { data: null, error: { message: 'connection reset' } },
    });
    const result = await grantPhotoShare(asSupabase(from), 'user-1', 'pract-1');
    expect(result).toEqual({ ok: false, reason: 'error' });
  });

  it('looks up the latest session ordered by session_date desc, limit 1', async () => {
    const { from, builders } = installTables({
      practitioner_patients: ACTIVE_LINK_RESULT,
      body_photo_sessions: { data: [{ id: 'sess-latest' }], error: null },
      photo_share_permissions: UPSERTED_SHARE_RESULT,
    });
    await grantPhotoShare(asSupabase(from), 'user-1', 'pract-1');
    expect(builders.body_photo_sessions.eq.mock.calls).toContainEqual(['user_id', 'user-1']);
    expect(builders.body_photo_sessions.order.mock.calls[0][0]).toBe('session_date');
    expect(builders.body_photo_sessions.order.mock.calls[0][1]).toMatchObject({
      ascending: false,
    });
    expect(builders.body_photo_sessions.limit.mock.calls[0][0]).toBe(1);
  });

  it('inserts (via upsert) with the latest session id and a computed 30-day expiry by default', async () => {
    const { from, builders } = installTables({
      practitioner_patients: ACTIVE_LINK_RESULT,
      body_photo_sessions: { data: [{ id: 'sess-latest' }], error: null },
      photo_share_permissions: UPSERTED_SHARE_RESULT,
    });
    const result = await grantPhotoShare(asSupabase(from), 'user-1', 'pract-1');
    expect(result.ok).toBe(true);
    const upsertCall = builders.photo_share_permissions.upsert.mock.calls[0];
    const [row] = upsertCall as [Record<string, unknown>, { onConflict: string }];
    expect(row).toMatchObject({
      photo_session_user_id: 'user-1',
      photo_session_id: 'sess-latest',
      practitioner_id: 'pract-1',
      revoked_at: null,
    });
    expect(typeof row.granted_at).toBe('string');
    expect(typeof row.expires_at).toBe('string');
    // 30 days later, to the millisecond, given a real ISO granted_at.
    const grantedMs = new Date(row.granted_at as string).getTime();
    const expiresMs = new Date(row.expires_at as string).getTime();
    expect(expiresMs - grantedMs).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it('handles the UNIQUE(photo_session_id, practitioner_id) conflict via upsert onConflict', async () => {
    const { from, builders } = installTables({
      practitioner_patients: ACTIVE_LINK_RESULT,
      body_photo_sessions: { data: [{ id: 'sess-latest' }], error: null },
      photo_share_permissions: UPSERTED_SHARE_RESULT,
    });
    await grantPhotoShare(asSupabase(from), 'user-1', 'pract-1');
    const [, opts] = builders.photo_share_permissions.upsert.mock.calls[0] as [
      unknown,
      { onConflict: string },
    ];
    expect(opts.onConflict).toBe('photo_session_id,practitioner_id');
  });

  it('respects a custom expiresInDays option', async () => {
    const { from, builders } = installTables({
      practitioner_patients: ACTIVE_LINK_RESULT,
      body_photo_sessions: { data: [{ id: 'sess-latest' }], error: null },
      photo_share_permissions: {
        data: {
          id: 'row-1',
          practitioner_id: 'pract-1',
          granted_at: '2026-08-01T00:00:00.000Z',
          expires_at: '2026-08-08T00:00:00.000Z',
        },
        error: null,
      },
    });
    await grantPhotoShare(asSupabase(from), 'user-1', 'pract-1', { expiresInDays: 7 });
    const [row] = builders.photo_share_permissions.upsert.mock.calls[0] as [
      Record<string, unknown>,
    ];
    const grantedMs = new Date(row.granted_at as string).getTime();
    const expiresMs = new Date(row.expires_at as string).getTime();
    expect(expiresMs - grantedMs).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('returns { ok: false, reason: error } when the upsert fails, never throws', async () => {
    const { from } = installTables({
      practitioner_patients: ACTIVE_LINK_RESULT,
      body_photo_sessions: { data: [{ id: 'sess-latest' }], error: null },
      photo_share_permissions: { data: null, error: { message: 'conflict' } },
    });
    const result = await grantPhotoShare(asSupabase(from), 'user-1', 'pract-1');
    expect(result).toEqual({ ok: false, reason: 'error' });
  });

  it('returns { ok: false, reason: error } when a query rejects, never throws', async () => {
    const { from } = installTables({
      practitioner_patients: ACTIVE_LINK_RESULT,
      body_photo_sessions: () => Promise.reject(new Error('down')),
    });
    const result = await grantPhotoShare(asSupabase(from), 'user-1', 'pract-1');
    expect(result).toEqual({ ok: false, reason: 'error' });
  });
});

describe('revokePhotoShare', () => {
  it('updates rows filtered by photo_session_user_id + practitioner_id + revoked_at is null', async () => {
    const { from, builders } = installTables({
      photo_share_permissions: { data: [{ id: 'row-1' }, { id: 'row-2' }], error: null },
    });
    await revokePhotoShare(asSupabase(from), 'user-1', 'pract-1');
    expect(builders.photo_share_permissions.eq.mock.calls).toContainEqual([
      'photo_session_user_id',
      'user-1',
    ]);
    expect(builders.photo_share_permissions.eq.mock.calls).toContainEqual([
      'practitioner_id',
      'pract-1',
    ]);
    expect(builders.photo_share_permissions.is.mock.calls).toContainEqual(['revoked_at', null]);
  });

  it('sets revoked_at on the update payload', async () => {
    const { from, builders } = installTables({
      photo_share_permissions: { data: [{ id: 'row-1' }], error: null },
    });
    await revokePhotoShare(asSupabase(from), 'user-1', 'pract-1');
    const [payload] = builders.photo_share_permissions.update.mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(typeof payload.revoked_at).toBe('string');
  });

  it('returns the count of rows revoked (account-wide, every matching row)', async () => {
    const { from } = installTables({
      photo_share_permissions: { data: [{ id: 'row-1' }, { id: 'row-2' }], error: null },
    });
    const result = await revokePhotoShare(asSupabase(from), 'user-1', 'pract-1');
    expect(result).toEqual({ ok: true, count: 2 });
  });

  it('returns count 0 when nothing matched, still ok:true', async () => {
    const { from } = installTables({
      photo_share_permissions: { data: [], error: null },
    });
    const result = await revokePhotoShare(asSupabase(from), 'user-1', 'pract-1');
    expect(result).toEqual({ ok: true, count: 0 });
  });

  it('returns { ok: false, reason: error } on an update error, never throws', async () => {
    const { from } = installTables({
      photo_share_permissions: { data: null, error: { message: 'boom' } },
    });
    const result = await revokePhotoShare(asSupabase(from), 'user-1', 'pract-1');
    expect(result).toEqual({ ok: false, reason: 'error' });
  });

  it('returns { ok: false, reason: error } when the update rejects, never throws', async () => {
    const { from } = installTables({
      photo_share_permissions: () => Promise.reject(new Error('down')),
    });
    const result = await revokePhotoShare(asSupabase(from), 'user-1', 'pract-1');
    expect(result).toEqual({ ok: false, reason: 'error' });
  });
});

beforeEach(() => {
  vi.clearAllMocks();
});
