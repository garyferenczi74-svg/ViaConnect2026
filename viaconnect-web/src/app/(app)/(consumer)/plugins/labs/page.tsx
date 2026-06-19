'use client';

// Prompt 204c: lab report verify-before-save flow. Card 1 ("UPLOAD LAB REPORT
// (PDF)") now opens a real PDF picker, POSTs to /api/labs/upload-pdf, and shows
// an extracted-biomarker verify screen (with the verbatim source snippet for
// each reading) before anything is written via /api/labs/confirm. Mirrors the
// genetics upload verify-before-save pattern in this page's glass-v2 style.
// The other three cards (Quest, Labcorp, Manual Entry) keep their coming-soon
// toast unchanged.

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, FileText, Building2, Edit3, Dna, Lightbulb, Coins,
  Loader2, ShieldCheck, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { VCButton } from '@/components/ui/VCButton';
import { parseLabCsv } from '@/lib/labs/parseLabCsv';

type Biomarker = {
  name: string;
  value: number;
  unit: string;
  referenceLow: number | null;
  referenceHigh: number | null;
  flag: 'low' | 'normal' | 'high' | null;
  context: string;
};

type LabPreview = {
  sourceFilename: string;
  method: string;
  scanned: boolean;
  matchedCount: number;
  biomarkers: Biomarker[];
};

// Token-driven flag chip. high = orange, low = amber/blue, normal = teal, null
// renders nothing. Uses the page's CSS-var palette and glass tinting.
function flagChipStyle(flag: Biomarker['flag']): React.CSSProperties | null {
  if (flag === 'high') {
    return {
      backgroundColor: 'rgba(183, 94, 24, 0.15)',
      border: '1px solid rgba(183, 94, 24, 0.45)',
      color: '#D98A3D',
    };
  }
  if (flag === 'low') {
    return {
      backgroundColor: 'rgba(77, 142, 201, 0.15)',
      border: '1px solid rgba(77, 142, 201, 0.45)',
      color: '#7FB2E0',
    };
  }
  if (flag === 'normal') {
    return {
      backgroundColor: 'rgba(45, 165, 160, 0.15)',
      border: '1px solid rgba(45, 165, 160, 0.45)',
      color: '#4DC9C4',
    };
  }
  return null;
}

const DISCLAIMER =
  'For informational and wellness purposes only. Not a diagnosis or medical advice.';

