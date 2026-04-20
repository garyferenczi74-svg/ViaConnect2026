// Prompt #102 Workstream A — Etsy OAuth callback (credential-gated).
import { credentialsMissingResponse, jsonResponse, requireEnv } from '../_operations_shared/shared.ts';
Deno.serve(async (_req) => {
  const missing = requireEnv(['ETSY_CLIENT_ID', 'ETSY_CLIENT_SECRET']);
  if (missing) return credentialsMissingResponse(missing, 'etsy_oauth');
  return jsonResponse({ skipped: true, reason: 'oauth_flow_deferred' });
});
