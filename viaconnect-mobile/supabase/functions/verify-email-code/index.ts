import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { ok, err } from '../_shared/response.ts';
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts';
import { writeAudit } from '../_shared/audit.ts';
import { z } from '../_shared/validate.ts';

const InputSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body = await req.json();
    const parsed = InputSchema.safeParse(body);
    if (!parsed.success) {
      return err(parsed.error.issues[0].message, 'VALIDATION_ERROR');
    }
    const { email, code } = parsed.data;
    const admin = getSupabaseAdmin();

    // Find valid, unused code for this email
    const { data: record, error: fetchError } = await admin
      .from('verification_codes')
      .select('id, code, expires_at')
      .eq('email', email)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !record) {
      return err('No valid verification code found. Please request a new one.', 'CODE_NOT_FOUND');
    }

    if (record.code !== code) {
      return err('Invalid verification code', 'INVALID_CODE');
    }

    // Mark code as used
    await admin
      .from('verification_codes')
      .update({ used: true })
      .eq('id', record.id);

    // Find the user by email and confirm them via admin API
    const { data: users } = await admin.auth.admin.listUsers();
    const user = users?.users?.find((u) => u.email === email);

    if (user) {
      // Confirm the user's email
      await admin.auth.admin.updateUserById(user.id, {
        email_confirm: true,
      });

      await writeAudit({
        userId: user.id,
        action: 'email_verified',
        tableName: 'verification_codes',
        recordId: record.id,
        newData: { email, verified: true },
      });

      return ok({ verified: true, userId: user.id });
    }

    return err('User account not found', 'USER_NOT_FOUND');
  } catch (e) {
    return err(
      e instanceof Error ? e.message : 'Internal server error',
      'INTERNAL_ERROR',
      500,
    );
  }
});
