'use client';

import { Camera, ImagePlus } from 'lucide-react';

export type FormaVisionScanMode = 'live' | 'upload';

interface FormaVisionScanModeBarProps {
  mode: FormaVisionScanMode;
  onChange: (mode: FormaVisionScanMode) => void;
  liveLabel?: string;
  uploadLabel?: string;
}

export function FormaVisionScanModeBar({
  mode,
  onChange,
  liveLabel = 'Live scan',
  uploadLabel = 'Upload saved images',
}: FormaVisionScanModeBarProps) {
  return (
    <div
      role="tablist"
      aria-label="FormaVision scan mode"
      data-testid="formavision-scan-mode"
      className="flex w-full flex-col gap-2 sm:flex-row"
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'live'}
        data-testid="formavision-mode-live"
        onClick={() => onChange('live')}
        className={`inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium sm:w-auto ${
          mode === 'live'
            ? 'border-[#B75E18]/50 bg-[#B75E18]/15 text-[#B75E18]'
            : 'border-white/20 bg-white/[0.04] text-white/60'
        }`}
      >
        <Camera size={16} strokeWidth={1.5} />
        {liveLabel}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'upload'}
        data-testid="formavision-mode-upload"
        onClick={() => onChange('upload')}
        className={`inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium sm:w-auto ${
          mode === 'upload'
            ? 'border-[#2DA5A0]/50 bg-[#2DA5A0]/15 text-[#2DA5A0]'
            : 'border-white/20 bg-white/[0.04] text-white/60'
        }`}
      >
        <ImagePlus size={16} strokeWidth={1.5} />
        {uploadLabel}
      </button>
    </div>
  );
}
