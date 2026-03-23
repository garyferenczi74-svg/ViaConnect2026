import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { ok, err } from '../_shared/response.ts';
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts';
import { writeAudit } from '../_shared/audit.ts';
import { z } from '../_shared/validate.ts';

const InputSchema = z.object({
  email: z.string().email(),
});

function generateCode(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1000000).padStart(6, '0');
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body = await req.json();
    const parsed = InputSchema.safeParse(body);
    if (!parsed.success) {
      return err(parsed.error.issues[0].message, 'VALIDATION_ERROR');
    }
    const { email } = parsed.data;
    const admin = getSupabaseAdmin();

    // Rate limit: max 3 active codes per email in last 10 minutes
    const { count } = await admin
      .from('verification_codes')
      .select('*', { count: 'exact', head: true })
      .eq('email', email)
      .eq('used', false)
      .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString());

    if (count && count >= 3) {
      return err('Too many verification attempts. Please wait a few minutes.', 'RATE_LIMITED', 429);
    }

    // Generate and store code (10-minute expiry)
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: insertError } = await admin
      .from('verification_codes')
      .insert({ email, code, expires_at: expiresAt });

    if (insertError) {
      return err('Failed to create verification code', 'DB_ERROR', 500);
    }

    // Send via SendGrid
    const apiKey = Deno.env.get('SENDGRID_API_KEY');
    if (!apiKey) {
      return err('Email service not configured', 'CONFIG_ERROR', 500);
    }

    const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
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
        subject: 'Your ViaConnect Verification Code',
        content: [
          {
            type: 'text/html',
            value: `
              <div style="font-family:Inter,system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px">
                <div style="background:#224852;color:#fff;padding:16px 24px;border-radius:12px 12px 0 0">
                  <h1 style="margin:0;font-size:20px">ViaConnect GeneX360</h1>
                </div>
                <div style="background:#f9fafb;padding:24px;border-radius:0 0 12px 12px">
                  <h2 style="color:#224852;margin-top:0">Email Verification</h2>
                  <p style="color:#374151;line-height:1.6">Your verification code is:</p>
                  <div style="text-align:center;margin:24px 0">
                    <span style="font-family:'JetBrains Mono',monospace;font-size:32px;font-weight:bold;letter-spacing:8px;color:#224852;background:#e5e7eb;padding:12px 24px;border-radius:8px">${code}</span>
                  </div>
                  <p style="color:#6b7280;font-size:14px">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
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

    if (!sgRes.ok && sgRes.status !== 202) {
      const sgError = await sgRes.text();
      return err(`Email delivery failed: ${sgError}`, 'EMAIL_ERROR', 500);
    }

    await writeAudit({
      userId: null,
      action: 'send_verification_code',
      tableName: 'verification_codes',
      recordId: email,
      newData: { email, expires_at: expiresAt },
    });

    return ok({ sent: true });
  } catch (e) {
    return err(
      e instanceof Error ? e.message : 'Internal server error',
      'INTERNAL_ERROR',
      500,
    );
  }
});
