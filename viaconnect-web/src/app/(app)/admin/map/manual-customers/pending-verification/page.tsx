'use client';

// Prompt #101 Phase 5: admin manual-customer verification queue.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckSquare } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Unverified {
  manual_customer_id: string;
  practitioner_id: string;
  display_name: string;
  id_verification_doc_path: string;
  created_at: string;
}

export default function AdminManualCustomerVerificationPage() {
  const [rows, setRows] = useState<Unverified[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as unknown as any;
    const { data } = await supabase
      .from('manual_customers')
      .select('manual_customer_id, practitioner_id, display_name, id_verification_doc_path, created_at')
      .is('verified_by_admin_at', null)
      .order('created_at', { ascending: true });
    setRows((data ?? []) as Unverified[]);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const verify = async (id: string) => {
    setBusy(id);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as unknown as any;
      const { data: user } = await supabase.auth.getUser();
      const userId = user?.user?.id;
      if (!userId) return;
      await supabase.from('manual_customers').update({
        verified_by_admin_at: new Date().toISOString(),
        verified_by_admin_user: userId,
      }).eq('manual_customer_id', id);
      await refresh();
    } finally { setBusy(null); }
  };

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4">
        <Link href="/admin/map" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> MAP Enforcement
        </Link>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
          Manual customer verification
        </h1>
        <p className="text-xs text-white/55">
          Clinic-only patients need ID verification before they are eligible for VIP exemptions. Review the uploaded document, then mark verified.
        </p>

        {rows.length === 0 ? (
          <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4">
            <p className="text-xs text-white/60">Queue is clear.</p>
          </section>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.manual_customer_id} className="rounded-xl border border-white/[0.08] bg-[#1A2744]/60 p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-white font-semibold">{r.display_name}</p>
                  <p className="text-[10px] text-white/50 font-mono">Practitioner {r.practitioner_id.slice(0, 8)}</p>
                  <a href={r.id_verification_doc_path} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#2DA5A0] hover:underline">
                    View ID document
                  </a>
                </div>
                <button onClick={() => verify(r.manual_customer_id)} disabled={busy === r.manual_customer_id} className="rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 px-3 py-1 text-[11px] text-emerald-200 font-semibold disabled:opacity-50">
                  Mark verified
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
