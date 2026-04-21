'use client';

// Prompt #102 Phase 2: admin manual-document review queue.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Network } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { InlineReasonForm } from '@/components/admin/shared/InlineReasonForm';

interface PendingChannel {
  channel_id: string;
  practitioner_id: string;
  channel_type: string;
  channel_url: string;
  channel_display_name: string;
  verification_method: string | null;
  created_at: string;
}

export default function AdminChannelVerificationQueuePage() {
  const [rows, setRows] = useState<PendingChannel[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as unknown as any;
    const { data } = await supabase
      .from('practitioner_verified_channels')
      .select('channel_id, practitioner_id, channel_type, channel_url, channel_display_name, verification_method, created_at')
      .eq('state', 'pending_verification')
      .eq('verification_method', 'manual_document_upload')
      .order('created_at', { ascending: true });
    setRows((data ?? []) as PendingChannel[]);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const approve = async (id: string) => {
    setBusy(id);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as unknown as any;
      const { data: user } = await supabase.auth.getUser();
      const userId = user?.user?.id;
      if (!userId) return;
      const reVerify = new Date(); reVerify.setDate(reVerify.getDate() + 90);
      await supabase.from('practitioner_verified_channels').update({
        state: 'verified',
        verified_at: new Date().toISOString(),
        re_verify_due_at: reVerify.toISOString(),
      }).eq('channel_id', id);
      await supabase.from('practitioner_operations_audit_log').insert({
        action_category: 'channel', action_verb: 'channel.verified',
        target_table: 'practitioner_verified_channels', target_id: id,
        actor_user_id: userId, actor_role: 'admin',
        context_json: { method: 'manual_document_upload' },
      });
      await refresh();
    } finally { setBusy(null); }
  };

  const reject = async (id: string, reason: string) => {
    setBusy(id);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as unknown as any;
      await supabase.from('practitioner_verified_channels').update({
        state: 'verification_failed', notes: reason,
      }).eq('channel_id', id);
      setRejectingId(null);
      await refresh();
    } finally { setBusy(null); }
  };

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Admin
        </Link>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Network className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
          Channel verification queue
        </h1>

        {rows.length === 0 ? (
          <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4">
            <p className="text-xs text-white/60">Queue is clear.</p>
          </section>
        ) : (
          <ul className="space-y-3">
            {rows.map((c) => (
              <li key={c.channel_id} className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{c.channel_display_name}</p>
                    <p className="text-[10px] text-white/50 font-mono">Practitioner {c.practitioner_id.slice(0, 8)}</p>
                  </div>
                  <span className="text-[10px] text-white/55">{c.channel_type.replace(/_/g, ' ')}</span>
                </div>
                <p className="text-[11px] text-white/60 break-all">{c.channel_url}</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => approve(c.channel_id)} disabled={busy === c.channel_id} className="rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 px-3 py-1 text-[11px] text-emerald-200 font-semibold disabled:opacity-50" aria-label="Approve channel">
                    Approve
                  </button>
                  <button onClick={() => setRejectingId(rejectingId === c.channel_id ? null : c.channel_id)} disabled={busy === c.channel_id} className="rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 px-3 py-1 text-[11px] text-red-200 disabled:opacity-50" aria-label="Reject channel">
                    Reject
                  </button>
                </div>
                {rejectingId === c.channel_id && (
                  <InlineReasonForm
                    placeholder="Rejection reason (visible to practitioner)"
                    submitLabel="Reject"
                    submitTone="red"
                    disabled={busy === c.channel_id}
                    onSubmit={(reason) => reject(c.channel_id, reason)}
                    onCancel={() => setRejectingId(null)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
