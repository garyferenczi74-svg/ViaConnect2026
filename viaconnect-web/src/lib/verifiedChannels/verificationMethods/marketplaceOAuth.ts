// Prompt #102 Workstream A — marketplace OAuth helpers.
// Provider-specific client IDs come from server-side env / Vault.
// Redirect URIs are pinned per deployment; state tokens carry the
// channel_id so the callback knows which channel to mark verified.

export type OAuthMarketplace = 'amazon' | 'etsy' | 'shopify' | 'tiktok_shop';

export interface OAuthAuthorizeInput {
  marketplace: OAuthMarketplace;
  channelId: string;
  clientId: string;
  redirectUri: string;
  shopDomain?: string; // required for Shopify store-specific OAuth
}

/** Pure: build the provider-specific authorize URL. The state param
 *  is `${channelId}.${nonce}` so the callback can look up the attempt
 *  row + cross-check the nonce against the evidence_json cookie. */
export function buildOAuthAuthorizeUrl(input: OAuthAuthorizeInput, nonce: string): string {
  const state = `${input.channelId}.${nonce}`;
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    state,
    response_type: 'code',
  });
  switch (input.marketplace) {
    case 'amazon':
      params.set('scope', 'sellingpartnerapi::notifications');
      return `https://sellercentral.amazon.com/apps/authorize/consent?${params.toString()}`;
    case 'etsy':
      params.set('scope', 'listings_r shops_r');
      return `https://www.etsy.com/oauth/connect?${params.toString()}`;
    case 'shopify': {
      if (!input.shopDomain) throw new Error('shopDomain required for Shopify OAuth');
      params.set('scope', 'read_products');
      return `https://${input.shopDomain}/admin/oauth/authorize?${params.toString()}`;
    }
    case 'tiktok_shop':
      params.set('scope', 'order.info,product.info');
      return `https://auth.tiktok-shops.com/oauth/authorize?${params.toString()}`;
    default: {
      const exhaustive: never = input.marketplace;
      throw new Error(`Unknown marketplace: ${exhaustive}`);
    }
  }
}

/** Pure: split the state back into channelId + nonce. */
export function parseOAuthState(state: string): { channelId: string; nonce: string } | null {
  const dot = state.indexOf('.');
  if (dot < 1 || dot === state.length - 1) return null;
  return { channelId: state.slice(0, dot), nonce: state.slice(dot + 1) };
}

/** Pure: constant-time-ish nonce comparison. */
export function nonceMatches(expected: string, received: string): boolean {
  if (expected.length !== received.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ received.charCodeAt(i);
  }
  return diff === 0;
}
