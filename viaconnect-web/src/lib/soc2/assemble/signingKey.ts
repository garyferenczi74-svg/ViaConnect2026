// Prompt #122 P5: Active-signing-key loader.
//
// On every packet run, load the single active ES256 key from
// soc2_signing_keys. Private key material lives in Supabase Vault; we
// resolve it via the vault_read RPC shipped in the P5 migration.
//
// First-run bootstrap: if no active key exists yet, generate a fresh
// keypair and insert it (private_key_ref is left NULL so Vault wiring is
// still required for production; the in-memory private key is returned to
// the caller for this run only).

import type { SupabaseClient } from '@supabase/supabase-js';
import { generateEs256Keypair } from './sign';

export interface ActiveSigningKey {
  id: string;
  publicKeyPem: string;
  privateKeyPem: string;
  isBootstrapped: boolean; // true if we just generated a fresh key
}

export async function loadActiveSigningKey(supabase: SupabaseClient): Promise<ActiveSigningKey> {
  const { data: existing, error: existingErr } = await supabase
    .from('soc2_signing_keys')
    .select('id, public_key_pem, private_key_ref, active')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingErr) {
    throw new Error(`soc2 signing key: lookup failed — ${existingErr.message}`);
  }

  if (existing?.private_key_ref) {
    const { data: pem, error: vaultErr } = await supabase.rpc('vault_read', {
      p_ref: existing.private_key_ref,
    });
    if (vaultErr) {
      throw new Error(`soc2 signing key: vault_read failed — ${vaultErr.message}`);
    }
    if (!pem) {
      throw new Error(`soc2 signing key: vault returned null for ref ${existing.private_key_ref}`);
    }
    return {
      id: existing.id,
      publicKeyPem: existing.public_key_pem,
      privateKeyPem: pem as string,
      isBootstrapped: false,
    };
  }

  // Bootstrap path: no active key in DB or no Vault ref wired yet. Generate
  // a fresh keypair. The private key is returned to the caller for this run
  // and must be manually mirrored into Vault before the row's private_key_ref
  // can be populated.
  const keypair = generateEs256Keypair();
  const id = `soc2-k-${Date.now().toString(36)}`;

  const { error: insertErr } = await supabase.from('soc2_signing_keys').insert({
    id,
    alg: 'ES256',
    public_key_pem: keypair.publicKeyPem,
    private_key_ref: '',  // intentionally empty; admin must fill in via signed RPC post-Vault-wiring
    active: true,
    rotation_of: existing?.id ?? null,
  });
  if (insertErr) {
    throw new Error(`soc2 signing key: insert failed — ${insertErr.message}`);
  }

  // Retire prior active key if present.
  if (existing?.id) {
    await supabase
      .from('soc2_signing_keys')
      .update({ active: false, retired_at: new Date().toISOString() })
      .eq('id', existing.id);
  }

  return {
    id,
    publicKeyPem: keypair.publicKeyPem,
    privateKeyPem: keypair.privateKeyPem,
    isBootstrapped: true,
  };
}
