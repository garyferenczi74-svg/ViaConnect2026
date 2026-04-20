// Prompt #102 Workstream A — Amazon Selling Partner OAuth callback.
// Credential-gated; activates when AMAZON_SP_CLIENT_ID + SECRET land.

import { credentialsMissingResponse, getSupabaseClient, jsonResponse, requireEnv } from '../_operations_shared/shared.ts';

Deno.serve(async (_req) => {
  const missing = requireEnv(['AMAZON_SP_CLIENT_ID', 'AMAZON_SP_CLIENT_SECRET']);
  if (missing) return credentialsMissingResponse(missing, 'amazon_sp_oauth');
  void getSupabaseClient();
  // TODO(#102-phase-2b): exchange code → token via Amazon token endpoint,
  // store token in Vault under oauth_token_vault_ref, confirm seller
  // profile URL matches submitted channel_url, mark verified.
  return jsonResponse({ skipped: true, reason: 'oauth_flow_deferred' });
});
