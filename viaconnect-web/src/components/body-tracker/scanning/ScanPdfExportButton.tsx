'use client';

import { useState } from 'react';
import { Download, Loader2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface ScanPdfExportButtonProps {
  sessionId: string;
  avatarPngBase64?: string | null;
}

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL ??
  '';

type ExportState = 'idle' | 'loading' | 'error';

export function ScanPdfExportButton({ sessionId, avatarPngBase64 }: ScanPdfExportButtonProps) {
  const [state, setState]   = useState<ExportState>('idle');
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
      const body: { session_id: string; avatar_png_base64?: string } = { session_id: sessionId };
      if (avatarPngBase64) body.avatar_png_base64 = avatarPngBase64;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const json = await res.json().catch(() => ({})) as { pdf_url?: string; error?: string };

      if (!res.ok || !json.pdf_url) {
        throw new Error(json.error ?? `Export failed (${res.status})`);
      }

      // Trigger browser download
      const a = document.createElement('a');
      a.href = json.pdf_url;
      a.download = `body-scan-${sessionId.slice(0, 8)}.pdf`;
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
        className="flex items-center gap-2 rounded-xl border border-[#2DA5A0]/35 bg-[#2DA5A0]/10 px-4 py-2.5 text-sm font-semibold text-[#2DA5A0] hover:bg-[#2DA5A0]/20 disabled:opacity-50 min-h-[44px] transition-colors"
      >
        {state === 'loading' ? (
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
        ) : (
          <Download className="h-4 w-4" strokeWidth={1.5} />
        )}
        {state === 'loading' ? 'Generating PDF report' : 'Download PDF report'}
      </button>

      {state === 'error' && errorMsg && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/8 px-3 py-2">
          <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" strokeWidth={1.5} />
          <p className="text-xs text-red-300 leading-relaxed">{errorMsg}</p>
        </div>
      )}

      {state === 'loading' && (
        <p className="text-[11px] text-white/40">
          This may take 5 to 15 seconds while the report renders.
        </p>
      )}
    </div>
  );
}
