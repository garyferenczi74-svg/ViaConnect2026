// Prompt #122 P2: JWKS (JSON Web Key Set) serialization.
//
// The public keys for active + historical (non-retired) signing keys are
// served at /.well-known/soc2-packet-jwks.json. Auditors and the
// soc2-verify CLI fetch this endpoint and verify signatures against it.
//
// Key rotation spec (§8.4): annual rotation; previous key kept verifiable
// for 3 years. A retired key's public material stays in the JWKS as long
// as packets signed under it are within retention.

import { publicKeyObjectFromPem } from './sign';

export interface Jwk {
  kty: 'EC';
  crv: 'P-256';
  x: string;
  y: string;
  kid: string;
  alg: 'ES256';
  use: 'sig';
}

export interface Jwks {
  keys: Jwk[];
}

export interface SigningKeyRow {
  id: string;
  public_key_pem: string;
  active: boolean;
  retired_at: string | null;
}

/**
 * Convert a PEM-encoded public key into a JWK with the given kid.
 */
export function pemToJwk(publicKeyPem: string, kid: string): Jwk {
  const keyObject = publicKeyObjectFromPem(publicKeyPem);
  const exported = keyObject.export({ format: 'jwk' }) as {
    kty?: string;
    crv?: string;
    x?: string;
    y?: string;
  };
  if (exported.kty !== 'EC' || exported.crv !== 'P-256' || !exported.x || !exported.y) {
    throw new Error(`Cannot export ES256 JWK for kid=${kid}: unexpected key shape`);
  }
  return {
    kty: 'EC',
    crv: 'P-256',
    x: exported.x,
    y: exported.y,
    kid,
    alg: 'ES256',
    use: 'sig',
  };
}

/**
 * Build a JWKS from the soc2_signing_keys table rows. Excludes any row
 * that is both inactive AND retired more than 3 years ago (per spec).
 */
export function buildJwks(rows: readonly SigningKeyRow[], now: Date = new Date()): Jwks {
  const threeYearsAgo = new Date(now.getTime() - 3 * 365 * 24 * 3600 * 1000);
  const keep = rows.filter((r) => {
    if (r.active) return true;
    if (!r.retired_at) return true;
    return new Date(r.retired_at).getTime() >= threeYearsAgo.getTime();
  });
  return {
    keys: keep.map((r) => pemToJwk(r.public_key_pem, r.id)),
  };
}

/**
 * Reverse: take a JWKS payload and produce a kid → PEM lookup map.
 * Used by soc2-verify when a caller has fetched the JWKS over HTTP.
 */
export function jwksToKidPemMap(jwks: Jwks): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of jwks.keys) {
    out[key.kid] = jwkToPem(key);
  }
  return out;
}

/**
 * JWK → PEM (SPKI) conversion via node:crypto. Accepts only EC P-256.
 */
function jwkToPem(jwk: Jwk): string {
  // Use createPublicKey with JWK input, then export as SPKI PEM. Node's
  // `createPublicKey` accepts JWK via the JsonWebKey interface; our local
  // Jwk interface is structurally compatible but nominally distinct, so
  // we cast to Node's expected input shape.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createPublicKey } = require('node:crypto') as typeof import('node:crypto');
  const keyObject = createPublicKey({
    key: jwk as unknown as import('node:crypto').JsonWebKey,
    format: 'jwk',
  });
  return keyObject.export({ format: 'pem', type: 'spki' }) as string;
}
