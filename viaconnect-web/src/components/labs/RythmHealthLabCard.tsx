'use client';

// Rythm Health lab card. Blood panel CSV import only.
// Partner API is Coming soon with no Connect control.
// Lucide fallback. No scraped brand assets. No medical claims.

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FlaskConical, Loader2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { VCButton } from '@/components/ui/VCButton';
import { parseRythmHealthCsv } from '@/lib/labs/parseRythmHealthCsv';
import {
  RYTHM_HEALTH_COPY,
  RYTHM_HEALTH_LAB_NAME,
  RYTHM_HEALTH_ORDERS_URL,
  rythmHealthFromLabChip,
} from '@/lib/labs/rythmHealth';

type Biomarker = {
  name: string;
  value: number;
  unit: string;
  referenceLow: number | null;
  referenceHigh: number | null;
  flag: 'low' | 'normal' | 'high' | null;
  context: string;
};

type Preview = {
  sourceFilename: string;
  collectionDate: string | null;
  skippedDerived: string[];
  biomarkers: Biomarker[];
};

type ImportStatus = {
  imported: boolean;
  savedCount: number | null;
  lastCollectionDate: string | null;
  status: 'empty' | 'imported' | 'UNKNOWN';
};

const EMPTY_STATUS: ImportStatus = {
  imported: false,
  savedCount: null,
  lastCollectionDate: null,
  status: 'empty',
};

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

