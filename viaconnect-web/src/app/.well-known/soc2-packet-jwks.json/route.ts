// Prompt #122 P2: Public JWKS endpoint.
//
// GET /.well-known/soc2-packet-jwks.json
//   → JWKS containing the public keys for active + recently-retired
//     soc2_signing_keys rows. Consumed by the soc2-verify CLI and by
//     external auditors.
//
// Intentionally unauthenticated: JWKS is public by design (JOSE
// convention). Access is open-read; clients use it only to verify
// signatures we produced.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildJwks, type SigningKeyRow } from '@/lib/soc2/assemble/jwks';

export const runtime = 'nodejs';
// Route depends on the live soc2_signing_keys table and the service-role key,
// neither of which is available during Vercel's static export phase. Without
// this opt-out, Next.js attempts to pre-render the JWKS at build time and
// createAdminClient throws on missing SUPABASE_SERVICE_ROLE_KEY.
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  // Keys table RLS restricts SELECT to compliance readers, but the
  // JWKS endpoint must be publicly readable. Use the service-role admin
  // client to fetch. We only expose the public key material — the
  // private_key_ref (Vault pointer) is intentionally not included.
  //
  // createClient() is not used here because we deliberately do not
  // require a user session for this endpoint.
  void createClient;

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = admin as any;

  const { data, error } = await sb
    .from('soc2_signing_keys')
    .select('id, public_key_pem, active, retired_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const jwks = buildJwks((data ?? []) as SigningKeyRow[]);

  return NextResponse.json(jwks, {
    headers: {
      // JWKS is stable per key rotation. Cache for 15 minutes at edge;
      // auditors can force a refresh by hitting the URL directly.
      'Cache-Control': 'public, max-age=900, s-maxage=900',
      'Content-Type': 'application/json',
    },
  });
}
