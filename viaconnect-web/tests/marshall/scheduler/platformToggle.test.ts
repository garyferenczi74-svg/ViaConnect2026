import { describe, it, expect, vi } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let currentSupabase: any = null;
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => currentSupabase,
}));

// ─── Supabase test double ─────────────────────────────────────────────────
interface SupabaseOpts {
  user?: { id: string } | null;
  role?: string;
  currentMode?: string;
  pendingChange?: { id: string } | null;
  change?: {
    id: string;
    platform: string;
    previous_mode: string;
    proposed_mode: string;
    proposed_by: string;
    approved_at: string | null;
    rejected_at: string | null;
  } | null;
  insertId?: string;
  updateReturnsNull?: boolean;
}

function mockSupabase(opts: SupabaseOpts) {
  let updatePatch: Record<string, unknown> | null = null;
  const supabase = {
    auth: {
      async getUser() { return { data: { user: opts.user ?? null } }; },
    },
    from(table: string) {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({ async maybeSingle() { return { data: opts.role ? { role: opts.role } : null }; } }),
          }),
        };
      }
      if (table === 'scheduler_platform_states') {
        return {
          select: () => ({
            eq: () => ({ async maybeSingle() { return { data: opts.currentMode ? { mode: opts.currentMode } : null }; } }),
          }),
          update(patch: Record<string, unknown>) {
            updatePatch = patch;
            return { async eq() { return { error: null }; } };
          },
        };
      }
      if (table === 'scheduler_platform_state_changes') {
        return {
          select: () => ({
            eq: (_col: string, _val: unknown) => ({
              is: () => ({
                is: () => ({
                  async maybeSingle() { return { data: opts.pendingChange ?? null }; },
                }),
              }),
              eq: () => ({
                async maybeSingle() { return { data: opts.change ?? null }; },
              }),
            }),
          }),
          insert() {
            return {
              select: () => ({
                async single() { return { data: { id: opts.insertId ?? 'change-1' }, error: null }; },
              }),
            };
          },
          update(patch: Record<string, unknown>) {
            updatePatch = patch;
            return {
              eq: () => ({
                is: () => ({
                  is: () => ({
                    select: () => ({
                      async maybeSingle() {
                        if (opts.updateReturnsNull) return { data: null, error: null };
                        return { data: { id: opts.change?.id, platform: opts.change?.platform, proposed_mode: opts.change?.proposed_mode }, error: null };
                      },
                    }),
                  }),
                  async maybeSingle() { return { data: null }; },
                }),
                async maybeSingle() { return { data: null }; },
              }),
            };
          },
        };
      }
      return {};
    },
    _latestUpdate() { return updatePatch; },
  };
  return supabase;
}

