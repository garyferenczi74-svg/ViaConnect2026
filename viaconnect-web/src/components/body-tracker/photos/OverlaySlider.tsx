'use client';

import { useCallback, useRef, useState } from 'react';
import { MoveHorizontal } from 'lucide-react';

interface OverlaySliderProps {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export function OverlaySlider({
  beforeUrl,
  afterUrl,
  beforeLabel = 'Before',
  afterLabel = 'After',
}: OverlaySliderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pct, setPct] = useState(50);

  const setFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const next = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPct(next);
  }, []);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    (e.target as Element).setPointerCapture(e.pointerId);
    setFromClientX(e.clientX);
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.buttons & 1) === 0) return;
    setFromClientX(e.clientX);
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      className="relative aspect-[2/3] max-w-sm mx-auto overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0B1520] select-none touch-none"
    >
      {/* After image (full) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={afterUrl} alt={afterLabel} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
      {/* Before image clipped by pct */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ width: `${pct}%` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={beforeUrl}
          alt={beforeLabel}
          className="h-full object-cover pointer-events-none"
          style={{ width: `${(100 / Math.max(pct, 0.01)) * 100}%`, maxWidth: 'none' }}
        />
      </div>
      {/* Divider + handle */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white/90 pointer-events-none"
        style={{ left: `${pct}%` }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center justify-center h-10 w-10 rounded-full bg-white text-[#0B1520] shadow-lg pointer-events-none"
        style={{ left: `${pct}%` }}
      >
        <MoveHorizontal className="h-5 w-5" strokeWidth={2} />
      </div>
      <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white pointer-events-none">
        {beforeLabel}
      </span>
      <span className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white pointer-events-none">
        {afterLabel}
      </span>
    </div>
  );
}
