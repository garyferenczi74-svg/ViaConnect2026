import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { ok, err } from '../_shared/response.ts';
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts';
import { writeAudit } from '../_shared/audit.ts';
import { z } from '../_shared/validate.ts';

const InputSchema = z.object({
  email: z.string().email(),
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
    const { email } = parsed.data;
    const admin = getSupabaseAdmin();

    // Find user by email using admin API (handles pagination)
    const { data: userList, error: listError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (listError) {
      return err('Failed to look up user', 'DB_ERROR', 500);
    }

    const user = userList?.users?.find((u) => u.email === email);

    if (!user) {
      return err('User not found', 'USER_NOT_FOUND', 404);
    }

    // Confirm the user's email via admin API
    const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
      email_confirm: true,
    });

    if (updateError) {
      return err('Failed to confirm user', 'CONFIRM_ERROR', 500);
    }

    await writeAudit({
      userId: user.id,
      action: 'auto_confirm_signup',
      tableName: 'auth.users',
      recordId: user.id,
      newData: { email, email_confirmed: true },
    });

    return ok({ confirmed: true, userId: user.id });
  } catch (e) {
    return err(
      e instanceof Error ? e.message : 'Internal server error',
      'INTERNAL_ERROR',
      500,
    );
  }
});
