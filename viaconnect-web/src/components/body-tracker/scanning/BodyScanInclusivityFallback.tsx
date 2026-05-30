'use client';

// BodyScanInclusivityFallback.tsx  (Prompt #169b, Task 19, spec section 7.3 / 7.4)
//
// A small, kind "I can't do this pose" affordance shown on EVERY capture step.
// Tapping it opens an honest, non-clinical message: the current Body Scan needs a
// standing A-pose with both arms outstretched, we are working to support more body
// types and capture positions, and in the meantime a practitioner can run a manual
// body composition assessment that we will fold into the user's tracking. Plus a
// "notify me when expanded scanning is available" action that writes to
// body_scan_inclusivity_waitlist (UNIQUE user_id, upsert-on-conflict-do-nothing).
//
// The Phase 2 roadmap (seated / single-arm / single-leg capture modes) is
// documentation only (docs/roadmap/body-scan-inclusivity-roadmap.md); no code for
// those modes exists yet, so the in-flow copy is honest about the present state.
//
// Renders as a plain inline link (the trigger) plus its own Radix dialog that
// stacks ABOVE the capture modal (z-[70]/[71] over the capture modal's z-[60]/[61]).
// Lucide icons at strokeWidth 1.5; copy punctuation is commas/colons only (no
// dashes); no emojis; responsive.

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Accessibility, Bell, Check, Loader2, X } from 'lucide-react';
import { useBodyScanInclusivityWaitlist } from '@/hooks/body-tracker/useBodyScanInclusivityWaitlist';

interface BodyScanInclusivityFallbackProps {
  // The capture step this link sits on, recorded as the requested_capability so
  // we know which positions users most need. Optional per §7.4 (a bare opt-in is
  // allowed); when omitted the waitlist row stores a null capability.
  requestedCapability?: 'seated' | 'single_arm' | 'single_leg' | 'other' | null;
  className?: string;
}

// Product copy (§7.3), authored here: honest, kind, non-clinical. No dashes.
const FALLBACK_TITLE = 'Trouble with this pose?';
const FALLBACK_BODY_PRIMARY =
  'Right now, Via Cura Body Scan requires a standing A-pose with both arms outstretched. We are working to expand support for more body types and capture positions in a future release.';
const FALLBACK_BODY_SECONDARY =
  'In the meantime, your practitioner can run a manual body composition assessment that we will include in your tracking. We will let you know when expanded scanning is available.';
const NOTIFY_CTA = 'Notify me when expanded scanning is available';
const JOINED_CONFIRMATION =
  'You are on the list. We will let you know when expanded scanning is available.';

export function BodyScanInclusivityFallback({
  requestedCapability = null,
  className = '',
}: BodyScanInclusivityFallbackProps) {
  const [open, setOpen] = useState(false);
  const { alreadyJoined, joinWaitlist } = useBodyScanInclusivityWaitlist();
  const [submitting, setSubmitting] = useState(false);
  const [justJoined, setJustJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const joined = alreadyJoined || justJoined;

  async function handleNotify() {
    setSubmitting(true);
    setError(null);
    const ok = await joinWaitlist({ requestedCapability });
    setSubmitting(false);
    if (ok) {
      setJustJoined(true);
    } else {
      setError('We could not add you to the list just now. Please try again in a moment.');
    }
  }

  return (
    <>
      {/* The trigger: a quiet, kind inline link on every capture step. */}
      <button
        type="button"
        data-testid="inclusivity-fallback-link"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 text-xs font-medium text-white/55 hover:text-white/80 underline underline-offset-2 decoration-white/25 transition-colors min-h-[44px] ${className}`}
      >
        <Accessibility className="h-3.5 w-3.5" strokeWidth={1.5} />
        I can&apos;t do this pose
      </button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <AnimatePresence>
          {open && (
            <Dialog.Portal forceMount>
              {/* Stacks ABOVE the capture modal (z-[60]/[61]). */}
              <Dialog.Overlay asChild>
                <motion.div
                  className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                />
              </Dialog.Overlay>
              <Dialog.Content asChild>
                <motion.div
                  className="fixed z-[71] flex flex-col overflow-hidden border shadow-2xl rounded-2xl
                             left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                             w-[calc(100vw-1.5rem)] max-w-md max-h-[calc(100vh-2rem)]
                             sm:w-full sm:max-h-[88vh]"
                  style={{ background: '#111827', borderColor: 'rgba(255,255,255,0.08)' }}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  {/* Header */}
                  <div
                    className="flex items-start justify-between gap-4 px-4 pt-3 pb-4 sm:px-6 sm:pt-6"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-[#2DA5A0]/15">
                        <Accessibility className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
                      </div>
                      <Dialog.Title className="text-base sm:text-lg font-semibold text-white">
                        {FALLBACK_TITLE}
                      </Dialog.Title>
                    </div>
                    <Dialog.Close
                      aria-label="Close"
                      className="flex items-center justify-center rounded-lg text-white/55 hover:text-white hover:bg-white/[0.06] transition-colors min-h-[44px] min-w-[44px]"
                    >
                      <X className="h-5 w-5" strokeWidth={1.5} />
                    </Dialog.Close>
                  </div>

                  {/* Body */}
                  <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 space-y-3">
                    <Dialog.Description className="text-sm leading-relaxed text-white/75">
                      {FALLBACK_BODY_PRIMARY}
                    </Dialog.Description>
                    <p className="text-sm leading-relaxed text-white/75">
                      {FALLBACK_BODY_SECONDARY}
                    </p>

                    {joined ? (
                      <div className="flex items-start gap-2.5 rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 p-3.5">
                        <Check className="h-4 w-4 flex-none text-[#2DA5A0] mt-0.5" strokeWidth={1.5} />
                        <p className="text-sm text-[#9FE6E2]">{JOINED_CONFIRMATION}</p>
                      </div>
                    ) : (
                      <>
                        {error && <p className="text-xs text-[#FCA5A5]">{error}</p>}
                        <button
                          type="button"
                          data-testid="inclusivity-notify-button"
                          onClick={handleNotify}
                          disabled={submitting}
                          className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#2DA5A0]/40 bg-[#2DA5A0]/20 px-5 py-2.5 text-sm font-semibold text-[#2DA5A0] hover:bg-[#2DA5A0]/30 min-h-[44px] disabled:opacity-50"
                        >
                          {submitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                          ) : (
                            <Bell className="h-4 w-4" strokeWidth={1.5} />
                          )}
                          {NOTIFY_CTA}
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>
    </>
  );
}
