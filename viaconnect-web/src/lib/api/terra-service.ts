import { TERRA_BASE_URL, TERRA_HEADERS } from './clients';
import { PROVIDERS } from './providers';

// ── Types ────────────────────────────────────────────────────────────

export interface AuthResult {
  type: 'widget' | 'mobile_sdk';
  url?: string;
  token?: string;
  sessionId?: string;
}

// ── Auth URL / Token Generation ──────────────────────────────────────

/**
 * Generates an authentication URL (widget session) for cloud providers
 * or a mobile SDK token for mobile SDK providers.
 */
export async function generateAuthUrl(
  provider: string,
  userId: string
): Promise<AuthResult> {
  const config = PROVIDERS[provider];
  if (!config) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  if (config.requiresMobileSDK) {
    // Mobile SDK flow — generate SDK token
    const response = await fetch(`${TERRA_BASE_URL}/auth/generateMobileSDKToken`, {
      method: 'POST',
      headers: TERRA_HEADERS,
      body: JSON.stringify({
        reference_id: userId,
        resource: config.terraName,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Terra mobile SDK token generation failed (${response.status}): ${text}`);
    }

    const data = await response.json();

    return {
      type: 'mobile_sdk',
      token: data.token ?? data.sdk_token,
      sessionId: data.session_id,
    };
  }

  // Cloud provider flow — generate widget session
  const response = await fetch(`${TERRA_BASE_URL}/auth/generateWidgetSession`, {
    method: 'POST',
    headers: TERRA_HEADERS,
    body: JSON.stringify({
      reference_id: userId,
      providers: config.terraName,
      language: 'en',
      auth_success_redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/connections?connected=${provider}`,
      auth_failure_redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/connections?error=${provider}`,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Terra widget session generation failed (${response.status}): ${text}`);
  }

  const data = await response.json();

  return {
    type: 'widget',
    url: data.url,
    sessionId: data.session_id,
  };
}

// ── Disconnect Provider ──────────────────────────────────────────────

/**
 * Deauthenticates a Terra user, disconnecting the provider.
 */
export async function disconnectProvider(
  userId: string,
  terraUserId: string
): Promise<void> {
  const response = await fetch(`${TERRA_BASE_URL}/auth/deauthenticateUser`, {
    method: 'DELETE',
    headers: TERRA_HEADERS,
    body: JSON.stringify({
      user_id: terraUserId,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Terra deauthentication failed for user ${userId} / terra ${terraUserId} (${response.status}): ${text}`
    );
  }
}

// ── Historical Data Fetch ────────────────────────────────────────────

/**
 * Fetches historical / backfill data from Terra for a given user and data type.
 *
 * @param terraUserId  The Terra-assigned user ID.
 * @param dataType     One of 'daily', 'sleep', 'activity', 'body', 'nutrition'.
 * @param startDate    ISO date string (YYYY-MM-DD).
 * @param endDate      ISO date string (YYYY-MM-DD).
 */
export async function fetchHistoricalData(
  terraUserId: string,
  dataType: string,
  startDate: string,
  endDate: string
): Promise<any> {
  const params = new URLSearchParams({
    user_id: terraUserId,
    start_date: startDate,
    end_date: endDate,
    to_webhook: 'false',
  });

  const response = await fetch(
    `${TERRA_BASE_URL}/${dataType}?${params.toString()}`,
    {
      method: 'GET',
      headers: TERRA_HEADERS,
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Terra historical data fetch failed for ${dataType} (${response.status}): ${text}`
    );
  }

  return response.json();
}

// ── Webhook Signature Verification ───────────────────────────────────

/**
 * Verifies the Terra webhook signature.
 * Currently performs a presence check; full HMAC-SHA256 verification
 * should be implemented before production use.
 *
 * TODO: Implement full HMAC-SHA256 signature verification using
 *       TERRA_SIGNING_SECRET from process.env.
 */
export function verifyWebhookSignature(
  body: string,
  signature: string | null | undefined
): boolean {
  if (!signature) {
    return false;
  }

  const signingSecret = process.env.TERRA_SIGNING_SECRET;
  if (!signingSecret) {
    console.warn(
      '[terra-service] TERRA_SIGNING_SECRET not set — accepting webhook on presence check only'
    );
    return true;
  }

  // TODO: Full HMAC-SHA256 verification
  // const crypto = await import('crypto');
  // const expected = crypto
  //   .createHmac('sha256', signingSecret)
  //   .update(body)
  //   .digest('hex');
  // return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

  return signature.length > 0;
}
