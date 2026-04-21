// Prompt #106 — shared helpers for shop-refresh edge functions.
//
// Encapsulates auth (JWT → profile.role), CORS, JSON responses, and the
// admin client. Mirrors the pattern established by _exec_reporting_shared.

// deno-lint-ignore-file no-explicit-any
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

export const CANONICAL_BUCKET = 'supplement-photos';

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

export function corsPreflight(): Response { return jsonResponse({ ok: true }); }

export interface ShopActor {
  userId: string;
  role: string;
  ipAddress: string | null;
  userAgent: string | null;
}

export async function resolveShopActor(req: Request): Promise<ShopActor | null> {
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer /i, '');
  if (!jwt) return null;
  const uc = userClient(jwt);
  const { data: auth } = await uc.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) return null;

  const admin = adminClient() as any;
  const { data: profile } = await admin.from('profiles').select('role').eq('id', userId).single();
  const role = (profile?.role as string) ?? 'consumer';

  const fwd = req.headers.get('x-forwarded-for') ?? req.headers.get('cf-connecting-ip');
  return {
    userId,
    role,
    ipAddress: fwd ? fwd.split(',')[0]!.trim() : null,
    userAgent: req.headers.get('user-agent'),
  };
}

export function isAdmin(role: string): boolean { return role === 'admin'; }

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await crypto.subtle.digest('SHA-256', copy.buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Mirror of src/lib/shopRefresh/types.ts typed-confirmation constants.
// Keep in sync — Deno cannot import Node TS directly.
export const TYPED_CONFIRMATION = {
  BULK_IMAGE_REFRESH: 'APPROVE IMAGE REFRESH',
  RETIREMENT: 'APPROVE RETIREMENT',
  PRIMARY_SWAP: 'APPROVE PRIMARY SWAP',
} as const;

export function publishBatchPhrase(n: number): string { return `PUBLISH ${n} SKUS`; }

// Scope guard — mirror of src/lib/shopRefresh/scopeGuards/index.ts. Edge
// functions call this before any write to ensure a target table is not
// in the forbidden set. Source of truth: src/lib/shopRefresh/scopeGuards.
export const FORBIDDEN_TABLES: ReadonlySet<string> = new Set([
  'genex360_products', 'peptide_registry',
  'peptide_delivery_options', 'peptide_rules',
  'master_skus', 'pricing_tiers',
]);
export const FORBIDDEN_PREFIXES: readonly string[] = ['peptide_', 'user_peptide_', 'helix_'];

export function assertTableIsWritable(tableName: string): void {
  if (FORBIDDEN_TABLES.has(tableName)) {
    throw new Error(`SCOPE_BREACH: refuse to write to "${tableName}"`);
  }
  for (const prefix of FORBIDDEN_PREFIXES) {
    if (tableName.startsWith(prefix)) {
      throw new Error(`SCOPE_BREACH: refuse to write to "${tableName}" (prefix "${prefix}")`);
    }
  }
}

export function assertBucketIsCanonical(bucketName: string): void {
  if (bucketName !== CANONICAL_BUCKET) {
    throw new Error(`SCOPE_BREACH: refuse to use bucket "${bucketName}"`);
  }
}
