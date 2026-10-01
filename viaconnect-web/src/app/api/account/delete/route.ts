import { NextResponse } from 'next/server';
import type { UserIdentity } from '@supabase/supabase-js';
import { accountAdmin } from '@/lib/account/admin-port';
import type { AppleIdentityInput } from '@/lib/account/apple-revoke';
import { runAccountDeletion } from '@/lib/account/run-account-deletion';
import type { BillingClient } from '@/lib/account/stripe-cleanup';
import { getStripe } from '@/lib/pricing/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { inMemoryRateLimit } from '@/lib/utils/inMemoryRateLimit';
import { safeLog } from '@/lib/utils/safe-log';
import { isTimeoutError, withTimeout } from '@/lib/utils/with-timeout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

function identitiesOf(identities: UserIdentity[] | undefined): AppleIdentityInput[] {
  if (!identities) return [];
  return identities.map((identity) => ({
    provider: identity.provider,
    identity_data: identity.identity_data,
  }));
}

function stripeClient(): BillingClient | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return getStripe();
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, errorCode: 'invalid_json' }, { status: 400 });
  }

  const record = typeof body === 'object' && body !== null ? body as Record<string, unknown> : {};
  if (record.confirmation !== 'DELETE') {
    return NextResponse.json({ ok: false, errorCode: 'confirmation_required' }, { status: 400 });
  }
  if ('userId' in record && typeof record.userId !== 'string') {
    return NextResponse.json({ ok: false, errorCode: 'invalid_user' }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data } = await withTimeout(supabase.auth.getUser(), 5000, 'account.delete.auth.getUser');
    const user = data.user;
    if (!user) {
      return NextResponse.json({ ok: false, errorCode: 'auth_required' }, { status: 401 });
    }

    if (typeof record.userId === 'string' && record.userId !== user.id) {
      safeLog.warn('account.delete', 'rejected client user id', { errorCode: 'user_mismatch' });
      return NextResponse.json({ ok: false, errorCode: 'user_mismatch' }, { status: 403 });
    }

    if (!inMemoryRateLimit(`account-delete:${user.id}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)) {
      return NextResponse.json({ ok: false, errorCode: 'rate_limited' }, { status: 429 });
    }

    let admin;
    try {
      admin = accountAdmin(createAdminClient());
    } catch {
      safeLog.error('account.delete', 'service role unavailable', { errorCode: 'server_not_configured' });
      return NextResponse.json({ ok: false, errorCode: 'server_not_configured' }, { status: 500 });
    }

    const result = await runAccountDeletion({
      userId: user.id,
      identities: identitiesOf(user.identities),
      admin,
      stripe: stripeClient(),
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, failedStep: result.failedStep, errorCode: result.errorCode, steps: result.steps },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, steps: result.steps });
  } catch (error) {
    if (isTimeoutError(error)) {
      safeLog.warn('account.delete', 'timed out', { errorCode: 'timeout' });
      return NextResponse.json({ ok: false, errorCode: 'timeout' }, { status: 503 });
    }
    safeLog.error('account.delete', 'unexpected error', { errorCode: 'internal_error' });
    return NextResponse.json({ ok: false, errorCode: 'internal_error' }, { status: 500 });
  }
}
