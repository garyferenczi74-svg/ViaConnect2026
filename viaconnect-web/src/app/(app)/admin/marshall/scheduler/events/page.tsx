// Prompt #125 P5: Admin webhook event ingress log.

import Link from 'next/link';
import { ChevronLeft, Inbox } from 'lucide-react';
import { redirect } from 'next/navigation';
import { createClient as createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface Row {
  id: string;
  platform: string;
  external_event_id: string;
  event_type: string;
  external_post_id: string | null;
  received_at: string;
  processed_at: string | null;
  processing_status: string;
  error_message: string | null;
}

export default async function AdminEventsPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/signin');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const role = (profile as { role?: string } | null)?.role ?? '';
  if (!['admin', 'superadmin', 'compliance_admin'].includes(role)) redirect('/');

  const { data } = await sb
    .from('scheduler_events')
    .select('id, platform, external_event_id, event_type, external_post_id, received_at, processed_at, processing_status, error_message')
    .order('received_at', { ascending: false })
    .limit(200);
  const rows: Row[] = (data as Row[] | null) ?? [];

  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6 space-y-4">
      <header className="flex items-center gap-2 flex-wrap">
        <Link href="/admin/marshall/scheduler" className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
          Scheduler overview
        </Link>
        <span className="text-white/20">/</span>
        <Inbox className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-sm md:text-base font-semibold text-white">Events</h1>
        <span className="text-xs text-white/40 ml-2">{rows.length} recent</span>
      </header>

      <div className="overflow-x-auto rounded-lg border border-white/10 bg-white/[0.02]">
        <table className="min-w-full text-xs text-white/80">
          <thead className="border-b border-white/10 bg-white/[0.03]">
            <tr className="text-left">
              <th className="px-3 py-2">Received</th>
              <th className="px-3 py-2">Platform</th>
              <th className="px-3 py-2">Event</th>
              <th className="px-3 py-2">External id</th>
              <th className="px-3 py-2">Post</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Error</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-white/5 last:border-0">
                <td className="px-3 py-2 text-white/60">{new Date(r.received_at).toLocaleString()}</td>
                <td className="px-3 py-2">{r.platform}</td>
                <td className="px-3 py-2 font-mono text-[11px]">{r.event_type}</td>
                <td className="px-3 py-2 font-mono text-[10px] text-white/50 max-w-[14rem] truncate">{r.external_event_id}</td>
                <td className="px-3 py-2 font-mono text-[10px] text-white/50">{r.external_post_id ?? 'n/a'}</td>
                <td className={`px-3 py-2 ${
                  r.processing_status === 'processed' ? 'text-emerald-300'
                    : r.processing_status === 'errored' ? 'text-red-300'
                    : r.processing_status === 'deduplicated' ? 'text-white/50'
                    : 'text-amber-300'
                }`}>
                  {r.processing_status}
                </td>
                <td className="px-3 py-2 text-[11px] text-red-300/80 max-w-xs truncate">{r.error_message ?? ''}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-white/50">No webhook events yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
