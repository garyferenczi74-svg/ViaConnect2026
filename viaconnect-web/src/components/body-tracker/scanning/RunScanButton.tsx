'use client';

import { useState } from 'react';
import { Loader2, ScanLine } from 'lucide-react';
import { runScanAnalysis, type ScanProgress } from '@/lib/arnold/scanning/runScanAnalysis';

interface RunScanButtonProps {
  sessionId: string;
  onComplete?: () => void;
  alreadyScanned?: boolean;
}

export function RunScanButton({ sessionId, onComplete, alreadyScanned }: RunScanButtonProps) {
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setError(null);
    try {
      await runScanAnalysis({
        sessionId,
        onProgress: (p) => setProgress(p),
      });
      onComplete?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Scan failed';
      setError(msg);
      setProgress({ phase: 'failed', percent: 0, message: msg });
    }
  }

  const busy = progress !== null && progress.phase !== 'complete' && progress.phase !== 'failed';
  const label = alreadyScanned ? 'Re run AI scan' : 'Run AI scan';

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-[#E8803A]/40 bg-[#E8803A]/15 px-4 py-2.5 text-sm font-semibold text-[#E8803A] hover:bg-[#E8803A]/25 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : <ScanLine className="h-4 w-4" strokeWidth={1.5} />}
        {busy ? progress?.message ?? 'Scanning' : label}
      </button>
      {busy && progress && (
        <div className="space-y-1">
          <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full bg-[#E8803A] transition-all" style={{ width: `${progress.percent}%` }} />
          </div>
          <p className="text-[11px] text-white/55">{progress.message}</p>
        </div>
      )}
      {error && <p className="text-xs text-[#FCA5A5]">{error}</p>}
    </div>
  );
}
