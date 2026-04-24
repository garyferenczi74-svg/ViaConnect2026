import { describe, it, expect, vi } from 'vitest';
import { pseudonymize } from '@/lib/soc2/redaction/pseudonymize';
import {
  resolvePseudonym,
  CONTEXT_TO_TABLE,
  knownContexts,
} from '@/lib/soc2/auditor/resolvePseudonym';
import {
  classifyFromRows,
  canApproveAsSteve,
  canApproveAsThomas,
  type LogRow,
} from '@/lib/soc2/auditor/pseudonymApprovals';

const FIXED_KEY = Buffer.from('aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899', 'hex');
const PACKET = '01J8ZP5V3K700000000000000W';

// ─── Resolver engine ────────────────────────────────────────────────────────

describe('resolvePseudonym', () => {
  it('returns the matching ID when one candidate HMACs to the target', () => {
    const realId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const pseudonym = pseudonymize({ packetUuid: PACKET, context: 'user', realId, key: FIXED_KEY });
    const result = resolvePseudonym({
      packetUuid: PACKET,
      context: 'user',
      pseudonym,
      hmacKey: FIXED_KEY,
      candidateIds: [
        '11111111-2222-3333-4444-555555555555',
        realId,
        '99999999-8888-7777-6666-555555555555',
      ],
    });
    expect(result.matched).toEqual([realId]);
    expect(result.candidatesChecked).toBe(3);
    expect(result.collision).toBe(false);
  });

  it('returns empty matches when no candidate hashes correctly', () => {
    const pseudonym = pseudonymize({ packetUuid: PACKET, context: 'user', realId: 'unknown-id', key: FIXED_KEY });
    const result = resolvePseudonym({
      packetUuid: PACKET,
      context: 'user',
      pseudonym,
      hmacKey: FIXED_KEY,
      candidateIds: ['nope-1', 'nope-2'],
    });
    expect(result.matched).toEqual([]);
    expect(result.candidatesChecked).toBe(2);
  });

  it('rejects wrong-context pseudonyms even with matching ID', () => {
    const realId = 'same-id';
    const pseudonymUnderUser = pseudonymize({ packetUuid: PACKET, context: 'user', realId, key: FIXED_KEY });
    const result = resolvePseudonym({
      packetUuid: PACKET,
      context: 'practitioner', // wrong context
      pseudonym: pseudonymUnderUser,
      hmacKey: FIXED_KEY,
      candidateIds: [realId],
    });
    expect(result.matched).toEqual([]);
  });

  it('rejects wrong packet UUID even with matching ID + context', () => {
    const realId = 'same-id';
    const p = pseudonymize({ packetUuid: PACKET, context: 'user', realId, key: FIXED_KEY });
    const result = resolvePseudonym({
      packetUuid: 'different-packet-uuid',
      context: 'user',
      pseudonym: p,
      hmacKey: FIXED_KEY,
      candidateIds: [realId],
    });
    expect(result.matched).toEqual([]);
  });

  it('rejects wrong key even with matching ID + context + packet', () => {
    const realId = 'same-id';
    const p = pseudonymize({ packetUuid: PACKET, context: 'user', realId, key: FIXED_KEY });
    const otherKey = Buffer.from('00000000000000000000000000000000000000000000000000000000000000', 'hex');
    const result = resolvePseudonym({
      packetUuid: PACKET,
      context: 'user',
      pseudonym: p,
      hmacKey: otherKey,
      candidateIds: [realId],
    });
    expect(result.matched).toEqual([]);
  });

  it('is case-insensitive on the input pseudonym (accepts lowercase)', () => {
    const realId = 'xyz';
    const p = pseudonymize({ packetUuid: PACKET, context: 'user', realId, key: FIXED_KEY });
    const result = resolvePseudonym({
      packetUuid: PACKET,
      context: 'user',
      pseudonym: p.toLowerCase(),
      hmacKey: FIXED_KEY,
      candidateIds: [realId],
    });
    expect(result.matched).toEqual([realId]);
  });
});

describe('CONTEXT_TO_TABLE', () => {
  it('includes every active pseudonym context', () => {
    const ks = knownContexts();
    for (const c of ['user', 'practitioner', 'finding', 'incident', 'consent', 'dsar', 'vendor_baa', 'signal', 'precheck_session', 'precheck_finding', 'receipt']) {
      expect(ks).toContain(c);
    }
  });
  it('maps every known context to a table + id column', () => {
    for (const c of knownContexts()) {
      expect(CONTEXT_TO_TABLE[c].table).toMatch(/^[a-z0-9_]+$/);
      expect(CONTEXT_TO_TABLE[c].idColumn.length).toBeGreaterThan(0);
    }
  });
});

// ─── Approval state machine ─────────────────────────────────────────────────

