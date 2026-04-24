import Link from 'next/link';
import { ChevronLeft, Users, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import GrantList, { type GrantRow } from '@/components/compliance/soc2/GrantList';

export const dynamic = 'force-dynamic';

export default async function AuditorGrantsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from('soc2_auditor_grants')
    .select('id, auditor_email, auditor_firm, packet_ids, granted_at, expires_at, revoked, revoked_at, access_count')
    .order('granted_at', { ascending: false })
    .limit(200);
  const rows: GrantRow[] = (data as GrantRow[] | null) ?? [];

  const now = Date.now();
  const active = rows.filter((r) => !r.revoked && new Date(r.expires_at).getTime() > now).length;
  const expired = rows.filter((r) => !r.revoked && new Date(r.expires_at).getTime() <= now).length;
  const revoked = rows.filter((r) => r.revoked).length;

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <Link href="/admin/compliance/soc2" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
          SOC 2 overview
        </Link>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg md:text-xl font-bold text-white">Auditor grants</h1>
            <p className="text-xs text-white/40">Time limited packet access for external auditors. Max 90 days.</p>
          </div>
          <Link
            href="/admin/compliance/soc2/auditor-grants/new"
            className="inline-flex items-center gap-2 rounded-md bg-[#B75E18] hover:bg-[#C96D1E] text-white text-sm font-medium px-3 py-2 transition"
          >
            <UserPlus className="w-4 h-4" strokeWidth={1.5} aria-hidden />
            New grant
          </Link>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Total" value={rows.length} tone="slate" />
          <Stat label="Active" value={active} tone="emerald" />
          <Stat label="Expired" value={expired} tone="amber" />
          <Stat label="Revoked" value={revoked} tone="red" />
        </div>
        <GrantList rows={rows} />
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'slate' | 'emerald' | 'amber' | 'red' }) {
  const classes: Record<typeof tone, string> = {
    slate:   'border-white/[0.12] bg-white/[0.04] text-white/80',
    emerald: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
    amber:   'border-amber-400/30 bg-amber-500/10 text-amber-200',
    red:     'border-red-400/30 bg-red-500/10 text-red-200',
  };
  return (
    <div className={`rounded-lg border ${classes[tone]} p-3`}>
      <div className="text-xs opacity-80">{label}</div>
      <div className="text-2xl font-bold mt-1 tabular-nums">{value}</div>
    </div>
  );
}
