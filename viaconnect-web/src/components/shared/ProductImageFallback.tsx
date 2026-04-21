// Photo Sync prompt §3.7: missing-image fallback.
//
// Centered Lucide ImageOff at strokeWidth 1.5, Deep Navy at 30% opacity,
// background Teal at 5%. Caption "Image coming soon" in Instrument Sans
// 12px mobile / 13px desktop, Deep Navy at 60%. Admins (and only admins)
// also see the SKU below the caption for triage.

import { ImageOff } from 'lucide-react';

interface Props {
  sku?: string | null;
  showSkuToAdmin?: boolean;     // pass true on admin surfaces only
  className?: string;
}

export function ProductImageFallback({ sku, showSkuToAdmin, className }: Props): JSX.Element {
  return (
    <div
      className={`flex flex-col items-center justify-center w-full h-full text-center ${className ?? ''}`}
      style={{ background: 'rgba(45, 165, 160, 0.05)' }}
    >
      <ImageOff
        className="w-8 h-8 md:w-10 md:h-10"
        strokeWidth={1.5}
        style={{ color: 'rgba(26, 39, 68, 0.30)' }}
        aria-hidden="true"
      />
      <span
        className="mt-2 font-[Instrument_Sans] text-[12px] md:text-[13px]"
        style={{ color: 'rgba(26, 39, 68, 0.60)' }}
      >
        Image coming soon
      </span>
      {showSkuToAdmin && sku && (
        <span
          className="mt-1 font-mono text-[10px]"
          style={{ color: 'rgba(26, 39, 68, 0.45)' }}
        >
          {sku}
        </span>
      )}
    </div>
  );
}
