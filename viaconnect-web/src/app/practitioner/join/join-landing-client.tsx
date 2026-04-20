'use client';

// Prompt #98 Phase 2: Click recorder + cookie set on the public
// landing page.
//
// Runs once on mount when the launch flag is active and a referral
// code is present in the URL. Generates (or reads) a stable visitor
// uuid cookie + sets the referral code cookie, both with 90-day
// expiry. POSTs to /api/public/referral-click which goes through the
// SECURITY DEFINER RPC; the RPC silently no-ops on unknown / inactive
// codes so this client never knows or leaks code state.

import { useEffect } from 'react';

const COOKIE_DAYS = 90;
const VISITOR_COOKIE = 'viacura_visitor_uuid';
const REF_COOKIE = 'viacura_practitioner_ref_code';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

function writeCookie(name: string, value: string, days: number, sessionOnly: boolean) {
  if (typeof document === 'undefined') return;
  const parts = [`${name}=${encodeURIComponent(value)}`, 'path=/', 'SameSite=Lax'];
  if (!sessionOnly) {
    const expires = new Date(Date.now() + days * 86_400_000).toUTCString();
    parts.push(`expires=${expires}`);
  }
  document.cookie = parts.join('; ');
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as { randomUUID: () => string }).randomUUID();
  }
  // Lightweight fallback if randomUUID not present.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function JoinLandingClient({ codeSlug }: { codeSlug: string }) {
  useEffect(() => {
    const dnt = navigator.doNotTrack === '1' || (window as { doNotTrack?: string }).doNotTrack === '1';

    let visitorUuid = readCookie(VISITOR_COOKIE);
    if (!visitorUuid) {
      visitorUuid = uuid();
      writeCookie(VISITOR_COOKIE, visitorUuid, COOKIE_DAYS, dnt);
    }
    writeCookie(REF_COOKIE, codeSlug, COOKIE_DAYS, dnt);

    const utm = new URLSearchParams(window.location.search);
    fetch('/api/public/referral-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code_slug: codeSlug,
        visitor_uuid: visitorUuid,
        landing_url: window.location.href,
        utm_source: utm.get('utm_source') ?? undefined,
        utm_medium: utm.get('utm_medium') ?? undefined,
        utm_campaign: utm.get('utm_campaign') ?? undefined,
        referrer_url: document.referrer || undefined,
      }),
    }).catch(() => {
      // Click recording is best-effort; never block the page on it.
    });
  }, [codeSlug]);

  return null;
}
