import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { ok, err } from '../_shared/response.ts';
import { getSupabaseAdmin, getUserId } from '../_shared/supabase-admin.ts';
import { writeAudit } from '../_shared/audit.ts';
import { z } from '../_shared/validate.ts';

const InputSchema = z.object({
  userId: z.string().uuid(),
  type: z.string().min(1),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  channel: z.enum(['push', 'email', 'sms']),
  data: z.record(z.unknown()).optional(),
});

// ── Push notification via Expo Push API ───────────────────────────────────
async function sendPush(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  title: string,
  message: string,
  data?: Record<string, unknown>,
): Promise<{ sent: number; errors: string[] }> {
  const { data: tokens } = await admin
    .from('device_tokens')
    .select('expo_push_token')
    .eq('user_id', userId)
    .eq('active', true);

  if (!tokens || tokens.length === 0) {
    return { sent: 0, errors: ['No active device tokens found'] };
  }

  const pushMessages = tokens.map((t) => ({
    to: t.expo_push_token,
    sound: 'default',
    title,
    body: message,
    data: data ?? {},
  }));

  // Expo Push API accepts batches of up to 100
  const batches = [];
  for (let i = 0; i < pushMessages.length; i += 100) {
    batches.push(pushMessages.slice(i, i + 100));
  }

  let sent = 0;
  const errors: string[] = [];

  for (const batch of batches) {
    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      });
      const result = await res.json();
      if (result.data) {
        for (const ticket of result.data) {
          if (ticket.status === 'ok') {
            sent++;
          } else {
            errors.push(ticket.message ?? 'Unknown push error');
          }
        }
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : 'Push batch failed');
    }
  }

  return { sent, errors };
}

// ── Email via SendGrid ───────────────────────────────────────────────────
async function sendEmail(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  title: string,
  message: string,
): Promise<{ sent: boolean; error?: string }> {
  const apiKey = Deno.env.get('SENDGRID_API_KEY');
  if (!apiKey) return { sent: false, error: 'SENDGRID_API_KEY not configured' };

  // Get user email from auth
  const { data: profile } = await admin
    .from('profiles')
    .select('username')
    .eq('id', userId)
    .single();

  // Fetch email from auth.users via admin API
  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  const email = authUser?.user?.email;

  if (!email) {
    return { sent: false, error: 'No email address found for user' };
  }

  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: {
          email: 'notifications@farmceutica.com',
          name: 'ViaConnect GeneX360',
        },
        subject: title,
        content: [
          {
            type: 'text/html',
            value: `
              <div style="font-family:Inter,system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px">
                <div style="background:#224852;color:#fff;padding:16px 24px;border-radius:12px 12px 0 0">
                  <h1 style="margin:0;font-size:20px">ViaConnect GeneX360</h1>
                </div>
                <div style="background:#f9fafb;padding:24px;border-radius:0 0 12px 12px">
                  <h2 style="color:#224852;margin-top:0">${title}</h2>
                  <p style="color:#374151;line-height:1.6">${message}</p>
                </div>
                <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:16px">
                  FarmCeutica Wellness LLC — Buffalo, NY
                </p>
              </div>
            `,
          },
        ],
      }),
    });

    if (res.ok || res.status === 202) {
      return { sent: true };
    }
    const errorText = await res.text();
    return { sent: false, error: `SendGrid error: ${res.status} ${errorText}` };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : 'Email send failed' };
  }
}

// ── SMS via Twilio ───────────────────────────────────────────────────────
async function sendSms(
  _userId: string,
  message: string,
  _phone?: string,
): Promise<{ sent: boolean; error?: string }> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER');

  if (!accountSid || !authToken || !fromNumber) {
    return { sent: false, error: 'Twilio credentials not configured' };
  }

  // In production, fetch user's phone from profile or auth metadata
  // For now, return config error if no phone provided
  if (!_phone) {
    return { sent: false, error: 'No phone number available for user' };
  }

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        },
        body: new URLSearchParams({
          To: _phone,
          From: fromNumber,
          Body: `[ViaConnect] ${message}`,
        }),
      },
    );

    if (res.ok) {
      return { sent: true };
    }
    const errorData = await res.json();
    return { sent: false, error: errorData.message ?? 'Twilio error' };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : 'SMS send failed' };
  }
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const requesterId = await getUserId(req);
    if (!requesterId) return err('Unauthorized', 'AUTH_REQUIRED', 401);

    const body = await req.json();
    const parsed = InputSchema.safeParse(body);
    if (!parsed.success) {
      return err(parsed.error.issues[0].message, 'VALIDATION_ERROR');
    }
    const { userId, type, title, message, channel, data } = parsed.data;
    const admin = getSupabaseAdmin();

    let result: Record<string, unknown>;

    switch (channel) {
      case 'push': {
        const pushResult = await sendPush(admin, userId, title, message, data);
        result = pushResult;
        break;
      }
      case 'email': {
        const emailResult = await sendEmail(admin, userId, title, message);
        result = emailResult;
        break;
      }
      case 'sms': {
        const smsResult = await sendSms(userId, message);
        result = smsResult;
        break;
      }
    }

    // Write notification record to DB
    await admin.from('notifications').insert({
      user_id: userId,
      notification_type: type,
      title,
      message,
    });

    await writeAudit({
      userId: requesterId,
      action: 'send_notification',
      tableName: 'notifications',
      recordId: userId,
      newData: {
        channel,
        type,
        title,
        result,
      },
    });

    return ok({ channel, ...result });
  } catch (e) {
    return err(
      e instanceof Error ? e.message : 'Internal server error',
      'INTERNAL_ERROR',
      500,
    );
  }
});
