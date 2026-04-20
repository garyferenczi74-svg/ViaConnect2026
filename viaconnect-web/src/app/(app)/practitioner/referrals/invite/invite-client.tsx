'use client';

// Prompt #98 Phase 2: Invite a Peer client.
//
// Top: explanation of the milestone reward ladder ($200 + $500 +
// $1,000 + $2,000 over 18 to 24 months).
// Middle: persistent referral code + URL with copy-to-clipboard,
// QR code generated via the public qrserver.com endpoint (no JS dep
// added; just an <img>), and a mailto: link with a pre-filled
// pitch.
// Bottom: "How it works" + benefits the referred practitioner gets +
// link to the credit ledger page.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Loader2,
  Copy,
  CheckCircle2,
  Mail,
  Link2,
  Award,
  Send,
  Wallet,
} from 'lucide-react';

interface CodeResponse {
  code: { id: string; code: string; code_slug: string };
  full_url: string;
  was_existing: boolean;
}

const PITCH_TEXT = (url: string) => `Hi,

I have been using ViaCura for my practice and thought you might find it useful too. They have a wholesale supplement portal, certification courses, and (if you scale up) a white-label and custom-formulations program.

If you decide to enroll through this link, you get 15% off your first month of subscription and 15% off the Level 2 Precision Protocol certification: ${url}

Happy to answer any questions.`;

export default function InviteClient() {
  const [data, setData] = useState<CodeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'url' | 'pitch' | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetch('/api/practitioner/referrals/code');
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
        setData(json);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function copy(value: string, kind: 'url' | 'pitch') {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setError('Copy failed; please select and copy manually.');
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
  if (!data) {
    return (
      <div className="min-h-screen bg-[#0E1A30] text-white p-8 text-sm text-rose-300">
        {error ?? 'Could not load referral code.'}
      </div>
    );
  }

  const url = data.full_url;
  const code = data.code.code;
  const pitch = PITCH_TEXT(url);
  const mailto = `mailto:?subject=${encodeURIComponent('A platform you might find useful')}&body=${encodeURIComponent(pitch)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}`;

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-8 md:px-8 md:py-12">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-wider text-copper">Practitioner Referral</p>
          <h1 className="text-3xl md:text-4xl font-bold mt-1">Invite a Peer</h1>
          <p className="text-sm text-gray-400 mt-2 max-w-2xl">
            Refer a practitioner peer. As they reach engagement milestones over 18 to 24 months, you earn platform credits up to $3,700 per arc. Credits apply to your own ViaCura purchases.
          </p>
        </header>

        <section className="mb-8 rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Your referral code</p>
          <p className="font-mono text-xl tracking-wider">{code}</p>

          <div className="mt-4">
            <p className="text-xs text-gray-400 mb-1">Your referral URL</p>
            <div className="flex gap-2 items-center">
              <input readOnly value={url}
                className="flex-1 bg-white/[0.06] border border-white/10 rounded px-3 py-2 text-sm text-white font-mono" />
              <button onClick={() => copy(url, 'url')}
                className="text-xs px-3 py-2 rounded border border-white/10 hover:bg-white/[0.06] inline-flex items-center gap-1">
                {copied === 'url' ? <CheckCircle2 className="w-4 h-4 text-portal-green" strokeWidth={1.5} /> : <Copy className="w-4 h-4" strokeWidth={1.5} />}
                {copied === 'url' ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-2">QR code (for in-person sharing)</p>
              <img src={qrUrl} alt="Referral QR code"
                className="w-40 h-40 rounded-lg bg-white p-2" />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-2">Pre-filled outreach</p>
              <a href={mailto} className="inline-flex items-center gap-2 px-4 py-2 rounded bg-copper hover:bg-amber-600 text-white text-sm">
                <Mail className="w-4 h-4" strokeWidth={1.5} /> Open email client
              </a>
              <button onClick={() => copy(pitch, 'pitch')}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded border border-white/10 hover:bg-white/[0.06] text-white text-sm">
                {copied === 'pitch' ? <CheckCircle2 className="w-4 h-4 text-portal-green" strokeWidth={1.5} /> : <Send className="w-4 h-4" strokeWidth={1.5} />}
                {copied === 'pitch' ? 'Copied' : 'Copy pitch text'}
              </button>
            </div>
          </div>
        </section>

        <section className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs uppercase tracking-wider text-gray-400 mb-3 inline-flex items-center gap-1">
              <Award className="w-3 h-3" strokeWidth={1.5} /> How it works
            </p>
            <ol className="text-sm text-gray-300 space-y-1.5 list-decimal list-inside">
              <li>$200 when they subscribe + first $500+ wholesale order.</li>
              <li>$500 when they complete Master Practitioner certification.</li>
              <li>$1,000 when they receive their first Level 3 White-Label production delivery.</li>
              <li>$2,000 when their first Level 4 Custom Formulation is approved.</li>
            </ol>
            <p className="text-xs text-gray-500 mt-3">
              Each milestone has a 30-day fraud hold before credits vest. Total possible per successful arc: $3,700.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs uppercase tracking-wider text-gray-400 mb-3 inline-flex items-center gap-1">
              <Link2 className="w-3 h-3" strokeWidth={1.5} /> Referred practitioners get
            </p>
            <ul className="text-sm text-gray-300 space-y-1.5 list-disc list-inside">
              <li>15% off their first month of Standard or White-Label tier subscription.</li>
              <li>15% off Level 2 Precision Protocol certification ($888 to $754.80).</li>
              <li>The same product catalog and support you have today.</li>
            </ul>
          </div>
        </section>

        <section>
          <Link href="/practitioner/referrals/credits"
            className="text-xs text-copper hover:text-amber-300 inline-flex items-center gap-1">
            <Wallet className="w-3 h-3" strokeWidth={1.5} /> View my credit balance and history
          </Link>
        </section>
      </div>
    </div>
  );
}
