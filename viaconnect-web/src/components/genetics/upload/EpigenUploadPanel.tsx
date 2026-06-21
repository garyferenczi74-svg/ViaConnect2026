'use client';

// Prompt 204 (2026-06-21): the EpigenHQ epigenetic-report verify-before-save flow,
// extracted from the former standalone /genetics/epigenetic/upload page so it can
// mount as the EpigenHQ tab on the Upload Genetic Data page. A member uploads a PDF
// or a photo, our vision extraction reads the measured markers, and the member
// verifies every reading (and the measurement date) before anything is written via
// /api/genetics/epigenetic/confirm. EpigenHQ readouts are framed as directions, not
// verdicts, so a chip is only ever neutral teal, never an alarm color.
//
// This is the tab BODY only: the page owns the heading and the back control, so
// this panel renders its own screens (default, verify, saved) without page chrome.
//
// Standing rules honored: no em or en dashes, Lucide strokeWidth 1.5, TypeScript
// strict (no any).

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { FileText, Hourglass, Loader2, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { VCButton } from '@/components/ui/VCButton';

type Direction = 'higher' | 'lower' | 'typical';

type PreviewRow = {
  markerKey: string;
  displayName: string;
  valueNum: number | null;
  valueText: string | null;
  unit: string | null;
  direction: Direction | null;
};

type EpigenPreview = {
  sourceFilename: string;
  source: 'pdf_scanned' | 'photo';
  readable: boolean;
  matchedCount: number;
  preview: PreviewRow[];
};

const DISCLAIMER =
  'Educational reference, not a diagnosis or medical advice. Epigenetic readouts describe patterns, not conditions.';

function directionLabel(direction: Direction | null): string | null {
  if (direction === 'higher') return 'Higher than expected';
  if (direction === 'lower') return 'Lower than expected';
  if (direction === 'typical') return 'Within the expected range';
  return null;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function EpigenUploadPanel() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<EpigenPreview | null>(null);
  const [measuredOn, setMeasuredOn] = useState<string>(todayIso());
  const [isReading, setIsReading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const uploadFile = useCallback(async (file: File) => {
    const name = file.name.toLowerCase();
    const isPdf = name.endsWith('.pdf') || file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');
    if (!isPdf && !isImage) {
      toast.error('Please choose a PDF or a photo of your report');
      return;
    }
    setIsReading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/genetics/epigenetic/upload-pdf', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Could not read this file');
        return;
      }
      setSavedCount(null);
      setMeasuredOn(todayIso());
      setPreview(data as EpigenPreview);
      if ((data as EpigenPreview).matchedCount === 0) {
        toast('We could not recognize any EpigenHQ markers in this file', { icon: 'i' });
      }
    } catch {
      toast.error('Could not read this file. Please try again.');
    } finally {
      setIsReading(false);
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) void uploadFile(selected);
      e.target.value = '';
    },
    [uploadFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const dropped = e.dataTransfer.files?.[0];
      if (dropped) void uploadFile(dropped);
    },
    [uploadFile],
  );

  const handleConfirm = useCallback(async () => {
    if (!preview || preview.matchedCount === 0) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/genetics/epigenetic/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: preview.preview.map((r) => ({
            markerKey: r.markerKey,
            valueNum: r.valueNum,
            valueText: r.valueText,
            direction: r.direction,
          })),
          sourceFilename: preview.sourceFilename,
          sourceType: preview.source,
          measuredOn,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Could not save your results');
        return;
      }
      setSavedCount(typeof data.saved === 'number' ? data.saved : preview.preview.length);
      toast.success('Your EpigenHQ results were saved');
    } catch {
      toast.error('Could not save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [preview, measuredOn]);

  const resetFlow = useCallback(() => {
    setPreview(null);
    setSavedCount(null);
  }, []);

  // SAVED SCREEN
  if (savedCount !== null) {
    return (
      <div className="glass-v2 p-4 md:p-6 rounded-2xl flex flex-col gap-4" style={{ borderLeft: '4px solid #2DA5A0' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl" style={{ backgroundColor: 'rgba(45, 165, 160, 0.15)' }}>
            <CheckCircle2 size={22} strokeWidth={1.5} style={{ color: '#2DA5A0' }} />
          </div>
          <div>
            <h2 className="text-heading-3 text-white">Results saved</h2>
            <p className="text-sm text-white/60">
              {savedCount} {savedCount === 1 ? 'reading' : 'readings'} saved to your EpigenHQ panel.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <VCButton variant="primary" size="sm" onClick={resetFlow}>
            Upload another report
          </VCButton>
          <Link
            href="/shop/genex360#epigen-hq"
            className="inline-flex min-h-[44px] items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/75 transition-colors hover:bg-white/10"
          >
            View my EpigenHQ panel
          </Link>
        </div>
        <p className="text-xs leading-relaxed text-white/40">{DISCLAIMER}</p>
      </div>
    );
  }

  // VERIFY SCREEN
  if (preview) {
    return (
      <div className="glass-v2 p-4 md:p-6 rounded-2xl flex flex-col gap-4" style={{ borderLeft: '4px solid #2DA5A0' }}>
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl flex-none" style={{ backgroundColor: 'rgba(45, 165, 160, 0.15)' }}>
            <ShieldCheck size={22} strokeWidth={1.5} style={{ color: '#2DA5A0' }} />
          </div>
          <div>
            <h2 className="text-heading-3 text-white">Verify your results</h2>
            <p className="text-sm text-white/60 leading-relaxed mt-1">
              We read these from {preview.sourceFilename} with vision extraction. Check each reading,
              set the measurement date, then save. Nothing is written to your record until you confirm.
            </p>
          </div>
        </div>

        {preview.matchedCount === 0 ? (
          <div
            className="flex items-start gap-2 rounded-xl p-4 text-sm leading-relaxed"
            style={{ backgroundColor: 'rgba(183, 94, 24, 0.08)', border: '1px solid rgba(183, 94, 24, 0.3)', color: '#D98A3D' }}
          >
            <AlertTriangle size={16} strokeWidth={1.5} className="mt-0.5 flex-none" />
            <span>
              We could not recognize any EpigenHQ markers in this file. It may be a summary or a
              different kind of report. Try a clearer photo or a different file.
            </span>
          </div>
        ) : (
          <>
            {/* Measurement date applies to every reading in this upload. */}
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] uppercase tracking-wide text-white/40">Measurement date</span>
              <input
                type="date"
                value={measuredOn}
                max={todayIso()}
                onChange={(e) => setMeasuredOn(e.target.value || todayIso())}
                className="w-full sm:w-56 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#2DA5A0] focus:outline-none"
              />
            </label>

            <div className="flex flex-col gap-2">
              {preview.preview.map((r, i) => {
                const label = directionLabel(r.direction);
                const valueDisplay = r.valueNum !== null
                  ? `${r.valueNum}${r.unit ? ` ${r.unit}` : ''}`
                  : r.valueText ?? '';
                return (
                  <div
                    key={`${r.markerKey}-${i}`}
                    className="rounded-xl px-4 py-3"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-white">{r.displayName}</span>
                      {valueDisplay ? (
                        <span className="text-sm" style={{ color: 'var(--teal-400, #4DC9C4)' }}>{valueDisplay}</span>
                      ) : null}
                      {label ? (
                        <span
                          className="ml-auto inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                          style={{ backgroundColor: 'rgba(45, 165, 160, 0.15)', border: '1px solid rgba(45, 165, 160, 0.45)', color: '#4DC9C4' }}
                        >
                          {label}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <p className="text-xs leading-relaxed text-white/40">{DISCLAIMER}</p>

        <div className="flex flex-wrap gap-3">
          <VCButton variant="primary" size="sm" onClick={handleConfirm} disabled={isSaving || preview.matchedCount === 0}>
            {isSaving ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
                Saving...
              </span>
            ) : (
              'Confirm and save my results'
            )}
          </VCButton>
          <VCButton variant="secondary" size="sm" onClick={resetFlow}>
            Cancel
          </VCButton>
        </div>
      </div>
    );
  }

  // DEFAULT SCREEN
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <p className="text-sm text-white/60 leading-relaxed">
        Add your epigenetic readouts so your EpigenHQ panel shows your own measurements alongside
        each marker. You verify every reading before anything is saved.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf,image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className="glass-v2 p-4 md:p-6 rounded-2xl flex flex-col gap-3 md:gap-4 transition-colors"
        style={{ borderLeft: '4px solid #2DA5A0', backgroundColor: dragOver ? 'rgba(45, 165, 160, 0.06)' : undefined }}
      >
        <div className="flex items-center justify-center w-11 h-11 rounded-xl" style={{ backgroundColor: 'rgba(45, 165, 160, 0.15)' }}>
          <FileText size={22} strokeWidth={1.5} style={{ color: '#2DA5A0' }} />
        </div>
        <h3 className="text-heading-3 text-white">UPLOAD REPORT (PDF OR PHOTO)</h3>
        <p className="text-sm text-white/60 leading-relaxed">
          Upload your epigenetic report PDF or a clear photo of it. Our vision extraction reads the
          measured markers and you verify every reading before anything is saved. Drag a file here
          or click to browse.
        </p>
        <VCButton variant="primary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isReading}>
          {isReading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
              Reading your report...
            </span>
          ) : (
            'Upload PDF or photo'
          )}
        </VCButton>
      </div>

      <div className="glass-v2-insight p-4 md:p-5 rounded-2xl flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Hourglass size={16} strokeWidth={1.5} style={{ color: 'var(--teal-500)' }} />
          <p className="text-overline">WHAT EPIGENHQ SHOWS</p>
        </div>
        <p className="text-sm text-white/70 leading-relaxed">
          EpigenHQ markers are measured readouts, like epigenetic age and pace of aging. Once your
          results are on file, each marker on your panel shows your reading and how it compares to
          the expected range, with the same educational interpretation.
        </p>
      </div>
    </div>
  );
}

export default EpigenUploadPanel;