export default function LabsPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<LabPreview | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleAction = () => {
    toast.success('Connection flow coming soon');
  };

  const uploadPdf = useCallback(async (file: File) => {
    const name = file.name.toLowerCase();
    const isCsv = name.endsWith('.csv') || file.type === 'text/csv';
    const isPdf = name.endsWith('.pdf') || file.type === 'application/pdf';
    if (!isCsv && !isPdf) {
      toast.error('Please choose a PDF or CSV file');
      return;
    }
    setIsReading(true);
    try {
      // A CSV is structured and parses on the client, then goes through the same
      // verify-before-save screen as a PDF. No upload or AI is involved.
      if (isCsv) {
        const biomarkers = parseLabCsv(await file.text());
        setSavedCount(null);
        setPreview({ sourceFilename: file.name, method: 'csv', scanned: false, matchedCount: biomarkers.length, biomarkers });
        if (biomarkers.length === 0) {
          toast('We could not find biomarker rows in this CSV', { icon: 'i' });
        }
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/labs/upload-pdf', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Could not read this PDF');
        return;
      }
      setSavedCount(null);
      setPreview(data as LabPreview);
      if ((data as LabPreview).matchedCount === 0) {
        toast('We could not find any biomarker values in this PDF', { icon: 'i' });
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
      if (selected) void uploadPdf(selected);
      // Reset so picking the same file again still fires onChange.
      e.target.value = '';
    },
    [uploadPdf],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const dropped = e.dataTransfer.files?.[0];
      if (dropped) void uploadPdf(dropped);
    },
    [uploadPdf],
  );

  const handleConfirm = useCallback(async () => {
    if (!preview || preview.matchedCount === 0) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/labs/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          biomarkers: preview.biomarkers,
          sourceFilename: preview.sourceFilename,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Could not save your results');
        return;
      }
      setSavedCount(typeof data.saved === 'number' ? data.saved : preview.biomarkers.length);
      toast.success('Your results were saved');
    } catch {
      toast.error('Could not save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [preview]);

  const resetFlow = useCallback(() => {
    setPreview(null);
    setSavedCount(null);
  }, []);

  // SAVED SCREEN
  if (savedCount !== null) {
    return (
      <div className="flex flex-col gap-4 md:gap-6 px-4 md:px-0">
        <Link
          href="/plugins"
          className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-white"
          style={{ color: 'var(--teal-500)' }}
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
          Plugins
        </Link>

        <div
          className="glass-v2 p-4 md:p-6 rounded-2xl flex flex-col gap-4"
          style={{ borderLeft: '4px solid #2DA5A0' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-11 h-11 rounded-xl"
              style={{ backgroundColor: 'rgba(45, 165, 160, 0.15)' }}
            >
              <CheckCircle2 size={22} strokeWidth={1.5} style={{ color: '#2DA5A0' }} />
            </div>
            <div>
              <h2 className="text-heading-3 text-white">Results saved</h2>
              <p className="text-sm text-white/60">
                {savedCount} {savedCount === 1 ? 'biomarker' : 'biomarkers'} saved to your record.
              </p>
            </div>
          </div>
          <div>
            <VCButton variant="primary" size="sm" onClick={resetFlow}>
              Upload another report
            </VCButton>
          </div>
          <p className="text-xs leading-relaxed text-white/40">{DISCLAIMER}</p>
        </div>
      </div>
    );
  }

  // VERIFY SCREEN
  if (preview) {
    return (
      <div className="flex flex-col gap-4 md:gap-6 px-4 md:px-0">
        <Link
          href="/plugins"
          className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-white"
          style={{ color: 'var(--teal-500)' }}
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
          Plugins
        </Link>

        <div
          className="glass-v2 p-4 md:p-6 rounded-2xl flex flex-col gap-4"
          style={{ borderLeft: '4px solid #2DA5A0' }}
        >
          <div className="flex items-start gap-3">
            <div
              className="flex items-center justify-center w-11 h-11 rounded-xl flex-none"
              style={{ backgroundColor: 'rgba(45, 165, 160, 0.15)' }}
            >
              <ShieldCheck size={22} strokeWidth={1.5} style={{ color: '#2DA5A0' }} />
            </div>
            <div>
              <h2 className="text-heading-3 text-white">Verify your results</h2>
              <p className="text-sm text-white/60 leading-relaxed mt-1">
                We read these from {preview.sourceFilename}
                {preview.scanned ? ' (scanned document, read with OCR)' : ''}. Check each value,
                then save. Nothing is written to your record until you confirm.
              </p>
            </div>
          </div>

          {preview.matchedCount === 0 ? (
            <div
              className="flex items-start gap-2 rounded-xl p-4 text-sm leading-relaxed"
              style={{
                backgroundColor: 'rgba(183, 94, 24, 0.08)',
                border: '1px solid rgba(183, 94, 24, 0.3)',
                color: '#D98A3D',
              }}
            >
              <AlertTriangle size={16} strokeWidth={1.5} className="mt-0.5 flex-none" />
              <span>
                We could not find any biomarker values in this PDF. It may be a summary or letter
                rather than a results table. Try a different file or enter values manually.
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {preview.biomarkers.map((b, i) => {
                const chip = flagChipStyle(b.flag);
                const hasRef = b.referenceLow !== null && b.referenceHigh !== null;
                return (
                  <div
                    key={`${b.name}-${i}`}
                    className="rounded-xl px-4 py-3"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-white">{b.name}</span>
                      <span className="text-sm" style={{ color: 'var(--teal-400, #4DC9C4)' }}>
                        {b.value} {b.unit}
                      </span>
                      {hasRef ? (
                        <span className="text-xs text-white/45">
                          Ref: {b.referenceLow} to {b.referenceHigh}
                        </span>
                      ) : null}
                      {chip ? (
                        <span
                          className="ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
                          style={chip}
                        >
                          {b.flag}
                        </span>
                      ) : null}
                    </div>
                    {/* The verbatim source line, so a misread is catchable. */}
                    {b.context ? (
                      <p className="mt-1.5 text-[11px] font-mono leading-relaxed text-white/40">
                        Read from: {b.context}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          {preview.matchedCount > 0 ? (
            <p className="text-xs leading-relaxed text-white/45">
              High and low flags reflect the reference range printed on your report, not a diagnosis.
            </p>
          ) : null}
          <p className="text-xs leading-relaxed text-white/40">{DISCLAIMER}</p>

          <div className="flex flex-wrap gap-3">
            <VCButton
              variant="primary"
              size="sm"
              onClick={handleConfirm}
              disabled={isSaving || preview.matchedCount === 0}
            >
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
      </div>
    );
  }

  // DEFAULT SCREEN (cards)
  return (
    <div className="flex flex-col gap-4 md:gap-6 px-4 md:px-0">
      {/* Back link */}
      <Link
        href="/plugins"
        className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-white"
        style={{ color: 'var(--teal-500)' }}
      >
        <ArrowLeft size={16} strokeWidth={1.5} />
        Plugins
      </Link>

      {/* Title */}
      <h1 className="text-heading-2" style={{ color: 'var(--text-heading-orange)' }}>
        Connect Lab Results
      </h1>

      {/* Subtitle */}
      <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>
        Feed biomarker data into your GeneX360 panels for genetically contextualized insights.
      </p>

      {/* Link to the saved results overlay */}
      <Link
        href="/lab-results"
        className="inline-flex items-center gap-2 text-sm font-semibold transition-colors hover:text-white"
        style={{ color: 'var(--teal-500)' }}
      >
        <Dna size={16} strokeWidth={1.5} />
        View my lab results
      </Link>

      {/* Hidden PDF file input for Card 1 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.csv,application/pdf,text/csv"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Card 1 - Upload Lab Report (real PDF picker + drag-and-drop) */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className="glass-v2 p-4 md:p-6 rounded-2xl flex flex-col gap-3 md:gap-4 transition-colors"
        style={{
          borderLeft: '4px solid #2DA5A0',
          backgroundColor: dragOver ? 'rgba(45, 165, 160, 0.06)' : undefined,
        }}
      >
        <div
          className="flex items-center justify-center w-11 h-11 rounded-xl"
          style={{ backgroundColor: 'rgba(45, 165, 160, 0.15)' }}
        >
          <FileText size={22} strokeWidth={1.5} style={{ color: '#2DA5A0' }} />
        </div>
        <h3 className="text-heading-3 text-white">UPLOAD LAB REPORT (PDF OR CSV)</h3>
        <p className="text-sm text-white/60 leading-relaxed">
          Upload a lab report PDF and our AI extracts your biomarkers, or a CSV export to read them
          directly. You verify every reading before anything is saved. Drag a file here or click to browse.
        </p>
        <VCButton
          variant="primary"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isReading}
        >
          {isReading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
              Reading your report...
            </span>
          ) : (
            'Upload PDF or CSV'
          )}
        </VCButton>
      </div>

      {/* Card 2 - Quest Diagnostics */}
      <div className="glass-v2 p-4 md:p-6 rounded-2xl flex flex-col gap-3 md:gap-4">
        <div
          className="flex items-center justify-center w-11 h-11 rounded-xl"
          style={{ backgroundColor: 'rgba(45, 165, 160, 0.08)' }}
        >
          <Building2 size={22} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
        </div>
        <h3 className="text-heading-3 text-white">QUEST DIAGNOSTICS</h3>
        <p className="text-sm text-white/60 leading-relaxed">
          Connect your Quest MyQuest account to auto-import results.
        </p>
        <VCButton variant="secondary" size="sm" onClick={handleAction}>
          Connect Quest &rarr;
        </VCButton>
      </div>

      {/* Card 3 - Labcorp */}
      <div className="glass-v2 p-4 md:p-6 rounded-2xl flex flex-col gap-3 md:gap-4">
        <div
          className="flex items-center justify-center w-11 h-11 rounded-xl"
          style={{ backgroundColor: 'rgba(45, 165, 160, 0.08)' }}
        >
          <Building2 size={22} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
        </div>
        <h3 className="text-heading-3 text-white">LABCORP</h3>
        <p className="text-sm text-white/60 leading-relaxed">
          Connect your Labcorp OnDemand account.
        </p>
        <VCButton variant="secondary" size="sm" onClick={handleAction}>
          Connect Labcorp &rarr;
        </VCButton>
      </div>

      {/* Card 4 - Manual Entry */}
      <div className="glass-v2 p-4 md:p-6 rounded-2xl flex flex-col gap-3 md:gap-4">
        <div
          className="flex items-center justify-center w-11 h-11 rounded-xl"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
        >
          <Edit3 size={22} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
        </div>
        <h3 className="text-heading-3 text-white">MANUAL ENTRY</h3>
        <p className="text-sm text-white/60 leading-relaxed">
          Type in individual biomarker values from any lab report.
        </p>
        <VCButton variant="ghost" size="sm" onClick={handleAction}>
          Enter Manually &rarr;
        </VCButton>
      </div>

      {/* Genetic Context Preview */}
      <div className="glass-v2-insight p-4 md:p-5 rounded-2xl flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Dna size={16} strokeWidth={1.5} style={{ color: 'var(--teal-500)' }} />
          <p className="text-overline">GENETIC CONTEXT PREVIEW</p>
        </div>
        <p className="text-sm text-white/70 leading-relaxed">
          When you upload lab results, ViaConnect doesn&apos;t just show &ldquo;normal&rdquo;
          ranges. It shows <span className="text-white font-semibold">YOUR</span> genetic optimal
          range.
        </p>
        <div className="flex flex-col gap-1.5 mt-1">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Standard range: 30 to 100 ng/mL
          </p>
          <p className="text-sm font-semibold" style={{ color: 'var(--teal-400, #4DC9C4)' }}>
            YOUR genetic optimal: 60 to 80 ng/mL
          </p>
          <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--teal-300, #6DD8D3)' }}>
            (based on VDR rs1544410 variant)
          </p>
        </div>
      </div>

      {/* ViaTokens reward note */}
      <div className="glass-v2 flex items-center gap-3 p-3 md:p-4 rounded-xl min-h-[44px]">
        <Coins size={20} strokeWidth={1.5} style={{ color: '#D4A017' }} />
        <p className="text-sm font-semibold" style={{ color: '#D4A017' }}>
          +50 ViaTokens for uploading labs!
        </p>
      </div>

      {/* Lightbulb tip */}
      <div className="glass-v2 flex items-center gap-3 p-3 md:p-4 rounded-xl min-h-[44px]">
        <Lightbulb size={20} strokeWidth={1.5} style={{ color: 'var(--teal-500)' }} />
        <p className="text-sm text-white/60">
          You verify every extracted value before it is saved to your record.
        </p>
      </div>
    </div>
  );
}
