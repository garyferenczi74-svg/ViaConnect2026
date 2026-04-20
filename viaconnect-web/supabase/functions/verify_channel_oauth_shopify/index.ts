// Prompt #102 Workstream A — Shopify OAuth callback (credential-gated).
import { credentialsMissingResponse, jsonResponse, requireEnv } from '../_operations_shared/shared.ts';
Deno.serve(async (_req) => {
  const missing = requireEnv(['SHOPIFY_APP_CLIENT_ID', 'SHOPIFY_APP_CLIENT_SECRET']);
  if (missing) return credentialsMissingResponse(missing, 'shopify_oauth');
  return jsonResponse({ skipped: true, reason: 'oauth_flow_deferred' });
});
