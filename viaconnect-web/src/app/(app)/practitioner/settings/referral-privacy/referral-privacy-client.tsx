'use client';

// Prompt #98 Phase 3: Referral privacy settings client.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Save,
} from 'lucide-react';

interface AttributionInfo {
  id: string;
  status: string;
  referring_practice_name: string | null;
  notification_preferences: {
    allow_referrer_progress_notifications: boolean;
    opted_out_at: string | null;
    updated_at: string | null;
  };
}

export default function ReferralPrivacyClient() {
  const [info, setInfo] = useState<AttributionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allowNotifications, setAllowNotifications] = useState(true);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/practitioner/referrals/attribution-info');
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      const a = json.attribution as AttributionInfo | null;
      setInfo(a);
      if (a) setAllowNotifications(a.notification_preferences.allow_referrer_progress_notifications);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); }, []);

  async function save() {
    if (!info) return;
    setSaving(true);
    setError(null);
    try {
      const r = await fetch('/api/practitioner/referrals/notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allow_referrer_progress_notifications: allowNotifications }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      setSavedAt(new Date().toISOString());
      await reload();
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

  if (!info) {
    return (
      <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-10 md:px-8 md:py-16">
        <div className="max-w-2xl mx-auto rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <h1 className="text-2xl font-bold mb-2">No referral attribution</h1>
          <p className="text-sm text-gray-400">
            You were not referred by another practitioner, so there is nothing to configure here.
          </p>
        </div>
      </div>
    );
  }

  const referrerName = info.referring_practice_name ?? 'your referrer';
  const lastUpdated = info.notification_preferences.updated_at;
  const optedOutAt = info.notification_preferences.opted_out_at;

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-8 md:px-8 md:py-12">
      <div className="max-w-2xl mx-auto">
        <header className="mb-6">
          <Link href="/practitioner/dashboard" className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> Dashboard
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold mt-2">Referral privacy</h1>
          <p className="text-sm text-gray-400 mt-1">
            Control whether {referrerName} receives notifications about your milestone progress.
          </p>
        </header>

        {error && (
          <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 inline-flex items-center gap-2">
            <AlertCircle className="w-4 h-4" strokeWidth={1.5} /> {error}
          </div>
        )}

        {savedAt && (
          <div className="mb-4 rounded-lg border border-portal-green/30 bg-portal-green/10 p-3 text-sm text-portal-green inline-flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} /> Saved {new Date(savedAt).toLocaleString()}
          </div>
        )}

        <section className="mb-6 rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-start gap-3 mb-3">
            {allowNotifications ? (
              <Eye className="w-5 h-5 text-portal-green shrink-0 mt-0.5" strokeWidth={1.5} />
            ) : (
              <EyeOff className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" strokeWidth={1.5} />
            )}
            <div>
              <p className="font-semibold text-sm">
                Referrer progress notifications: {allowNotifications ? 'enabled' : 'disabled'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {allowNotifications
                  ? `${referrerName} receives a notification each time you reach a milestone.`
                  : `${referrerName} receives no progress notifications. Their credits still vest as you reach milestones.`}
              </p>
              {lastUpdated && (
                <p className="text-xs text-gray-500 mt-1">Last updated {new Date(lastUpdated).toLocaleString()}</p>
              )}
              {optedOutAt && !allowNotifications && (
                <p className="text-xs text-gray-500 mt-1">Opted out {new Date(optedOutAt).toLocaleString()}</p>
              )}
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={allowNotifications}
              onChange={(e) => setAllowNotifications(e.target.checked)}
            />
            Allow {referrerName} to see my milestone progress
          </label>

          <div className="mt-4">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded bg-copper hover:bg-amber-600 text-white text-sm disabled:opacity-40"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> : <Save className="w-3.5 h-3.5" strokeWidth={1.5} />}
              Save preference
            </button>
          </div>
        </section>

        <p className="text-xs text-gray-500">
          Your decision does not affect your referral benefits or your referrer's credits. It only controls notifications.
        </p>
      </div>
    </div>
  );
}
