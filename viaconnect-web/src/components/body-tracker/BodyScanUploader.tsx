'use client';

import { useRef, useState } from 'react';
import { Camera, Check, Loader2, ShieldCheck, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export type PhotoPosition = 'front' | 'back' | 'left_side' | 'right_side';

const POSITIONS: Array<{ key: PhotoPosition; label: string }> = [
  { key: 'front',      label: 'Front' },
  { key: 'back',       label: 'Back' },
  { key: 'left_side',  label: 'Left' },
  { key: 'right_side', label: 'Right' },
];

const MAX_PHOTO_BYTES = 5_000_000; // 5 MB binary
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL ??
  '';

export interface BodyScanEstimate {
  estimated_body_fat_min: number;
  estimated_body_fat_max: number;
  body_type: string;
  fat_distribution: string;
  estimated_whr_min: number;
  estimated_whr_max: number;
  muscle_development: Record<string, number>;
  ai_confidence: 'low' | 'medium' | 'high';
}

export interface BodyScanResult {
  scanId: string;
  scanDate: string;
  estimates: BodyScanEstimate;
}

interface BodyScanUploaderProps {
  onComplete: (result: BodyScanResult) => void;
  onCancel: () => void;
}

interface SlotState {
  file: File | null;
  base64: string | null;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') return reject(new Error('Read failed'));
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Read failed'));
    reader.readAsDataURL(file);
  });
}

export function BodyScanUploader({ onComplete, onCancel }: BodyScanUploaderProps) {
  const initialSlots: Record<PhotoPosition, SlotState> = {
    front:      { file: null, base64: null },
    back:       { file: null, base64: null },
    left_side:  { file: null, base64: null },
    right_side: { file: null, base64: null },
  };
  const [slots, setSlots] = useState<Record<PhotoPosition, SlotState>>(initialSlots);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<Record<PhotoPosition, HTMLInputElement | null>>({
    front: null, back: null, left_side: null, right_side: null,
  });

  const allFilled = POSITIONS.every((p) => slots[p.key].base64 !== null);

  function clearSlot(key: PhotoPosition) {
    setSlots((s) => ({ ...s, [key]: { file: null, base64: null } }));
    if (inputRefs.current[key]) inputRefs.current[key]!.value = '';
  }

  async function handleFile(key: PhotoPosition, file: File) {
    setError(null);
    if (file.size > MAX_PHOTO_BYTES) {
      setError(`Photo too large (max 5 MB). Try compressing or retaking.`);
      return;
    }
    try {
      const b64 = await fileToBase64(file);
      setSlots((s) => ({ ...s, [key]: { file, base64: b64 } }));
    } catch {
      setError('Could not read photo. Try a different image.');
    }
  }

  async function handleAnalyze() {
    if (!allFilled || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Not signed in');

      const url = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/body-scan-analyze`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          photos: {
            front:      slots.front.base64,
            back:       slots.back.base64,
            left_side:  slots.left_side.base64,
            right_side: slots.right_side.base64,
          },
          media_type: slots.front.file?.type?.startsWith('image/png') ? 'image/png' : 'image/jpeg',
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error((errBody as { error?: string }).error ?? `Vision request failed (${res.status})`);
      }
      const out = (await res.json()) as {
        scan_id: string;
        scan_date: string;
        estimates: BodyScanEstimate;
      };
      onComplete({ scanId: out.scan_id, scanDate: out.scan_date, estimates: out.estimates });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-white/60">
        Take 4 photos for an AI body composition estimate.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {POSITIONS.map((pos) => {
          const slot = slots[pos.key];
          const filled = slot.base64 !== null;
          return (
            <div key={pos.key} className="space-y-2">
              <label
                htmlFor={`scan-${pos.key}`}
                className={`relative flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl text-xs font-medium transition-all ${
                  filled
                    ? 'border border-[#2DA5A0]/60 bg-[#2DA5A0]/15 text-[#2DA5A0]'
                    : 'border border-dashed border-white/20 bg-white/[0.03] text-white/50 hover:bg-white/[0.06]'
                }`}
              >
                {filled ? (
                  <>
                    <Check size={20} strokeWidth={1.5} />
                    <span>{pos.label}</span>
                    <span className="text-[10px] text-[#2DA5A0]/80">Captured</span>
                  </>
                ) : (
                  <>
                    <Camera size={20} strokeWidth={1.5} />
                    <span>{pos.label}</span>
                    <span className="text-[10px] text-white/40">Tap to capture</span>
                  </>
                )}
                <input
                  ref={(el) => { inputRefs.current[pos.key] = el; }}
                  id={`scan-${pos.key}`}
                  type="file"
                  accept="image/jpeg,image/png,image/heic,image/heif"
                  capture="environment"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleFile(pos.key, f);
                  }}
                />
              </label>
              {filled && (
                <button
                  type="button"
                  onClick={() => clearSlot(pos.key)}
                  className="inline-flex w-full items-center justify-center gap-1 rounded-md text-[11px] text-white/50 transition-colors hover:text-white"
                >
                  <X size={12} strokeWidth={1.5} /> Retake
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-xs text-white/55">
        <p className="font-semibold text-white/70">Tips for best results:</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Wear form fitting clothing</li>
          <li>Stand in consistent lighting</li>
          <li>Arms slightly away from body</li>
          <li>Full body visible from head to feet</li>
        </ul>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 p-3 text-xs text-white/70">
        <ShieldCheck size={14} strokeWidth={1.5} className="mt-0.5 flex-none text-[#2DA5A0]" />
        <p>
          Photos are sent securely for analysis and immediately discarded. Only the
          estimated metrics are saved to your profile.
        </p>
      </div>

      {error && <p className="text-xs text-[#FCA5A5]">{error}</p>}

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-lg px-4 py-2 text-sm text-white/60 transition-colors hover:text-white disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={!allFilled || submitting}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#2DA5A0] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2DA5A0]/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting && <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />}
          {submitting ? 'Analyzing' : 'Analyze My Composition'}
        </button>
      </div>
    </div>
  );
}
