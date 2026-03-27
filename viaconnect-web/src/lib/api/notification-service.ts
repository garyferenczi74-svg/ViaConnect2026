// ---------------------------------------------------------------------------
// Push Notification + SMS Service — ViaConnect
// ---------------------------------------------------------------------------

import { createClient } from '@supabase/supabase-js';
import { awardTokens } from '@/lib/gamification/token-engine';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID!;

// ---- Push notifications (Firebase FCM v1) ----------------------------------

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  priority?: 'high' | 'normal';
}

interface FCMToken {
  token: string;
  platform: 'ios' | 'android' | 'web';
}

async function getFirebaseAccessToken(): Promise<string> {
  // Uses Google Application Default Credentials (ADC).
  // In production the GOOGLE_APPLICATION_CREDENTIALS env var points to the
  // service-account JSON or workload-identity is configured.
  const { GoogleAuth } = await import('google-auth-library');
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  });
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  return tokenResponse.token!;
}

export async function sendPushNotification(
  userId: string,
  payload: PushPayload,
): Promise<{ sent: number; failed: number }> {
  // 1. Load FCM tokens for the user
  const { data: tokenRows, error } = await supabase
    .from('push_tokens')
    .select('token, platform')
    .eq('user_id', userId);

  if (error) {
    console.error('[notification-service] Error loading push tokens:', error);
    return { sent: 0, failed: 0 };
  }

  if (!tokenRows || tokenRows.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const accessToken = await getFirebaseAccessToken();
  const fcmUrl = `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`;

  let sent = 0;
  let failed = 0;

  const results = await Promise.allSettled(
    (tokenRows as FCMToken[]).map(async ({ token, platform }) => {
      // Build platform-specific message
      const message: Record<string, unknown> = {
        token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data ?? {},
      };

      if (platform === 'ios') {
        message.apns = {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              'mutable-content': 1,
            },
          },
          headers: {
            'apns-priority': payload.priority === 'high' ? '10' : '5',
          },
        };
      }

      if (platform === 'android') {
        message.android = {
          notification: {
            channel_id: 'viaconnect_default',
            sound: 'default',
          },
          priority: payload.priority === 'high' ? 'HIGH' : 'NORMAL',
        };
      }

      if (platform === 'web') {
        message.webpush = {
          notification: {
            icon: '/icons/icon-192.png',
            badge: '/icons/badge-72.png',
          },
        };
      }

      const res = await fetch(fcmUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`FCM error ${res.status}: ${errBody}`);
      }
    }),
  );

  for (const r of results) {
    if (r.status === 'fulfilled') sent++;
    else {
      console.error('[notification-service] Push failed:', r.reason);
      failed++;
    }
  }

  return { sent, failed };
}

// ---- SMS via Twilio --------------------------------------------------------

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER!;

export async function sendSMS(
  to: string,
  body: string,
): Promise<{ success: boolean; sid?: string }> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

  const params = new URLSearchParams({
    To: to,
    From: TWILIO_PHONE_NUMBER,
    Body: body,
  });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization:
          'Basic ' +
          Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString(
            'base64',
          ),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('[notification-service] Twilio error:', errBody);
      return { success: false };
    }

    const json = await res.json();
    return { success: true, sid: json.sid };
  } catch (error) {
    console.error('[notification-service] SMS send failed:', error);
    return { success: false };
  }
}

// ---- Gamification trigger --------------------------------------------------

export async function triggerGamification(
  userId: string,
  eventType: string,
  eventData?: Record<string, unknown>,
): Promise<void> {
  try {
    await awardTokens(userId, eventType, eventData);
  } catch (error) {
    console.error(
      '[notification-service] Gamification trigger failed:',
      error,
    );
  }
}

// ---- Widget cache refresh --------------------------------------------------

export async function refreshWidgetCache(
  userId: string,
): Promise<{ updated: boolean }> {
  // Fetch latest aggregated scores for fast widget reads
  const [complianceResult, streakResult, tokensResult] = await Promise.all([
    supabase
      .from('compliance_logs')
      .select('score')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from('streaks')
      .select('current_streak, multiplier')
      .eq('user_id', userId)
      .single(),
    supabase
      .from('token_balances')
      .select('balance')
      .eq('user_id', userId)
      .single(),
  ]);

  const cachePayload = {
    user_id: userId,
    compliance_score: complianceResult.data?.score ?? 0,
    current_streak: streakResult.data?.current_streak ?? 0,
    multiplier: streakResult.data?.multiplier ?? 1,
    token_balance: tokensResult.data?.balance ?? 0,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('widget_cache')
    .upsert(cachePayload, { onConflict: 'user_id' });

  if (error) {
    console.error('[notification-service] Widget cache update failed:', error);
    return { updated: false };
  }

  return { updated: true };
}
