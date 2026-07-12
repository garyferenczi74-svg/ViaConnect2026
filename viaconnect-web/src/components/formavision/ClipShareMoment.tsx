'use client';

/**
 * src/components/formavision/ClipShareMoment.tsx
 *
 * Prompt 211a W1: the consumer-only Helix first-share moment. Reuses the
 * MilestoneMoment pattern (celebrate-only fixed toast, dismissible, 44px touch
 * target). Celebrates the user's FIRST time sharing a transformation clip.
 *
 * ECONOMY CONTRACT (binding, Gary decision 2026-06-27):
 *   READ-ONLY. This surface DISPLAYS a celebratory moment only. It NEVER writes any
 *   Helix economy row, NEVER credits a balance, NEVER awards Helix from the clip
 *   surface. First-share to Helix crediting, if any, is a separate server task.
 *
 * Consumer-only: mounted only on the (consumer) composition route, alongside the
 * existing consumer-only MilestoneMoment. No practitioner path.
 *
 * Standing rules: Lucide strokeWidth 1.5, no emojis, no em / en dashes, tokens only
 * (Teal #2DA5A0 / Navy #1E3054), Instrument Sans. Responsive, 44px dismiss target.
 */

import { Sparkles, X } from 'lucide-react';

export interface ClipShareMomentProps {
  /** When true, the celebratory toast is shown. The parent gates this on the
   *  first-share guard (shouldCelebrateFirstShare) so it is one-shot per browser. */
  show: boolean;
  /** When true, disables CSS animations (prefers-reduced-motion override). */
  reducedMotion?: boolean;
  /** Called when the user dismisses the moment. */
  onDismiss: () => void;
}

export function ClipShareMoment({ show, reducedMotion, onDismiss }: ClipShareMomentProps) {
  // Nothing to celebrate -> render nothing. Honest: no empty celebration.
  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-testid="clip-share-moment-toast"
      className={`fixed bottom-4 left-4 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-[#2DA5A0]/35 bg-[#1E3054]/95 p-4 shadow-2xl backdrop-blur-md sm:left-6 sm:w-80 ${
        reducedMotion ? '' : 'motion-safe:transition-opacity motion-safe:duration-300'
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 pt-[14px]">
          <Sparkles size={16} strokeWidth={1.5} className="flex-none text-[#2DA5A0]" aria-hidden="true" />
          <h3 data-testid="clip-share-moment-heading" className="text-sm font-semibold text-white">
            First share
          </h3>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss first share moment"
          data-testid="clip-share-moment-dismiss"
          className="flex h-[44px] w-[44px] flex-none items-center justify-center rounded-xl text-white/50 transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          <X size={16} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>
      <p data-testid="clip-share-moment-body" className="text-sm font-medium text-white">
        You just shared your progress for the first time.
      </p>
      <p className="mt-1 text-xs leading-relaxed text-white/60">
        That takes real courage. Thank you for letting your journey inspire someone else.
      </p>
    </div>
  );
}

export default ClipShareMoment;
