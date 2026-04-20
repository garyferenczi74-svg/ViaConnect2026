'use client';

// Prompt #102 Phase 2: practitioner channels list.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Network, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { ChannelState, ChannelType } from '@/lib/verifiedChannels/types';

interface ChannelRow {
  channel_id: string;
  channel_type: ChannelType;
  channel_url: string;
  channel_display_name: string;
  state: ChannelState;
  verified_at: string | null;
  re_verify_due_at: string | null;
}

const STATE_TONE: Record<ChannelState, string> = {
  pending_verification: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  verified: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  verification_lapsed: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  verification_failed: 'bg-red-500/15 text-red-300 border-red-500/30',
  volume_flagged: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  suspended: 'bg-red-500/15 text-red-300 border-red-500/30',
};

export default function PractitionerChannelsListPage() {
  const [rows, setRows] = useState<ChannelRow[]>([]);

  const refresh = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as unknown as any;
    const { data } = await supabase
      .from('practitioner_verified_channels')
      .select('channel_id, channel_type, channel_url, channel_display_name, state, verified_at, re_verify_due_at')
      .order('created_at', { ascending: false });
    setRows((data ?? []) as ChannelRow[]);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link href="/practitioner/operations" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Operations
            </Link>
            <h1 className="text-xl sm:text-2xl font-semibold mt-2 flex items-center gap-2">
              <Network className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
              Verified channels
            </h1>
            <p className="text-xs text-white/55 mt-1">
              Declare + verify your own sales channels. Only verified channels grant VIP exemption coverage in MAP monitoring.
            </p>
          </div>
          <Link href="/practitioner/operations/channels/new" className="inline-flex items-center gap-1.5 rounded-lg bg-[#2DA5A0] hover:bg-[#2DA5A0]/80 px-3 py-1.5 text-[11px] font-semibold text-[#0B1520]">
            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} /> Add channel
          </Link>
        </div>

        {rows.length === 0 ? (
          <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4">
            <p className="text-xs text-white/60">No channels yet. Declare your first one to get VIP coverage on your legitimate listings.</p>
          </section>
        ) : (
          <div className="grid gap-3">
            {rows.map((r) => (
              <Link key={r.channel_id} href={`/practitioner/operations/channels/${r.channel_id}`} className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 hover:bg-[#1A2744] p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{r.channel_display_name}</p>
                  <span className={`text-[10px] font-semibold rounded-md px-2 py-0.5 border ${STATE_TONE[r.state]}`}>
                    {r.state.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-[11px] text-white/55 font-mono break-all">{r.channel_url}</p>
                <p className="text-[10px] text-white/45">
                  {r.channel_type.replace(/_/g, ' ')}
                  {r.verified_at ? ` · verified ${new Date(r.verified_at).toLocaleDateString()}` : ''}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