export function RythmHealthLabCard() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<ImportStatus>(EMPTY_STATUS);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/labs/rythm-health/status');
      if (!res.ok) {
        setStatus({
          imported: false,
          savedCount: null,
          lastCollectionDate: null,
          status: 'UNKNOWN',
        });
        return;
      }
      const data = (await res.json()) as ImportStatus;
      setStatus({
        imported: data.imported === true,
        savedCount: typeof data.savedCount === 'number' ? data.savedCount : null,
        lastCollectionDate:
          typeof data.lastCollectionDate === 'string' ? data.lastCollectionDate : null,
        status: data.status === 'imported' || data.status === 'empty' ? data.status : 'UNKNOWN',
      });
    } catch {
      setStatus({
        imported: false,
        savedCount: null,
        lastCollectionDate: null,
        status: 'UNKNOWN',
      });
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const onFile = useCallback(async (file: File) => {
    const name = file.name.toLowerCase();
    const isCsv = name.endsWith('.csv') || file.type === 'text/csv';
    if (!isCsv) {
      toast.error('Please choose a CSV file from your Rythm Health orders page');
      return;
    }
    setIsReading(true);
    try {
      const parsed = parseRythmHealthCsv(await file.text());
      setSavedCount(null);
      setPreview({
        sourceFilename: file.name,
        collectionDate: parsed.collectionDate,
        skippedDerived: parsed.skippedDerived,
        biomarkers: parsed.biomarkers,
      });
      if (parsed.biomarkers.length === 0) {
        toast('We could not find blood-test rows in this CSV', { icon: 'i' });
      }
    } catch {
      toast.error('Could not read this file. Please try again.');
    } finally {
      setIsReading(false);
    }
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!preview || preview.biomarkers.length === 0) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/labs/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          biomarkers: preview.biomarkers,
          sourceFilename: preview.sourceFilename,
          sourceType: 'csv',
          collectionDate: preview.collectionDate,
          labName: RYTHM_HEALTH_LAB_NAME,
        }),
      });
      const data = (await res.json()) as { saved?: number; error?: string };
      if (!res.ok) {
        toast.error(data.error || 'Could not save your results');
        return;
      }
      const saved = typeof data.saved === 'number' ? data.saved : preview.biomarkers.length;
      setSavedCount(saved);
      toast.success('Your lab values were saved');
      void loadStatus();
    } catch {
      toast.error('Could not save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [preview, loadStatus]);

  const resetFlow = useCallback(() => {
    setPreview(null);
    setSavedCount(null);
  }, []);

  const labChip = rythmHealthFromLabChip(status.savedCount);

  if (savedCount !== null) {
    return (
      <section
        data-lab-card="rythm_health"
        className="rounded-xl border border-white/15 bg-[rgba(30,48,84,0.92)] p-4"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{ backgroundColor: 'rgba(45, 165, 160, 0.15)' }}
          >
            <CheckCircle2 size={22} strokeWidth={1.5} style={{ color: '#2DA5A0' }} />
          </div>
          <div>
            <h3 className="text-lg font-medium text-white">{RYTHM_HEALTH_COPY.imported}</h3>
            <p className="text-sm text-white/60">
              {savedCount} {savedCount === 1 ? 'lab value' : 'lab values'} saved.
              {labChip ? ` ${labChip}.` : ''}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <VCButton variant="primary" size="sm" onClick={resetFlow}>
            Upload another CSV
          </VCButton>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-white/40">{RYTHM_HEALTH_COPY.disclaimer}</p>
      </section>
    );
  }

  if (preview) {
    return (
      <section
        data-lab-card="rythm_health"
        className="rounded-xl border border-white/15 bg-[rgba(30,48,84,0.92)] p-4"
      >
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 flex-none items-center justify-center rounded-xl"
            style={{ backgroundColor: 'rgba(45, 165, 160, 0.15)' }}
          >
            <ShieldCheck size={22} strokeWidth={1.5} style={{ color: '#2DA5A0' }} />
          </div>
          <div>
            <h3 className="text-lg font-medium text-white">Verify your Rythm Health results</h3>
            <p className="mt-1 text-sm leading-relaxed text-white/60">
              {RYTHM_HEALTH_COPY.verifyLead} Read from {preview.sourceFilename}
              {preview.collectionDate ? ` · collected ${preview.collectionDate}` : ''}.
            </p>
          </div>
        </div>

        {preview.skippedDerived.length > 0 ? (
          <p className="mt-3 text-xs text-white/50">
            Product scores in this file were not imported (Rythm Score and Biological Age stay
            off this lab record).
          </p>
        ) : null}

        {preview.biomarkers.length === 0 ? (
          <div
            className="mt-3 flex items-start gap-2 rounded-xl p-4 text-sm leading-relaxed"
            style={{
              backgroundColor: 'rgba(183, 94, 24, 0.08)',
              border: '1px solid rgba(183, 94, 24, 0.3)',
              color: '#D98A3D',
            }}
          >
            <AlertTriangle size={16} strokeWidth={1.5} className="mt-0.5 flex-none" />
            <span>
              We could not find blood-test values in this CSV. Download the CSV from your orders
              page and try again, or use the generic lab upload.
            </span>
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {preview.biomarkers.map((b, i) => {
              const chip = flagChipStyle(b.flag);
              const hasRef = b.referenceLow !== null && b.referenceHigh !== null;
              return (
                <li
                  key={`${b.name}-${i}`}
                  className="rounded-lg border border-white/10 px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-white">{b.name}</span>
                    <span style={{ color: 'var(--teal-400, #4DC9C4)' }}>
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
                  {b.context ? (
                    <p className="mt-1 font-mono text-[11px] leading-relaxed text-white/40">
                      Read from: {b.context}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-3 text-xs leading-relaxed text-white/40">{RYTHM_HEALTH_COPY.disclaimer}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <VCButton
            variant="primary"
            size="sm"
            onClick={() => void handleConfirm()}
            disabled={isSaving || preview.biomarkers.length === 0}
          >
            {isSaving ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
                Saving...
              </span>
            ) : (
              'Confirm and save lab values'
            )}
          </VCButton>
          <VCButton variant="secondary" size="sm" onClick={resetFlow}>
            Cancel
          </VCButton>
        </div>
      </section>
    );
  }

  const statusLine =
    status.status === 'UNKNOWN'
      ? RYTHM_HEALTH_COPY.unknown
      : status.imported && labChip
        ? `${RYTHM_HEALTH_COPY.imported}${
            typeof status.savedCount === 'number' ? ` · ${status.savedCount} values` : ''
          }${status.lastCollectionDate ? ` · ${status.lastCollectionDate}` : ''} · ${labChip}`
        : RYTHM_HEALTH_COPY.empty;

  return (
    <section
      data-lab-card="rythm_health"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const dropped = e.dataTransfer.files?.[0];
        if (dropped) void onFile(dropped);
      }}
      className="rounded-xl border border-white/15 bg-[rgba(30,48,84,0.92)] p-4"
      style={{ backgroundColor: dragOver ? 'rgba(45, 165, 160, 0.08)' : undefined }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => {
          const selected = e.target.files?.[0];
          if (selected) void onFile(selected);
          e.target.value = '';
        }}
        className="hidden"
      />
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 flex-none items-center justify-center rounded-xl"
          style={{ backgroundColor: 'rgba(45, 165, 160, 0.15)' }}
        >
          <FlaskConical size={22} strokeWidth={1.5} style={{ color: '#2DA5A0' }} />
        </div>
        <div>
          <h3 className="text-lg font-medium text-white">{RYTHM_HEALTH_COPY.title}</h3>
          <p className="mt-1 text-sm text-white/65">{RYTHM_HEALTH_COPY.category}</p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-white/70">{RYTHM_HEALTH_COPY.lead}</p>
      <p className="mt-2 text-sm leading-relaxed text-white/55">
        {RYTHM_HEALTH_COPY.exportHelp}{' '}
        <a
          href={RYTHM_HEALTH_ORDERS_URL}
          target="_blank"
          rel="noreferrer"
          className="text-[#2DA5A0] underline-offset-2 hover:underline"
        >
          Open orders page
        </a>
      </p>
      <p className="mt-2 text-xs text-white/50">{statusLine}</p>
      <p className="mt-2 text-xs text-white/45">{RYTHM_HEALTH_COPY.partnerComingSoon}</p>
      <div className="mt-4">
        <VCButton
          variant="primary"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isReading}
        >
          {isReading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
              Reading CSV...
            </span>
          ) : (
            RYTHM_HEALTH_COPY.uploadCta
          )}
        </VCButton>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-white/40">{RYTHM_HEALTH_COPY.disclaimer}</p>
    </section>
  );
}
