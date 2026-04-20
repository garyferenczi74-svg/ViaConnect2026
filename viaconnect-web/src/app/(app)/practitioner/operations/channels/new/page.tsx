'use client';

// Prompt #102 Phase 2: new channel wizard (minimal v1).

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Network } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  VERIFICATION_METHODS_BY_CHANNEL_TYPE,
  type ChannelType,
  type VerificationMethod,
} from '@/lib/verifiedChannels/types';

const CHANNEL_TYPE_OPTIONS: Array<{ value: ChannelType; label: string }> = [
  { value: 'own_website', label: 'Own website' },
  { value: 'amazon_storefront', label: 'Amazon storefront' },
  { value: 'etsy_shop', label: 'Etsy shop' },
  { value: 'shopify_store', label: 'Shopify store' },
  { value: 'tiktok_shop', label: 'TikTok Shop' },
  { value: 'physical_clinic_pos', label: 'Physical clinic POS' },
  { value: 'wholesale_partner_storefront', label: 'Wholesale partner storefront' },
  { value: 'pop_up_event', label: 'Pop-up event' },
];

export default function NewChannelPage() {
  const router = useRouter();
  const [channelType, setChannelType] = useState<ChannelType>('own_website');
  const [channelUrl, setChannelUrl] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [method, setMethod] = useState<VerificationMethod>('domain_meta_tag');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const methodOptions = VERIFICATION_METHODS_BY_CHANNEL_TYPE[channelType];

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as unknown as any;
      const { data: userResp } = await supabase.auth.getUser();
      const userId = userResp?.user?.id;
      if (!userId) throw new Error('Not authenticated.');

      const { data: prac } = await supabase
        .from('practitioners').select('id').eq('user_id', userId).maybeSingle();
      if (!prac) throw new Error('Practitioner record not found.');

      const { data: inserted, error: insertError } = await supabase
        .from('practitioner_verified_channels')
        .insert({
          practitioner_id: prac.id,
          channel_type: channelType,
          channel_url: channelUrl,
          channel_display_name: displayName,
          verification_method: method,
        })
        .select('channel_id')
        .single();
      if (insertError) throw insertError;

      // Create a pending verification attempt with a fresh token.
      const tokenHex = Array.from(crypto.getRandomValues(new Uint8Array(8)))
        .map((b) => b.toString(16).padStart(2, '0')).join('');
      const token = `VC-${tokenHex}`;
      const expires = new Date();
      expires.setDate(expires.getDate() + 7);
      await supabase.from('channel_verification_attempts').insert({
        channel_id: inserted.channel_id,
        method,
        attempt_token: token,
        expires_at: expires.toISOString(),
      });

      router.push(`/practitioner/operations/channels/${inserted.channel_id}`);
    } catch (err) {
      setError((err as Error).message ?? 'Submit failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
        <Link href="/practitioner/operations/channels" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Channels
        </Link>
        <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
          <Network className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
          Add a channel
        </h1>

        <label className="block">
          <span className="text-[11px] text-white/55">Channel type</span>
          <select value={channelType} onChange={(e) => {
            const next = e.target.value as ChannelType;
            setChannelType(next);
            setMethod(VERIFICATION_METHODS_BY_CHANNEL_TYPE[next][0]!);
          }} className="mt-1 w-full rounded-lg bg-white/[0.04] border border-white/[0.1] px-3 py-1.5 text-xs text-white">
            {CHANNEL_TYPE_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
          </select>
        </label>

        <label className="block">
          <span className="text-[11px] text-white/55">Channel URL</span>
          <input value={channelUrl} onChange={(e) => setChannelUrl(e.target.value)} placeholder="https://my-practitioner-site.com" className="mt-1 w-full rounded-lg bg-white/[0.04] border border-white/[0.1] px-3 py-1.5 text-xs text-white" />
        </label>

        <label className="block">
          <span className="text-[11px] text-white/55">Display name</span>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="My clinic storefront" className="mt-1 w-full rounded-lg bg-white/[0.04] border border-white/[0.1] px-3 py-1.5 text-xs text-white" />
        </label>

        <label className="block">
          <span className="text-[11px] text-white/55">Verification method</span>
          <select value={method} onChange={(e) => setMethod(e.target.value as VerificationMethod)} className="mt-1 w-full rounded-lg bg-white/[0.04] border border-white/[0.1] px-3 py-1.5 text-xs text-white">
            {methodOptions.map((m) => (<option key={m} value={m}>{m.replace(/_/g, ' ')}</option>))}
          </select>
        </label>

        {error && <p className="text-[11px] text-red-300">{error}</p>}

        <div className="flex items-center justify-end gap-2">
          <Link href="/practitioner/operations/channels" className="rounded-lg border border-white/[0.1] px-3 py-1.5 text-[11px] text-white/70 hover:text-white">Cancel</Link>
          <button type="submit" disabled={submitting || channelUrl.length < 5 || displayName.length < 2} className="rounded-lg bg-[#2DA5A0] hover:bg-[#2DA5A0]/80 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 text-[11px] font-semibold text-[#0B1520]">
            {submitting ? 'Creating...' : 'Create + get verification token'}
          </button>
        </div>
      </form>
    </div>
  );
}
