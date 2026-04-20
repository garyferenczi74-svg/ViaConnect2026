'use client';

// Prompt #102 Phase 2: practitioner tax-info status view.
// The form upload itself goes through private storage + Vault; this
// page shows current status + deep-links to form-specific upload UX
// built in a future phase.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface TaxDoc { form_type: string; status: string; submitted_at: string | null; reviewed_at: string | null; review_notes: string | null; }

const STATUS_TONE: Record<string, string> = {
  not_submitted: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  submitted: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  under_review: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  on_file: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  rejected_re_upload_required: 'bg-red-500/15 text-red-300 border-red-500/30',
};

export default function PractitionerTaxInfoPage() {
  const [docs, setDocs] = useState<TaxDoc[]>([]);

  const refresh = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as unknown as any;
    const { data } = await supabase
      .from('practitioner_tax_documents')
      .select('form_type, status, submitted_at, reviewed_at, review_notes')
      .order('form_type');
    setDocs((data ?? []) as TaxDoc[]);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
        <Link href="/practitioner/operations/payouts" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Payouts
        </Link>
        <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
          Tax information
        </h1>
        <p className="text-xs text-white/55">
          You must have a valid tax form on file before any payout can be approved. Submit W-9 (US), W-8BEN (non-US individual), W-8BEN-E (non-US entity), or T4A registration (Canada).
        </p>

        {docs.length === 0 ? (
          <section className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
            <p className="text-xs text-amber-200">No tax form on file. Reach out to admin to initiate a secure upload.</p>
          </section>
        ) : (
          <ul className="space-y-2">
            {docs.map((d) => (
              <li key={d.form_type} className="rounded-xl border border-white/[0.08] bg-[#1A2744]/60 p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-white font-semibold">{d.form_type.toUpperCase()}</p>
                  {d.submitted_at && <p className="text-[10px] text-white/55">Submitted {new Date(d.submitted_at).toLocaleDateString()}</p>}
                  {d.review_notes && <p className="text-[10px] text-white/55">{d.review_notes}</p>}
                </div>
                <span className={`text-[10px] font-semibold rounded-md px-2 py-0.5 border ${STATUS_TONE[d.status] ?? ''}`}>
                  {d.status.replace(/_/g, ' ')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
