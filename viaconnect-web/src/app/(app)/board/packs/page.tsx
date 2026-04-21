'use client';

// Prompt #105 Phase 2b.4 — board member portal: my distributions.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Distribution {
  distribution_id: string;
  pack_id: string;
  distributed_at: string;
  access_revoked_at: string | null;
  board_packs?: {
    pack_title: string;
    short_code: string;
    period_type: string;
    period_start: string;
    period_end: string;
    state: string;
  };
}

export default function BoardPacksList() {
  const [rows, setRows] = useState<Distribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberInfo, setMemberInfo] = useState<{
    displayName: string; ndaStatus: string; ndaExpiresAt: string | null;
  } | null>(null);

  const load = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = createClient() as unknown as any;

    const { data: user } = await sb.auth.getUser();
    const userId = user?.user?.id as string | undefined;
    if (!userId) { setLoading(false); return; }

    const { data: member } = await sb
      .from('board_members')
      .select('member_id, display_name, nda_status, nda_expires_at')
      .eq('auth_user_id', userId)
      .maybeSingle();
    if (!member) { setLoading(false); return; }
    setMemberInfo({
      displayName: (member as { display_name: string }).display_name,
      ndaStatus: (member as { nda_status: string }).nda_status,
      ndaExpiresAt: (member as { nda_expires_at: string | null }).nda_expires_at,
    });

    const { data } = await sb
      .from('board_pack_distributions')
      .select(`
        distribution_id, pack_id, distributed_at, access_revoked_at,
        board_packs!inner(pack_title, short_code, period_type, period_start, period_end, state)
      `)
      .eq('member_id', (member as { member_id: string }).member_id)
      .order('distributed_at', { ascending: false });
    setRows((data as Distribution[] | null) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
          Board packs
        </h1>

        {memberInfo && (
          <div className="rounded-xl border border-white/[0.08] bg-[#1A2744]/60 p-4 flex items-start gap-3">
            <Shield className="h-4 w-4 text-emerald-300 mt-0.5" strokeWidth={1.5} />
            <div className="text-xs text-white/80">
              <p className="font-medium">{memberInfo.displayName}</p>
              <p className="text-white/60 mt-0.5">
                NDA status: <span className={memberInfo.ndaStatus === 'on_file' ? 'text-emerald-300' : 'text-amber-300'}>{memberInfo.ndaStatus}</span>
                {memberInfo.ndaExpiresAt && ` · expires ${memberInfo.ndaExpiresAt}`}
              </p>
              <p className="text-white/50 mt-1 italic">
                Every pack download is watermarked and logged. Do not forward or reproduce.
              </p>
            </div>
          </div>
        )}

        {loading && <p className="text-xs text-white/55">Loading...</p>}

        {!loading && !memberInfo && (
          <div className="rounded-xl border border-white/[0.08] bg-[#1A2744]/60 p-5">
            <p className="text-sm text-white/75">No board membership on file for this account.</p>
            <p className="text-xs text-white/55 mt-1">
              If you believe this is in error, contact the exec-reporting admin.
            </p>
          </div>
        )}

        {!loading && memberInfo && rows.length === 0 && (
          <div className="rounded-xl border border-white/[0.08] bg-[#1A2744]/60 p-5">
            <p className="text-sm text-white/75">No distributions yet.</p>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div className="rounded-xl border border-white/[0.08] bg-[#1A2744]/60 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-black/20 text-white/60">
                <tr>
                  <th className="text-left font-normal p-3">Pack</th>
                  <th className="text-left font-normal p-3">Period</th>
                  <th className="text-left font-normal p-3">Distributed</th>
                  <th className="text-left font-normal p-3">Access</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.distribution_id} className="border-t border-white/[0.05]">
                    <td className="p-3">
                      <p className="text-white/90">{r.board_packs?.pack_title}</p>
                      <p className="text-[10px] text-white/50">{r.board_packs?.short_code}</p>
                    </td>
                    <td className="p-3 text-white/75">
                      {r.board_packs?.period_type} {r.board_packs?.period_start} → {r.board_packs?.period_end}
                    </td>
                    <td className="p-3 text-white/65">{r.distributed_at.slice(0, 10)}</td>
                    <td className="p-3">
                      {r.access_revoked_at
                        ? <span className="text-red-300">revoked</span>
                        : <span className="text-emerald-300">active</span>}
                    </td>
                    <td className="p-3 text-right">
                      {!r.access_revoked_at && (
                        <Link href={`/board/packs/${r.distribution_id}`} className="text-[#E8803A] hover:underline">
                          Open
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
