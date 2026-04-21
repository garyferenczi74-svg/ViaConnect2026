// Prompt #105 Phase 2a — shared helpers for executive reporting edge functions.
// Encapsulates auth (JWT → profile row), CORS, JSON responses, and the
// service-role client used for privileged writes (audit log, state transitions).

// deno-lint-ignore-file no-explicit-any
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

export function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function userClient(jwt: string): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
  });
}

export function corsPreflight(): Response {
  return jsonResponse({ ok: true });
}

export interface ActorContext {
  userId: string;
  role: string;
  ipAddress: string | null;
  userAgent: string | null;
}

/**
 * Resolve actor (auth.user_id + profiles.role) from a Bearer JWT.
 * Returns null if missing/invalid so callers can decide status code.
 */
export async function resolveActor(req: Request): Promise<ActorContext | null> {
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer /i, '');
  if (!jwt) return null;

  const uc = userClient(jwt);
  const { data: auth } = await uc.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) return null;

  const admin = adminClient() as any;
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  const role = (profile?.role as string) ?? 'consumer';
  const forwarded = req.headers.get('x-forwarded-for') ?? req.headers.get('cf-connecting-ip');
  const ipAddress = forwarded ? forwarded.split(',')[0]!.trim() : null;
  const userAgent = req.headers.get('user-agent');

  return { userId, role, ipAddress, userAgent };
}

/**
 * Exec-reporting roles allowed to mutate state. Board member access is NOT
 * in this list — board members can only READ their own distributions, never
 * write. The profiles.role column is enforced in 20260421000200.
 */
export const EXEC_WRITE_ROLES = new Set<string>([
  'admin',
  'exec_reporting_admin',
  'cfo',
  'ceo',
]);

/** Has authority to compute snapshots, write KPIs, draft packs. */
export function canWriteExec(role: string): boolean {
  return EXEC_WRITE_ROLES.has(role);
}

/** CFO-specific gate for snapshot + pack approvals. */
export function isCFO(role: string): boolean {
  return role === 'cfo' || role === 'admin';
}

/** CEO-specific gate for the bright-line issue action. admin is NOT a substitute. */
export function isCEO(role: string): boolean {
  return role === 'ceo';
}

/** Common error codes returned by edge functions — stable strings UI can match. */
export const EXEC_ERRORS = {
  MISSING_JWT: 'MISSING_JWT',
  INVALID_JWT: 'INVALID_JWT',
  FORBIDDEN_ROLE: 'FORBIDDEN_ROLE',
  BAD_REQUEST: 'BAD_REQUEST',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL: 'INTERNAL',
} as const;
