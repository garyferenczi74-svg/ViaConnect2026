'use client';

// Prompt 211a Workstream 3: the "Download report" / share control for the
// doctor-ready scan report. Mounts on the composition surface.
//
// Two-tap export per the Gate:
//   Tap 1 (Generate): POST /api/formavision/scan-report -> a signed URL. On
//     success emits report_generated and reveals the export control.
//   Tap 2 (Share / Download): opens the signed URL. On Capacitor native the
//     platform WebView handles the PDF; @capacitor/share is NOT installed (and
//     package.json is locked) so we do NOT add a share dependency: native falls
//     back to the same open-in-new-context download as desktop. Emits
//     report_shared with the coarse channel.
//
// Design: brand design tokens + Instrument Sans (inherited), Lucide icons at
// strokeWidth 1.5, responsive (w-full, min-h-[44px] touch target). Fail-open:
// an error surfaces an inline retry, never throws into render.
//
// Standing rules: no em dashes, no en dashes, no emojis, zero any.

import { useCallback, useState } from 'react';
import { FileText, Share2, Download, RotateCcw, Loader2 } from 'lucide-react';
import { emitReportEvent, type ReportShareChannel } from '@/lib/formavision/telemetry/reportTelemetry';

export interface DownloadReportButtonProps {
  /** Authenticated user id; the control is disabled until it resolves. */
  userId: string | null;
  /** Coarse surface id for telemetry (defaults to the composition route). */
  surface?: string;
  className?: string;
}

// Capacitor's runtime global, typed narrowly so this component does not
// hard-depend on @capacitor/core (mirrors src/lib/capacitor/camera-capture.ts).
interface CapacitorGlobal {
  getPlatform(): 'ios' | 'android' | 'web';
}
interface WindowWithCapacitor {
  Capacitor?: CapacitorGlobal;
}

function isNativePlatform(): boolean {
  if (typeof globalThis === 'undefined') return false;
  const cap = (globalThis as unknown as WindowWithCapacitor).Capacitor;
  if (!cap || typeof cap.getPlatform !== 'function') return false;
  const p = cap.getPlatform();
  return p === 'ios' || p === 'android';
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'generating' }
  | { kind: 'ready'; signedUrl: string }
  | { kind: 'error'; message: string };

const DEFAULT_SURFACE = '/body-tracker/composition';

export function DownloadReportButton({ userId, surface, className }: DownloadReportButtonProps) {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const surfaceId = surface ?? DEFAULT_SURFACE;

  const generate = useCallback(async () => {
    setPhase({ kind: 'generating' });
    try {
      const res = await fetch('/api/formavision/scan-report', { method: 'POST' });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        const message =
          res.status === 404
            ? 'Scan your body first to generate a report.'
            : body.error ?? 'We could not generate your report.';
        setPhase({ kind: 'error', message });
        void emitReportEvent(userId, 'formavision.report_generated', { surface: surfaceId, ok: false });
        return;
      }
      const data = (await res.json()) as { signedUrl?: string };
      if (!data.signedUrl) {
        setPhase({ kind: 'error', message: 'We could not generate your report.' });
        void emitReportEvent(userId, 'formavision.report_generated', { surface: surfaceId, ok: false });
        return;
      }
      setPhase({ kind: 'ready', signedUrl: data.signedUrl });
      void emitReportEvent(userId, 'formavision.report_generated', { surface: surfaceId, ok: true });
    } catch {
      setPhase({ kind: 'error', message: 'We could not generate your report.' });
      void emitReportEvent(userId, 'formavision.report_generated', { surface: surfaceId, ok: false });
    }
  }, [userId, surfaceId]);

  const share = useCallback(
    (signedUrl: string) => {
      const native = isNativePlatform();
      const channel: ReportShareChannel = native ? 'native_share' : 'download';
      let ok = true;
      try {
        if (typeof window !== 'undefined') {
          // No @capacitor/share dependency (package.json is locked): both native
          // and desktop open the signed PDF URL. The WebView / browser handles
          // the download + system share sheet from there.
          if (native) {
            window.open(signedUrl, '_blank');
          } else {
            const a = document.createElement('a');
            a.href = signedUrl;
            a.rel = 'noopener noreferrer';
            a.target = '_blank';
            a.download = 'via-cura-scan-report.pdf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }
        }
      } catch {
        ok = false;
      }
      void emitReportEvent(userId, 'formavision.report_shared', { surface: surfaceId, channel, ok });
    },
    [userId, surfaceId],
  );

  const disabled = !userId || phase.kind === 'generating';

  if (phase.kind === 'ready') {
    const nativeLabel = isNativePlatform();
    return (
      <button
        type="button"
        data-testid="scan-report-share"
        onClick={() => share(phase.signedUrl)}
        className={`inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#2DA5A0]/50 bg-[#2DA5A0]/15 px-3 py-2 text-xs font-medium text-white min-h-[44px] transition-colors hover:bg-[#2DA5A0]/25 sm:w-auto ${className ?? ''}`}
      >
        {nativeLabel ? (
          <Share2 className="h-3.5 w-3.5" strokeWidth={1.5} />
        ) : (
          <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
        )}
        {nativeLabel ? 'Share report' : 'Download report'}
      </button>
    );
  }

  if (phase.kind === 'error') {
    return (
      <div
        data-testid="scan-report-error"
        role="alert"
        className={`flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-[#B75E18]/40 bg-[#B75E18]/10 p-2.5 text-xs text-white/80 sm:w-auto ${className ?? ''}`}
      >
        <span>{phase.message}</span>
        <button
          type="button"
          onClick={() => void generate()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#B75E18]/50 bg-[#B75E18]/15 px-2.5 py-1 font-medium text-white min-h-[44px] transition-colors hover:bg-[#B75E18]/25"
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      data-testid="scan-report-generate"
      disabled={disabled}
      onClick={() => void generate()}
      className={`inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#5B8DEF]/30 bg-[#2A4C9E]/15 px-3 py-2 text-xs font-medium text-white min-h-[44px] backdrop-blur-sm transition-all hover:bg-[#2A4C9E]/25 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${className ?? ''}`}
    >
      {phase.kind === 'generating' ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
      ) : (
        <FileText className="h-3.5 w-3.5" strokeWidth={1.5} />
      )}
      {phase.kind === 'generating' ? 'Preparing report' : 'Doctor report'}
    </button>
  );
}
