'use client';

// QualityIndicators.tsx
//
// Real-time overlay showing 6 quality checkmarks during pose capture.
// Driven by a QualityScores object produced each video-frame tick.
//
// 5 blocking checks: lighting, pose, clothing, cameraLevel, frameCoverage.
// 1 advisory check: bgClutter (shows orange, does NOT block auto-capture).
//
// Auto-capture logic: once all 5 blocking checks pass (overallPass = true),
// starts AUTO_CAPTURE_HOLD_MS countdown. Any blocking check flipping to fail
// resets the timer. When timer completes, calls onAutoCapture().

import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sun,
  User,
  Shirt,
  Image,
  Smartphone,
  Maximize2,
} from 'lucide-react';
import { AUTO_CAPTURE_HOLD_MS } from '@/lib/body-tracker/scan-constants';
import type { QualityScores } from '@/lib/body-tracker/scan-types';

interface QualityIndicatorsProps {
  scores: QualityScores | null;
  /** Called when all blocking checks hold green for AUTO_CAPTURE_HOLD_MS. */
  onAutoCapture: () => void;
  /** While a burst capture is in progress, freeze the indicators. */
  capturing?: boolean;
}

interface IndicatorDef {
  key: keyof Pick<QualityScores, 'lighting' | 'pose' | 'clothing' | 'bgClutter' | 'cameraLevel' | 'frameCoverage'>;
  label: string;
  icon: React.ElementType;
  advisory: boolean;
}

const INDICATORS: IndicatorDef[] = [
  { key: 'lighting',      label: 'Lighting',     icon: Sun,         advisory: false },
  { key: 'pose',          label: 'A-pose',        icon: User,        advisory: false },
  { key: 'clothing',      label: 'Clothing fit',  icon: Shirt,       advisory: false },
  { key: 'cameraLevel',   label: 'Camera level',  icon: Smartphone,  advisory: false },
  { key: 'frameCoverage', label: 'Full body',     icon: Maximize2,   advisory: false },
  { key: 'bgClutter',     label: 'Background',    icon: Image,       advisory: true  },
];

/** A score >= 50 counts as passing for display purposes. */
function scorePass(score: number): boolean {
  return score >= 50;
}

export function QualityIndicators({
  scores,
  onAutoCapture,
  capturing = false,
}: QualityIndicatorsProps) {
  const [holdProgress, setHoldProgress] = useState<number>(0); // 0-100
  const holdStartRef   = useRef<number | null>(null);
  const rafRef         = useRef<number | null>(null);
  const firedRef       = useRef(false);

  useEffect(() => {
    if (capturing) {
      // Freeze during burst; don't reset (the callback was already fired)
      return;
    }

    const allBlockingPass = scores?.overallPass ?? false;

    if (!allBlockingPass) {
      // Reset timer
      holdStartRef.current = null;
      setHoldProgress(0);
      firedRef.current = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    // All blocking checks pass: start or continue the hold countdown
    if (!holdStartRef.current) {
      holdStartRef.current = performance.now();
      firedRef.current = false;
    }

    function tick() {
      if (!holdStartRef.current) return;
      const elapsed = performance.now() - holdStartRef.current;
      const progress = Math.min(100, (elapsed / AUTO_CAPTURE_HOLD_MS) * 100);
      setHoldProgress(progress);

      if (elapsed >= AUTO_CAPTURE_HOLD_MS && !firedRef.current) {
        firedRef.current = true;
        onAutoCapture();
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  // onAutoCapture intentionally excluded from deps — it is a stable callback
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scores, capturing]);

  const allBlockingPass = scores?.overallPass ?? false;
  const holdSecs = holdProgress > 0
    ? ((AUTO_CAPTURE_HOLD_MS - (holdProgress / 100) * AUTO_CAPTURE_HOLD_MS) / 1000).toFixed(1)
    : (AUTO_CAPTURE_HOLD_MS / 1000).toFixed(1);

  return (
    <div className="pointer-events-none select-none">
      {/* Indicator pills */}
      <div className="flex flex-wrap gap-1.5 justify-center">
        {INDICATORS.map(({ key, label, icon: Icon, advisory }) => {
          const score = scores?.[key] ?? 0;
          const pass  = advisory ? (scores ? !scores.advisoryNotes.some((n) => n.toLowerCase().includes('clutter')) : true) : scorePass(score);

          let iconColor: string;
          let bgColor: string;
          let borderColor: string;

          if (advisory) {
            iconColor   = pass ? 'text-[#2DA5A0]' : 'text-yellow-400';
            bgColor     = pass ? 'bg-[#2DA5A0]/10' : 'bg-yellow-500/10';
            borderColor = pass ? 'border-[#2DA5A0]/30' : 'border-yellow-500/30';
          } else {
            iconColor   = pass ? 'text-[#2DA5A0]' : 'text-[#FCA5A5]';
            bgColor     = pass ? 'bg-[#2DA5A0]/10' : 'bg-red-500/10';
            borderColor = pass ? 'border-[#2DA5A0]/30' : 'border-red-500/30';
          }

          const StatusIcon = pass
            ? CheckCircle2
            : advisory
              ? AlertCircle
              : XCircle;

          return (
            <div
              key={key}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${bgColor} ${borderColor}`}
            >
              <Icon className={`h-3 w-3 shrink-0 ${iconColor}`} strokeWidth={1.5} />
              <span className={`text-[10px] font-medium ${iconColor}`}>{label}</span>
              <StatusIcon className={`h-3 w-3 shrink-0 ${iconColor}`} strokeWidth={1.5} />
            </div>
          );
        })}
      </div>

      {/* Auto-capture countdown bar */}
      {allBlockingPass && !capturing && holdProgress > 0 && (
        <div className="mt-2 space-y-1">
          <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-[#2DA5A0] rounded-full transition-none"
              style={{ width: `${holdProgress}%` }}
            />
          </div>
          <p className="text-center text-[10px] text-[#2DA5A0] font-medium">
            Auto-capture in {holdSecs}s
          </p>
        </div>
      )}

      {/* Capturing flash */}
      {capturing && (
        <p className="mt-2 text-center text-[10px] font-semibold text-white animate-pulse">
          Capturing 3 frames...
        </p>
      )}
    </div>
  );
}
