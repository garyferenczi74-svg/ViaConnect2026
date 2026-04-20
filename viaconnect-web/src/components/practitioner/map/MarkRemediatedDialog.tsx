// Prompt #100 Phase 4: submit-remediation-evidence dialog.
'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { ActiveViolationView } from '@/lib/map/queries-client';

export function MarkRemediatedDialog({
  violation,
  onClose,
  onSubmitted,
}: {
  violation: ActiveViolationView;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [url, setUrl] = useState(violation.sourceUrl);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as unknown as any;
      const { data: prac } = await supabase
        .from('practitioners')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .maybeSingle();
      if (!prac) throw new Error('Practitioner record not found.');

      const { error: insertError } = await supabase.from('map_remediation_evidence').insert({
        violation_id: violation.violationId,
        practitioner_id: prac.id,
        screenshot_storage_path: '',
        url_scanned: url,
        practitioner_notes: notes,
      });
      if (insertError) throw insertError;

      await supabase
        .from('map_violations')
        .update({ status: 'acknowledged', acknowledged_at: new Date().toISOString() })
        .eq('violation_id', violation.violationId);

      onSubmitted();
      onClose();
    } catch (err) {
      setError((err as Error).message ?? 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#1A2744] p-5 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Mark remediated</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-white/60 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </header>

        <p className="text-[11px] text-white/60">
          Submit proof that the listing has been brought up to MAP. The verifier
          re-scans the URL within an hour; if confirmed, the violation resolves.
        </p>

        <label className="block">
          <span className="text-[11px] text-white/55">Source URL</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="mt-1 w-full rounded-lg bg-white/[0.04] border border-white/[0.1] px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#2DA5A0]"
          />
        </label>

        <label className="block">
          <span className="text-[11px] text-white/55">Notes for the reviewer (optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg bg-white/[0.04] border border-white/[0.1] px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#2DA5A0]"
          />
        </label>

        {error && <p className="text-[11px] text-red-300">{error}</p>}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/[0.1] px-3 py-1.5 text-[11px] text-white/70 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || url.length < 5}
            className="rounded-lg bg-[#2DA5A0] hover:bg-[#2DA5A0]/80 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 text-[11px] font-semibold text-[#0B1520]"
          >
            {submitting ? 'Submitting...' : 'Submit evidence'}
          </button>
        </div>
      </div>
    </div>
  );
}
