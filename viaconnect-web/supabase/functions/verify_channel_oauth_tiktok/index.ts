// Prompt #102 Workstream A — TikTok Shop OAuth callback (credential-gated).
import { credentialsMissingResponse, jsonResponse, requireEnv } from '../_operations_shared/shared.ts';
Deno.serve(async (_req) => {
  const missing = requireEnv(['TIKTOK_SHOP_APP_KEY', 'TIKTOK_SHOP_APP_SECRET']);
  if (missing) return credentialsMissingResponse(missing, 'tiktok_shop_oauth');
  return jsonResponse({ skipped: true, reason: 'oauth_flow_deferred' });
});
