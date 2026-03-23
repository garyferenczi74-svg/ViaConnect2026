import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { ok, err } from '../_shared/response.ts';
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts';
import { z } from '../_shared/validate.ts';

const SendOTPSchema = z.object({
  email: z.string().email(),
  type: z.enum(['signup', 'recovery']),
});

const VerifyOTPSchema = z.object({
  email: z.string().email(),
  token: z.string().length(6),
  type: z.enum(['signup', 'recovery']),
});

// ── Generate a 6-digit OTP ──────────────────────────────────────────────
function generateOTP(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1000000).padStart(6, '0');
}

// ── Send email via SendGrid HTTP API ────────────────────────────────────
async function sendViaSendGrid(
  to: string,
  subject: string,
  htmlBody: string,
): Promise<{ sent: boolean; error?: string }> {
  const apiKey = Deno.env.get('SENDGRID_API_KEY');
  if (!apiKey) return { sent: false, error: 'SENDGRID_API_KEY not configured' };

  // Use the same verified sender as send-notification
  const fromEmail = Deno.env.get('SENDGRID_FROM_EMAIL') || 'notifications@farmceutica.com';
  const fromName = Deno.env.get('SENDGRID_FROM_NAME') || 'ViaConnect GeneX360';

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmail, name: fromName },
      subject,
      content: [{ type: 'text/html', value: htmlBody }],
    }),
  });

  if (res.ok || res.status === 202) {
    return { sent: true };
  }

  const errorText = await res.text();
  return { sent: false, error: `SendGrid ${res.status}: ${errorText}` };
}

// ── Branded OTP email HTML ──────────────────────────────────────────────
function otpEmailHtml(otp: string, type: 'signup' | 'recovery'): string {
  const heading = type === 'signup' ? 'Verify Your Email' : 'Reset Your Password';
  const instruction =
    type === 'signup'
      ? 'Enter this 6-digit code in the app to complete your registration:'
      : 'Enter this 6-digit code in the app to reset your password:';

  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#111827;font-family:'Inter',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#111827;padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background-color:#1F2937;border-radius:16px;padding:40px;">
        <tr><td align="center" style="padding-bottom:24px;">
          <h1 style="color:#B75F19;font-size:22px;margin:0;">ViaConnect GeneX360</h1>
          <p style="color:#9CA3AF;font-size:13px;margin:4px 0 0;">One Genome. One Formulation. One Life at a Time.</p>
        </td></tr>
        <tr><td align="center" style="padding-bottom:24px;">
          <h2 style="color:#FFFFFF;font-size:18px;margin:0 0 8px;">${heading}</h2>
          <p style="color:#D1D5DB;font-size:14px;margin:0;line-height:1.5;">${instruction}</p>
        </td></tr>
        <tr><td align="center" style="padding-bottom:24px;">
          <div style="background-color:#224852;border-radius:12px;padding:20px 32px;display:inline-block;">
            <span style="color:#FFFFFF;font-size:36px;font-family:'JetBrains Mono',monospace;letter-spacing:8px;font-weight:700;">
              ${otp}
            </span>
          </div>
        </td></tr>
        <tr><td align="center" style="padding-bottom:16px;">
          <p style="color:#9CA3AF;font-size:12px;margin:0;">
            This code expires in 10 minutes. If you didn't request this, ignore this email.
          </p>
        </td></tr>
        <tr><td align="center">
          <p style="color:#4B5563;font-size:11px;margin:0;">FarmCeutica Wellness LLC &bull; Buffalo, NY</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);
  const action = url.pathname.split('/').pop(); // "send" or "verify"
  const admin = getSupabaseAdmin();

  try {
    // ── POST /send-otp/send ───────────────────────────────────────────
    if (action === 'send') {
      const body = await req.json();
      const parsed = SendOTPSchema.safeParse(body);
      if (!parsed.success) {
        return err(parsed.error.issues[0].message, 'VALIDATION_ERROR');
      }
      const { email, type } = parsed.data;

      // Generate OTP and expiry
      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

      // Store OTP in DB (upsert so resend replaces the old one)
      const { error: dbError } = await admin
        .from('email_otps')
        .upsert(
          {
            email: email.toLowerCase(),
            otp_hash: otp, // In production, hash this; for now, store directly
            type,
            expires_at: expiresAt,
            attempts: 0,
          },
          { onConflict: 'email,type' },
        );

      if (dbError) {
        return err(`Failed to store OTP: ${dbError.message}`, 'DB_ERROR', 500);
      }

      // Send via SendGrid HTTP API
      const subject =
        type === 'signup'
          ? 'Your ViaConnect Verification Code'
          : 'Reset Your ViaConnect Password';

      const result = await sendViaSendGrid(email, subject, otpEmailHtml(otp, type));

      if (!result.sent) {
        return err(result.error ?? 'Email delivery failed', 'EMAIL_ERROR', 500);
      }

      return ok({ sent: true, message: `Verification code sent to ${email}` });
    }

    // ── POST /send-otp/verify ─────────────────────────────────────────
    if (action === 'verify') {
      const body = await req.json();
      const parsed = VerifyOTPSchema.safeParse(body);
      if (!parsed.success) {
        return err(parsed.error.issues[0].message, 'VALIDATION_ERROR');
      }
      const { email, token, type } = parsed.data;

      // Look up OTP
      const { data: otpRecord, error: lookupError } = await admin
        .from('email_otps')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('type', type)
        .single();

      if (lookupError || !otpRecord) {
        return err('No verification code found. Please request a new one.', 'OTP_NOT_FOUND');
      }

      // Check expiry
      if (new Date(otpRecord.expires_at) < new Date()) {
        await admin
          .from('email_otps')
          .delete()
          .eq('email', email.toLowerCase())
          .eq('type', type);
        return err('Code expired. Please request a new one.', 'OTP_EXPIRED');
      }

      // Check attempts (max 5)
      if (otpRecord.attempts >= 5) {
        await admin
          .from('email_otps')
          .delete()
          .eq('email', email.toLowerCase())
          .eq('type', type);
        return err('Too many attempts. Please request a new code.', 'OTP_MAX_ATTEMPTS');
      }

      // Increment attempts
      await admin
        .from('email_otps')
        .update({ attempts: otpRecord.attempts + 1 })
        .eq('email', email.toLowerCase())
        .eq('type', type);

      // Verify
      if (otpRecord.otp_hash !== token) {
        return err('Invalid code. Please try again.', 'OTP_INVALID');
      }

      // OTP is valid — clean up
      await admin
        .from('email_otps')
        .delete()
        .eq('email', email.toLowerCase())
        .eq('type', type);

      // For signup: confirm the user's email in Supabase Auth
      if (type === 'signup') {
        // Find user by email and update email_confirmed_at
        const { data: users } = await admin.auth.admin.listUsers();
        const user = users?.users?.find(
          (u) => u.email?.toLowerCase() === email.toLowerCase(),
        );
        if (user) {
          await admin.auth.admin.updateUserById(user.id, {
            email_confirm: true,
          });
        }
      }

      return ok({ verified: true });
    }

    return err('Invalid action. Use /send or /verify', 'INVALID_ACTION');
  } catch (e) {
    return err(
      e instanceof Error ? e.message : 'Internal server error',
      'INTERNAL_ERROR',
      500,
    );
  }
});