function mkRow(partial: Partial<LogRow> & { id: number; action: string }): LogRow {
  return {
    grant_id: 'grant-1',
    packet_id: 'packet-1',
    target_path: null,
    resolved_pseudonym: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    justification: null,
    approver_steve: null,
    approver_thomas: null,
    occurred_at: new Date().toISOString(),
    ...partial,
  };
}

describe('classifyFromRows state machine', () => {
  const request = mkRow({ id: 1, action: 'pseudonym_resolve_request', justification: 'need it' });

  it('only the request row → pending', () => {
    const s = classifyFromRows(request, [request]);
    expect(s.state).toBe('pending');
  });

  it('Steve approves → steve_approved', () => {
    const approval = mkRow({ id: 2, action: 'pseudonym_resolve_granted', approver_steve: 'u-steve' });
    const s = classifyFromRows(request, [request, approval]);
    expect(s.state).toBe('steve_approved');
    expect(s.steveApprovalRow?.id).toBe(2);
    expect(s.thomasApprovalRow).toBeNull();
  });

  it('Thomas approves → thomas_approved', () => {
    const approval = mkRow({ id: 3, action: 'pseudonym_resolve_granted', approver_thomas: 'u-thomas' });
    const s = classifyFromRows(request, [request, approval]);
    expect(s.state).toBe('thomas_approved');
  });

  it('both approvers → both_approved', () => {
    const a1 = mkRow({ id: 2, action: 'pseudonym_resolve_granted', approver_steve: 'u-s' });
    const a2 = mkRow({ id: 3, action: 'pseudonym_resolve_granted', approver_thomas: 'u-t' });
    const s = classifyFromRows(request, [request, a1, a2]);
    expect(s.state).toBe('both_approved');
    expect(s.steveApprovalRow?.id).toBe(2);
    expect(s.thomasApprovalRow?.id).toBe(3);
  });

  it('resolution row (both approvers set) → resolved', () => {
    const resolution = mkRow({ id: 4, action: 'pseudonym_resolve_granted', approver_steve: 'u-s', approver_thomas: 'u-t', target_path: 'real-id-xyz' });
    const s = classifyFromRows(request, [request, resolution]);
    expect(s.state).toBe('resolved');
    expect(s.resolutionRow?.target_path).toBe('real-id-xyz');
  });

  it('denial row → denied (wins over any approvals)', () => {
    const a1 = mkRow({ id: 2, action: 'pseudonym_resolve_granted', approver_steve: 'u-s' });
    const deny = mkRow({ id: 3, action: 'pseudonym_resolve_denied', approver_thomas: 'u-t', justification: 'out of scope' });
    const s = classifyFromRows(request, [request, a1, deny]);
    expect(s.state).toBe('denied');
  });
});

describe('role gates', () => {
  it('canApproveAsSteve accepts compliance + admin roles', () => {
    expect(canApproveAsSteve('compliance_officer')).toBe(true);
    expect(canApproveAsSteve('compliance_admin')).toBe(true);
    expect(canApproveAsSteve('admin')).toBe(true);
    expect(canApproveAsSteve('superadmin')).toBe(true);
  });
  it('canApproveAsSteve rejects legal roles', () => {
    expect(canApproveAsSteve('legal_counsel')).toBe(false);
    expect(canApproveAsSteve('consumer')).toBe(false);
  });
  it('canApproveAsThomas accepts legal + superadmin only', () => {
    expect(canApproveAsThomas('legal_counsel')).toBe(true);
    expect(canApproveAsThomas('superadmin')).toBe(true);
    expect(canApproveAsThomas('compliance_officer')).toBe(false);
    expect(canApproveAsThomas('admin')).toBe(false);
  });
});

// ─── API auth gate smoke tests ─────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: null } }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
  }),
}));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
  }),
}));

import { GET as listRequests } from '@/app/api/admin/soc2/pseudonym-requests/route';
import { POST as approveRoute } from '@/app/api/admin/soc2/pseudonym-requests/[logId]/approve/route';
import { POST as denyRoute } from '@/app/api/admin/soc2/pseudonym-requests/[logId]/deny/route';

describe('API auth gates', () => {
  it('GET list → 401 unauthenticated', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await listRequests(new Request('http://localhost') as any);
    expect(res.status).toBe(401);
  });
  it('POST approve → 400 on invalid log id', async () => {
    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({ slot: 'steve' }), headers: { 'content-type': 'application/json' } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await approveRoute(req as any, { params: { logId: 'not-a-number' } });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_log_id');
  });
  it('POST approve → 401 unauthenticated with valid log id', async () => {
    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({ slot: 'steve' }), headers: { 'content-type': 'application/json' } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await approveRoute(req as any, { params: { logId: '42' } });
    expect(res.status).toBe(401);
  });
  it('POST deny → 401 unauthenticated', async () => {
    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({ reason: 'valid reason text' }), headers: { 'content-type': 'application/json' } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await denyRoute(req as any, { params: { logId: '42' } });
    expect(res.status).toBe(401);
  });
});
