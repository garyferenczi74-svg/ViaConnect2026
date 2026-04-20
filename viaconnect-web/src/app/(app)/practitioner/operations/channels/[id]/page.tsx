'use client';

// Prompt #102 Phase 2: practitioner channel detail + verify trigger.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Network, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { ChannelState, VerificationMethod } from '@/lib/verifiedChannels/types';
import { metaTagSnippet } from '@/lib/verifiedChannels/verificationMethods/metaTag';
import { dnsRecordName } from '@/lib/verifiedChannels/verificationMethods/dnsTxt';

interface Channel {
  channel_id: string;
  channel_url: string;
  channel_display_name: string;
  state: ChannelState;
  verification_method: VerificationMethod | null;
  verified_at: string | null;
  re_verify_due_at: string | null;
}

interface Attempt {
  attempt_id: string;
  method: VerificationMethod;
  attempt_token: string;
  expires_at: string;
  attempt_status: string;
}

export default function ChannelDetailPage() {
  const params = useParams<{ id: string }>();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!params?.id) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as unknown as any;
    const { data: ch } = await supabase
      .from('practitioner_verified_channels').select('*').eq('channel_id', params.id).maybeSingle();
    if (ch) setChannel(ch as Channel);

    const { data: at } = await supabase
      .from('channel_verification_attempts').select('*')
      .eq('channel_id', params.id).eq('attempt_status', 'pending')
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    setAttempt((at as Attempt) ?? null);
  }, [params?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  const runVerification = async () => {
    if (!channel || !attempt) return;
    setVerifying(true);
    setResult(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as unknown as any;
      const fnName = attempt.method === 'domain_meta_tag'
        ? 'verify_channel_meta_tag'
        : attempt.method === 'dns_txt_record'
        ? 'verify_channel_dns_txt'
        : null;
      if (!fnName) {
        setResult('This verification method is managed server-side.');
        return;
      }
      const { data, error } = await supabase.functions.invoke(fnName, {
        body: { channelId: channel.channel_id },
      });
      if (error) throw error;
      setResult(data?.verified ? 'Verified.' : `Not verified: ${data?.reason ?? 'unknown'}`);
      await refresh();
    } catch (err) {
      setResult(`Verification error: ${(err as Error).message}`);
    } finally {
      setVerifying(false);
    }
  };

  if (!channel) return <div className="min-h-screen bg-[#0B1520] text-white p-6"><p className="text-xs text-white/60">Loading...</p></div>;

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4">
        <Link href="/practitioner/operations/channels" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Channels
        </Link>
        <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
          <Network className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
          {channel.channel_display_name}
        </h1>

        <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4 space-y-2">
          <a href={channel.channel_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-[#2DA5A0] hover:underline">
            <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
            {channel.channel_url}
          </a>
          <p className="text-[11px] text-white/55">State: {channel.state.replace(/_/g, ' ')}</p>
          {channel.verified_at && (
            <p className="text-[11px] text-white/55">Verified: {new Date(channel.verified_at).toLocaleString()}</p>
          )}
          {channel.re_verify_due_at && (
            <p className="text-[11px] text-white/55">Re-verify by: {new Date(channel.re_verify_due_at).toLocaleString()}</p>
          )}
        </section>

        {attempt && (
          <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4 space-y-3">
            <h2 className="text-sm font-semibold">Pending verification</h2>
            <p className="text-[11px] text-white/55">Method: {attempt.method.replace(/_/g, ' ')}</p>
            {attempt.method === 'domain_meta_tag' && (
              <div>
                <p className="text-[11px] text-white/70 mb-1">Paste this into your site&apos;s &lt;head&gt;:</p>
                <code className="block rounded bg-black/40 p-2 text-[10px] text-white/90 font-mono break-all">
                  {metaTagSnippet(attempt.attempt_token)}
                </code>
              </div>
            )}
            {attempt.method === 'dns_txt_record' && (
              <div className="space-y-1">
                <p className="text-[11px] text-white/70">Add this DNS TXT record:</p>
                <p className="text-[10px] font-mono text-white/90">Name: {dnsRecordName(channel.channel_url)}</p>
                <p className="text-[10px] font-mono text-white/90">Value: {attempt.attempt_token}</p>
              </div>
            )}
            <button onClick={runVerification} disabled={verifying} className="rounded-lg bg-[#2DA5A0] hover:bg-[#2DA5A0]/80 disabled:opacity-50 px-3 py-1.5 text-[11px] font-semibold text-[#0B1520]">
              {verifying ? 'Checking...' : 'Run verification'}
            </button>
            {result && <p className="text-[11px] text-white/70">{result}</p>}
            <p className="text-[10px] text-white/45">Token expires: {new Date(attempt.expires_at).toLocaleString()}</p>
          </section>
        )}
      </div>
    </div>
  );
}
