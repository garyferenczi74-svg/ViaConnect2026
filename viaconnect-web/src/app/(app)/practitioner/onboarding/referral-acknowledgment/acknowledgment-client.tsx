'use client';

// Prompt #98 Phase 3: Referred-practitioner acknowledgment client.
//
// Two responsibilities:
//   1. Surface the referrer's practice name so the new practitioner
//      knows who introduced them.
//   2. Explain the benefits + privacy posture, with an inline
//      toggle that defaults to opt-in.
//
// When the practitioner has no attribution row (organic signup) the
// client redirects to the next onboarding step rather than rendering
// an empty acknowledgment page.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Award,
  Tag,
} from 'lucide-react';

interface AttributionInfo {
  id: string;
  status: string;
  referring_practice_name: string | null;
  attributed_at: string;
  first_month_discount: { redeemed: boolean; redeemed_at: string | null };
  cert_discount: { redeemed: boolean; redeemed_at: string | null };
  notification_preferences: {
    allow_referrer_progress_notifications: boolean;
    opted_out_at: string | null;
  };
}

export default function AcknowledgmentClient() {
  const router = useRouter();
  const [info, setInfo] = useState<AttributionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allowNotifications, setAllowNotifications] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetch('/api/practitioner/referrals/attribution-info');
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
        if (!json.attribution) {
          // Organic signup; skip this step.
          router.replace('/practitioner/dashboard');
          return;
        }
        setInfo(json.attribution as AttributionInfo);
        setAllowNotifications(json.attribution.notification_preferences.allow_referrer_progress_notifications);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function continueOnboarding() {
    if (!info) return;
    setSaving(true);
    setError(null);
    try {
      // Persist the practitioner's notification choice (could be the
      // default true or an explicit toggle).
      await fetch('/api/practitioner/referrals/notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allow_referrer_progress_notifications: allowNotifications }),
      });
      router.push('/practitioner/dashboard');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E1A30] text-white p-8">
        <div className="text-sm text-gray-400 inline-flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> Loading
        </div>
      </div>
    );
  }
  if (!info) return null;

  const referrerName = info.referring_practice_name ?? 'a peer practitioner';

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-8 md:px-8 md:py-12">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-wider text-copper">Welcome</p>
          <h1 className="text-3xl md:text-4xl font-bold mt-1">You were referred by {referrerName}</h1>
          <p className="text-sm text-gray-400 mt-2">
            They will receive platform credits as you reach key engagement milestones (subscribing, completing certification, producing your first product). You are not obligated to anything beyond what you would normally do; this just acknowledges their introduction.
          </p>
        </header>

        {error && (
          <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 inline-flex items-center gap-2">
            <AlertCircle className="w-4 h-4" strokeWidth={1.5} /> {error}
          </div>
        )}

        <section className="mb-6 rounded-xl border border-portal-green/30 bg-portal-green/10 p-5">
          <p className="text-xs uppercase tracking-wider text-portal-green mb-2 inline-flex items-center gap-1">
            <Tag className="w-3 h-3" strokeWidth={1.5} /> Your referral benefits
          </p>
          <ul className="text-sm space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-portal-green shrink-0 mt-0.5" strokeWidth={1.5} />
              <span>15% off your first subscription month (Standard Portal or White-Label Platform). Applied automatically at checkout.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-portal-green shrink-0 mt-0.5" strokeWidth={1.5} />
              <span>15% off Level 2 Precision Protocol certification ($888 to $754.80). Applied automatically when you enroll.</span>
            </li>
          </ul>
        </section>

        <section className="mb-6 rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-xs uppercase tracking-wider text-gray-400 mb-2 inline-flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" strokeWidth={1.5} /> Privacy preference
          </p>
          <label className="flex items-start gap-3 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={allowNotifications}
              onChange={(e) => setAllowNotifications(e.target.checked)}
              className="mt-1"
            />
            <div>
              <p className="font-medium">Share my milestone progress with {referrerName}.</p>
              <p className="text-xs text-gray-400 mt-1">
                Let your referrer see when you hit milestones. Your credits still vest to them either way; this only controls whether they receive notifications. You can change this any time in settings.
              </p>
            </div>
          </label>
        </section>

        <section className="mb-6 rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-xs uppercase tracking-wider text-gray-400 mb-2 inline-flex items-center gap-1">
            <Award className="w-3 h-3" strokeWidth={1.5} /> What your referrer earns
          </p>
          <p className="text-sm text-gray-300">
            ViaCura pays platform credits to {referrerName} as you reach four engagement milestones: subscription + first wholesale order ($200), Master Practitioner certification ($500), Level 3 White-Label first delivery ($1,000), Level 4 Custom Formulation first approval ($2,000). Credits apply only against ViaCura purchases; never cash. A 30-day fraud hold runs on every milestone before vesting.
          </p>
        </section>

        <footer className="flex justify-end">
          <button
            onClick={continueOnboarding}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-copper hover:bg-amber-600 text-white text-sm font-medium disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> : <ArrowRight className="w-4 h-4" strokeWidth={1.5} />}
            Continue
          </button>
        </footer>
      </div>
    </div>
  );
}
