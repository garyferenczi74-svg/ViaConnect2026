'use client';

// BodyScanResourceCard.tsx  (Prompt #169b, Task 16, spec section 3.2.5)
//
// A NON-intrusive support resource card. It is NEVER a popup and NEVER
// interrupts: it renders inline at the BOTTOM of the Insights surface, only when
// one of the four trigger conditions is met (rapid body-fat loss over 3 scans;
// repeated scan-frequency attempts; body fat at/below the clinical threshold for
// age/sex; a disclosed past disordered-eating history). The trigger DECISION is
// the pure module decideResourceCard; this component only renders the outcome.
//
// CONTENT: informational + a professional-support pointer + the helpline contact
// ONLY. NO specific guidance, NO numbers, NO step-by-step. Every string is a
// clearly-marked PLACEHOLDER from body-scan-copy-slots.ts (clinician-gated). The
// helpline contact is a single config slot (also TODO-marked for confirmation).
//
// DISMISSIBILITY: when the user's resource-card persistence is 'dismissible'
// (seeded for in_the_past / prefer_not_to_say), a dismiss control is offered and
// the card hides for the session once dismissed. When 'persistent' (seeded for
// the 'currently' response) no dismiss is offered. The card never re-grabs focus.
//
// Lucide strokeWidth 1.5; commas/colons only (no dashes); responsive.

import { useEffect, useRef, useState } from 'react';
import { LifeBuoy, X, ExternalLink } from 'lucide-react';
import {
  decideResourceCard,
  type ResourceCardTriggerInput,
  type ResourceCardPersistence,
} from '@/lib/body-tracker/disordered-eating-safeguard';
import { trackResourceCardViewed } from '@/lib/body-tracker/scan-analytics';
import {
  RESOURCE_CARD_TITLE_SLOT,
  RESOURCE_CARD_BODY_SLOT,
  RESOURCE_CARD_DISMISS_LABEL_SLOT,
  HELPLINE_CONTACT_SLOT,
} from '@/lib/body-tracker/body-scan-copy-slots';

interface BodyScanResourceCardProps {
  // The signals that drive the four trigger conditions (section 3.2.5).
  trigger: ResourceCardTriggerInput;
  // How the card behaves for this user (from the response-adaptive default).
  // 'persistent' offers no dismiss; 'dismissible' does; 'none' hides the card
  // unless a non-history condition independently triggers it.
  persistence?: ResourceCardPersistence;
  className?: string;
}

export function BodyScanResourceCard({
  trigger,
  persistence = 'none',
  className = '',
}: BodyScanResourceCardProps) {
  const [dismissed, setDismissed] = useState(false);

  const decision = decideResourceCard(trigger);

  // Analytics (§14): the support resource card was shown. resource_type is a
  // COARSE trigger family only ('clinical' / 'behavioral'), NEVER the disordered-
  // eating response, a body-fat value, or any sensitive signal. Fires once when
  // the card first becomes visible. Computed before the early returns so the
  // hook order is stable.
  const reportedRef = useRef(false);
  useEffect(() => {
    if (!decision.show || reportedRef.current) return;
    reportedRef.current = true;
    // Map the (internal) reasons to a coarse, non-sensitive category. We do NOT
    // emit which exact condition fired in a way that reveals the response: a
    // clinical-threshold or rapid-loss trigger is 'clinical'; the rest 'support'.
    const resourceType =
      decision.reasons.bodyFatBelowThreshold || decision.reasons.rapidBodyFatLoss
        ? 'clinical'
        : 'support';
    trackResourceCardViewed({ resource_type: resourceType });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decision.show]);

  if (!decision.show) return null;
  if (dismissed) return null;

  // Only a 'dismissible' card offers the dismiss control. A 'persistent' card
  // (currently-disclosed history) is never dismissible. A 'none' card that is
  // showing only because of a non-history condition is treated as dismissible.
  const canDismiss = persistence !== 'persistent';

  const helpline = HELPLINE_CONTACT_SLOT;

  return (
    <aside
      data-testid="body-scan-resource-card"
      // Non-intrusive: inline region, not a dialog. Polite live region so a
      // screen reader announces it without stealing focus.
      role="region"
      aria-label="Support resources"
      aria-live="polite"
      className={`rounded-2xl border border-[#2DA5A0]/25 bg-[#2DA5A0]/[0.06] p-5 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-[#2DA5A0]/15">
          <LifeBuoy className="h-4.5 w-4.5 text-[#2DA5A0]" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          {/* TODO(clinician): supportive, non-prescriptive title + body (slots). */}
          <p className="text-sm font-semibold text-white">{RESOURCE_CARD_TITLE_SLOT}</p>
          <p className="mt-1 text-xs leading-relaxed text-white/65">{RESOURCE_CARD_BODY_SLOT}</p>

          {/* Helpline / professional-support pointer (single config slot). */}
          <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
            {/* TODO(clinician): confirm helpline name + phone + hours + url + cta. */}
            <p className="text-xs font-semibold text-white/85">{helpline.nameSlot}</p>
            <p className="mt-0.5 text-xs text-white/60">{helpline.phoneSlot}</p>
            <p className="mt-0.5 text-[11px] text-white/45">{helpline.hoursSlot}</p>
            <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#2DA5A0]">
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
              {helpline.ctaLabelSlot}
            </span>
          </div>
        </div>

        {canDismiss && (
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label={RESOURCE_CARD_DISMISS_LABEL_SLOT}
            className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-white/[0.06] text-white/45 hover:bg-white/[0.12]"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        )}
      </div>
    </aside>
  );
}
