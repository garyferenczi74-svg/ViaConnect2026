'use client';

// =============================================================================
// Practitioner-branded body-scan PDF export button. Prompt #169 Task 3 (spec 12).
// =============================================================================
// Calls the body-scan-export Edge Function with as_practitioner=true. The
// function verifies an active practitioner_patients relationship to the scan
// owner before rendering, and stamps "Prepared by" + patient identifier on the
// report. The footer entity name is "Farmceutica Wellness Ltd".

import { useState } from 'react';
import { Download, Loader2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Props {
  sessionId: string;
  patientId: string;
  accentHex: string;
}

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL ??
  '';

type ExportState = 'idle' | 'loading' | 'error';

export function PractitionerScanPdfButton({ sessionId, patientId, accentHex }: Props) {
  const [state, setState] = useState<ExportState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleExport() {
    setState('loading');
    setErrorMsg(null);
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Not signed in');

      const url = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/body-scan-export`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ session_id: sessionId, as_practitioner: true }),
      });

      const json = (await res.json().catch(() => ({}))) as { pdf_url?: string; error?: string };
      if (!res.ok || !json.pdf_url) {
        throw new Error(json.error ?? `Export failed (${res.status})`);
      }

      const a = document.createElement('a');
      a.href = json.pdf_url;
      a.download = `patient-${patientId.slice(0, 8)}-scan-${sessionId.slice(0, 8)}.pdf`;
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setState('idle');
    } catch (e) {
      setState('error');
      setErrorMsg(e instanceof Error ? e.message : 'Export failed');
    }
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={handleExport}
        disabled={state === 'loading'}
        className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50 min-h-[44px] transition-colors"
        style={{ backgroundColor: `${accentHex}1A`, border: `1px solid ${accentHex}59`, color: accentHex }}
      >
        {state === 'loading' ? (
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
        ) : (
          <Download className="h-4 w-4" strokeWidth={1.5} />
        )}
        {state === 'loading' ? 'Generating PDF report' : 'Download branded PDF report'}
      </button>

      {state === 'error' && errorMsg && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/8 px-3 py-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-red-400" strokeWidth={1.5} />
          <p className="text-xs leading-relaxed text-red-300">{errorMsg}</p>
        </div>
      )}
    </div>
  );
}
