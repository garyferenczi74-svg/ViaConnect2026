"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, AlertTriangle, X, Loader2 } from "lucide-react";

export interface CheckoutGuardItem {
  sku: string;
  category: string;
  name?: string;
}

export interface MarshallCheckoutGuardProps {
  items: CheckoutGuardItem[];
  userId: string;
  userAge?: number | null;
  hasActivePractitionerLink?: boolean;
  shippingState?: string;
  onAllow: () => void;
  onBlocked?: (modalKey: string) => void;
  children: React.ReactNode;
}

interface ScanResponse {
  blocked: boolean;
  modalKey?: "retatrutide_stacking" | "age_verification" | "practitioner_required" | "restricted_state" | "generic";
  findings: Array<{ ruleId: string; severity: string; message: string; remediation: { summary: string } }>;
}

const MODAL_COPY: Record<string, { title: string; body: string; cta: string }> = {
  retatrutide_stacking: {
    title: "Retatrutide is a monotherapy",
    body: "Your cart includes Retatrutide alongside other peptides. Clinical protocol requires Retatrutide to ship on its own. Please remove the other peptides or swap Retatrutide to continue.",
    cta: "Edit cart",
  },
  age_verification: {
    title: "Age verification required",
    body: "Peptide purchases require age verification (18+, or 21+ for cognitive stimulants). Please complete age verification to continue.",
    cta: "Verify age",
  },
  practitioner_required: {
    title: "Practitioner connection required",
    body: "This protocol requires an active practitioner relationship. Please connect with your practitioner or book a consultation to continue.",
    cta: "Connect with practitioner",
  },
  restricted_state: {
    title: "Shipping restricted in your state",
    body: "One or more items in your cart cannot be shipped to your address. Please remove these items or change the shipping address.",
    cta: "Edit cart",
  },
  generic: {
    title: "Compliance hold",
    body: "Marshall has flagged this order for review. Please update your cart or contact support to continue.",
    cta: "Edit cart",
  },
};

export default function MarshallCheckoutGuard(props: MarshallCheckoutGuardProps) {
  const [scanning, setScanning] = useState(true);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setScanning(true);
      try {
        const r = await fetch("/api/marshall/checkout-scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: props.userId,
            userAge: props.userAge,
            hasActivePractitionerLink: props.hasActivePractitionerLink,
            shippingState: props.shippingState,
            cart: props.items,
          }),
        });
        const data = (await r.json()) as ScanResponse;
        if (!cancelled) {
          setResult(data);
          if (!data.blocked) props.onAllow();
          if (data.blocked && data.modalKey) props.onBlocked?.(data.modalKey);
        }
      } finally {
        if (!cancelled) setScanning(false);
      }
    })();
    return () => { cancelled = true; };
    // Intentionally re-runs when cart or user changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(props.items), props.userId, props.userAge, props.hasActivePractitionerLink, props.shippingState]);

  if (scanning) {
    return (
      <div className="flex items-center gap-2 text-xs text-white/50">
        <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
        Marshall reviewing your cart...
      </div>
    );
  }

  if (result?.blocked && result.modalKey && !dismissed) {
    const copy = MODAL_COPY[result.modalKey];
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="w-full max-w-md bg-[#1E3054] rounded-xl border border-white/[0.08] p-5 shadow-2xl">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-white">{copy.title}</h3>
              <p className="text-xs text-white/60 mt-1">{copy.body}</p>
            </div>
            <button onClick={() => setDismissed(true)} className="text-white/40 hover:text-white/80 p-1" aria-label="Close">
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
          <p className="text-[10px] text-white/30 flex items-center gap-1 mt-3">
            <ShieldCheck className="w-3 h-3" strokeWidth={1.5} />
            Marshall, Compliance Officer, ViaConnect.
          </p>
        </div>
      </div>
    );
  }

  return <>{props.children}</>;
}