async function propose(body: unknown, platform = 'buffer') {
  const { POST } = await import('@/app/api/marshall/scheduler/admin/platforms/[platform]/propose/route');
  const req = new Request(`http://localhost/api/marshall/scheduler/admin/platforms/${platform}/propose`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return POST(req as any, { params: { platform } });
}

async function approve(body: unknown, platform = 'buffer') {
  const { POST } = await import('@/app/api/marshall/scheduler/admin/platforms/[platform]/approve/route');
  const req = new Request(`http://localhost/api/marshall/scheduler/admin/platforms/${platform}/approve`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return POST(req as any, { params: { platform } });
}

describe('POST /admin/platforms/[platform]/propose', () => {
  it('401 when unauthenticated', async () => {
    currentSupabase = mockSupabase({ user: null });
    const res = await propose({ proposedMode: 'scan_only', reason: 'x'.repeat(30) });
    expect(res.status).toBe(401);
  });

  it('403 when not admin', async () => {
    currentSupabase = mockSupabase({ user: { id: 'u1' }, role: 'practitioner' });
    const res = await propose({ proposedMode: 'scan_only', reason: 'x'.repeat(30) });
    expect(res.status).toBe(403);
  });

  it('400 on invalid platform', async () => {
    currentSupabase = mockSupabase({ user: { id: 'u1' }, role: 'admin', currentMode: 'active' });
    const res = await propose({ proposedMode: 'scan_only', reason: 'x'.repeat(30) }, 'bogus');
    expect(res.status).toBe(400);
  });

  it('400 on invalid mode', async () => {
    currentSupabase = mockSupabase({ user: { id: 'u1' }, role: 'admin', currentMode: 'active' });
    const res = await propose({ proposedMode: 'coffee', reason: 'x'.repeat(30) });
    expect(res.status).toBe(400);
  });

  it('400 on short reason', async () => {
    currentSupabase = mockSupabase({ user: { id: 'u1' }, role: 'admin', currentMode: 'active' });
    const res = await propose({ proposedMode: 'scan_only', reason: 'too short' });
    expect(res.status).toBe(400);
  });

  it('400 when proposed matches current', async () => {
    currentSupabase = mockSupabase({ user: { id: 'u1' }, role: 'admin', currentMode: 'scan_only' });
    const res = await propose({ proposedMode: 'scan_only', reason: 'x'.repeat(30) });
    expect(res.status).toBe(400);
  });

  it('409 when a pending change already exists', async () => {
    currentSupabase = mockSupabase({
      user: { id: 'u1' }, role: 'admin', currentMode: 'active',
      pendingChange: { id: 'existing' },
    });
    const res = await propose({ proposedMode: 'disabled', reason: 'x'.repeat(30) });
    expect(res.status).toBe(409);
  });

  it('200 on clean propose', async () => {
    currentSupabase = mockSupabase({
      user: { id: 'u1' }, role: 'compliance_admin', currentMode: 'active',
      pendingChange: null, insertId: 'ch-1',
    });
    const res = await propose({ proposedMode: 'scan_only', reason: 'Buffer intercept API is 502ing on roughly 30% of requests, shifting to scan-only pending their status page clearing.' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; changeId: string };
    expect(body.ok).toBe(true);
    expect(body.changeId).toBe('ch-1');
  });
});

describe('POST /admin/platforms/[platform]/approve', () => {
  const pending = {
    id: 'ch-1', platform: 'buffer', previous_mode: 'active', proposed_mode: 'scan_only',
    proposed_by: 'proposer-user', approved_at: null, rejected_at: null,
  };

  it('401 unauthenticated', async () => {
    currentSupabase = mockSupabase({ user: null });
    const res = await approve({ changeId: 'ch-1', action: 'approve' });
    expect(res.status).toBe(401);
  });

  it('403 non-admin', async () => {
    currentSupabase = mockSupabase({ user: { id: 'u2' }, role: 'practitioner' });
    const res = await approve({ changeId: 'ch-1', action: 'approve' });
    expect(res.status).toBe(403);
  });

  it('400 on invalid action', async () => {
    currentSupabase = mockSupabase({ user: { id: 'u2' }, role: 'admin', change: pending });
    const res = await approve({ changeId: 'ch-1', action: 'maybe' });
    expect(res.status).toBe(400);
  });

  it('404 when change id not found', async () => {
    currentSupabase = mockSupabase({ user: { id: 'u2' }, role: 'admin', change: null });
    const res = await approve({ changeId: 'nope', action: 'approve' });
    expect(res.status).toBe(404);
  });

  it('403 when proposer tries to self-approve', async () => {
    currentSupabase = mockSupabase({
      user: { id: 'proposer-user' }, role: 'admin', change: pending,
    });
    const res = await approve({ changeId: 'ch-1', action: 'approve' });
    expect(res.status).toBe(403);
  });

  it('409 when change already approved', async () => {
    currentSupabase = mockSupabase({
      user: { id: 'reviewer-user' }, role: 'admin',
      change: { ...pending, approved_at: '2026-04-24T12:00:00Z' },
    });
    const res = await approve({ changeId: 'ch-1', action: 'approve' });
    expect(res.status).toBe(409);
  });

  it('200 on clean approve by a different admin (applies state)', async () => {
    currentSupabase = mockSupabase({
      user: { id: 'reviewer-user' }, role: 'admin', change: pending,
    });
    const res = await approve({ changeId: 'ch-1', action: 'approve' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { applied: boolean; mode: string };
    expect(body.applied).toBe(true);
    expect(body.mode).toBe('scan_only');
  });

  it('400 on reject with short reason', async () => {
    currentSupabase = mockSupabase({
      user: { id: 'reviewer-user' }, role: 'admin', change: pending,
    });
    const res = await approve({ changeId: 'ch-1', action: 'reject', rejectionReason: 'no' });
    expect(res.status).toBe(400);
  });

  it('200 on clean reject', async () => {
    currentSupabase = mockSupabase({
      user: { id: 'reviewer-user' }, role: 'admin', change: pending,
    });
    const res = await approve({ changeId: 'ch-1', action: 'reject', rejectionReason: 'not now, rolling out vendor patch first' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { rejected: boolean };
    expect(body.rejected).toBe(true);
  });

  it('409 when race loses (update returned null)', async () => {
    currentSupabase = mockSupabase({
      user: { id: 'reviewer-user' }, role: 'admin', change: pending, updateReturnsNull: true,
    });
    const res = await approve({ changeId: 'ch-1', action: 'approve' });
    expect(res.status).toBe(409);
  });
});
