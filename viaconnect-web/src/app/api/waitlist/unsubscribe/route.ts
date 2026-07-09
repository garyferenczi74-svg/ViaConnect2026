// =============================================================================
// GET /api/waitlist/unsubscribe (Prompt 210f Task F4b)
// =============================================================================
// One-click unsubscribe landing for the practitioner waitlist mailer
// (CAN-SPAM / CASL requirement; arming of the mailer cron is blocked until
// this path plus the postal address line are live).
//
// Anon-accessible BY DESIGN: unsubscribing must never require a login. The
// capability is the token itself: <waitlistId>.<HMAC-SHA256 signature>,
// signed by the mailer with UNSUBSCRIBE_TOKEN_SECRET and verified here by
// the canonical module src/lib/waitlist/unsubscribe-token.ts (constant-time
// compare). Forging a token requires the secret, so this endpoint is not an
// enumeration or mass-unsubscribe oracle.
//
// SECRET: Gary sets UNSUBSCRIBE_TOKEN_SECRET in the Vercel env at arming
// (same value as the mailer's Supabase function secret). Until then this
// route degrades gracefully to a 503 page and changes nothing.
//
// Effect on a valid token: practitioner_waitlist.unsubscribed = true for
// that single row (column shipped in the F3 migration
// 20260707170000_prompt_210f_certification_waitlist_additive.sql; the
// mailer re-checks it per lead at send time and marks queue rows 'skipped').
// Idempotent single-row update keyed by the row's unique id, so repeat
// clicks and bots re-fetching the link are harmless (rate consideration).
//
// PRIVACY: responses and logs never echo the token, the waitlist id, or any
// email address. Invalid tokens get an honest error page that does not
// reveal whether any address exists. A valid-signature token whose row was
// deleted still gets the confirmation page (true statement, no oracle).
// All page text is static server-controlled strings; nothing user-supplied
// is interpolated into the HTML.
//
// Rules: zero any, no emojis, no em dashes, no en dashes.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyUnsubscribeToken } from '@/lib/waitlist/unsubscribe-token';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { reportSupabaseError } from '@/lib/utils/schema-drift';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SCOPE = 'api.waitlist.unsubscribe';
const DB_TIMEOUT_MS = 10000;

// -----------------------------------------------------------------------------
// Minimal branded page (design system: Deep Navy #1A2744 background,
// #1E3054 card panel, teal #2DA5A0 accent, Instrument Sans inherited from
// the brand with system fallbacks). Static strings only.
// -----------------------------------------------------------------------------
function brandedPage(title: string, heading: string, paragraphs: readonly string[]): string {
  const body = paragraphs.map((p) => `<p style="margin:0 0 16px;line-height:1.6;color:#cfd8ea;font-size:16px;">${p}</p>`).join('');
  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8"/>',
    '<meta name="viewport" content="width=device-width, initial-scale=1"/>',
    '<meta name="robots" content="noindex"/>',
    `<title>${title}</title>`,
    '</head>',
    '<body style="margin:0;background-color:#1A2744;font-family:\'Instrument Sans\',ui-sans-serif,system-ui,-apple-system,\'Segoe UI\',sans-serif;">',
    '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;">',
    '<main style="max-width:480px;width:100%;background-color:#1E3054;border:1px solid rgba(45,165,160,0.35);border-radius:16px;padding:32px;">',
    '<div style="width:40px;height:4px;background-color:#2DA5A0;border-radius:2px;margin:0 0 24px;"></div>',
    `<h1 style="margin:0 0 16px;color:#ffffff;font-size:22px;line-height:1.3;font-weight:600;">${heading}</h1>`,
    body,
    '<p style="margin:24px 0 0;color:#8fa3c4;font-size:13px;">FarmCeutica Wellness LLC</p>',
    '</main>',
    '</div>',
    '</body>',
    '</html>',
  ].join('');
}

function htmlResponse(page: string, status: number): NextResponse {
  return new NextResponse(page, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}

const CONFIRMED_PAGE = brandedPage(
  'Unsubscribed',
  'You are unsubscribed',
  [
    'This email address will not receive further practitioner waitlist emails from FarmCeutica Wellness LLC.',
    'No further action is needed. You may close this page.',
  ],
);

const INVALID_PAGE = brandedPage(
  'Link not valid',
  'This unsubscribe link is not valid',
  [
    'The link may be incomplete, expired, or altered. Please open the unsubscribe link from your email again, copying the full address.',
    'If the problem continues, reply to the email you received and ask to be removed. A person will handle it.',
  ],
);

const UNAVAILABLE_PAGE = brandedPage(
  'Temporarily unavailable',
  'Unsubscribe is temporarily unavailable',
  [
    'We could not process your request right now. Please try the link again later.',
    'You can also reply to the email you received and ask to be removed. A person will handle it.',
  ],
);

const ERROR_PAGE = brandedPage(
  'Something went wrong',
  'We could not complete your request',
  [
    'An unexpected error occurred while processing your unsubscribe request. Please try the link again later.',
    'You can also reply to the email you received and ask to be removed. A person will handle it.',
  ],
);

export async function GET(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.UNSUBSCRIBE_TOKEN_SECRET ?? '';
  if (!secret) {
    // Graceful 503 by design: Gary sets UNSUBSCRIBE_TOKEN_SECRET in the
    // Vercel env at arming. Nothing is verified or updated before then.
    safeLog.error(SCOPE, 'UNSUBSCRIBE_TOKEN_SECRET is not set; unsubscribe endpoint unavailable', {});
    return htmlResponse(UNAVAILABLE_PAGE, 503);
  }

  const verification = verifyUnsubscribeToken(request.nextUrl.searchParams.get('token'), secret);
  if (!verification.valid) {
    // Honest error, no information leak: the page does not say whether any
    // address exists, and the log carries no token material.
    safeLog.warn(SCOPE, 'rejected an invalid or tampered unsubscribe link', {});
    return htmlResponse(INVALID_PAGE, 400);
  }

  // Single-row, idempotent update keyed by the row's unique id, under the
  // service-role client: the anon role has no UPDATE policy on
  // practitioner_waitlist, and this endpoint must work without a session.
  let updateError: unknown = null;
  try {
    const supabase = createAdminClient();
    const { error } = await withTimeout(
      (async () =>
        supabase
          .from('practitioner_waitlist')
          .update({ unsubscribed: true, updated_at: new Date().toISOString() })
          .eq('id', verification.waitlistId))(),
      DB_TIMEOUT_MS,
      'api.waitlist.unsubscribe.update',
    );
    updateError = error ?? null;
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error(SCOPE, 'unsubscribe update timed out', { error: err });
      return htmlResponse(UNAVAILABLE_PAGE, 503);
    }
    safeLog.error(SCOPE, 'unsubscribe update threw', { error: err });
    return htmlResponse(ERROR_PAGE, 500);
  }

  if (updateError) {
    reportSupabaseError('waitlist.unsubscribe.update', updateError, { table: 'practitioner_waitlist' });
    return htmlResponse(ERROR_PAGE, 500);
  }

  // Zero matched rows (row deleted since the email went out) intentionally
  // falls through to the same confirmation: the statement stays true and
  // existence is not disclosed either way.
  return htmlResponse(CONFIRMED_PAGE, 200);
}
