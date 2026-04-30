/**
 * Per-cart-line Rx pill per Prompt #141 v3 Phase F6b.3f2, extended in
 * F6b.3h2 with a capacity-warning state for multi-quantity cart lines.
 * Shown on L3/L4 cart lines (`pricingTier` of L3 or L4) to surface
 * prescription eligibility status before the patient reaches checkout.
 * Renders one of five states:
 *
 *   - Not L3/L4 → null (pill is hidden for L1/L2 lines)
 *   - Anonymous (userId null) → amber "Rx required, sign in to verify"
 *     because eligibility lookup needs auth.uid()
 *   - Authenticated, eligibility loading → neutral "Checking prescription"
 *   - Authenticated, hasToken=false → red "Prescription required" with
 *     "Find a practitioner" link
 *   - Authenticated, hasToken=true, lineQuantity > quantityRemaining →
 *     amber "N refills remaining, reduce quantity" (F6b.3h2: relaxes
 *     the F6b.3d quantity-1 cap by giving multi-quantity feedback)
 *   - Authenticated, hasToken=true, capacity OK → teal "Prescription on file"
 *
 * The pill is informational; the F6b.3h validateCheckout capacity check
 * is the hard wall that prevents an L3/L4 line with insufficient token
 * capacity from reaching Stripe Checkout.
 */
'use client'

import Link from 'next/link'
import { CheckCircle2, Pill, ShieldAlert } from 'lucide-react'

interface CartLineRxPillProps {
    pricingTier: string | null
    userId: string | null
    isLoaded: boolean
    hasToken: boolean
    quantityRemaining: number
    lineQuantity: number
}

export function CartLineRxPill({
    pricingTier,
    userId,
    isLoaded,
    hasToken,
    quantityRemaining,
    lineQuantity,
}: CartLineRxPillProps) {
    if (pricingTier !== 'L3' && pricingTier !== 'L4') {
        return null
    }
    if (!userId) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-200 ring-1 ring-amber-400/30">
                <Pill className="h-3 w-3" strokeWidth={1.75} />
                Rx required, sign in to verify
            </span>
        )
    }
    if (!isLoaded) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/60 ring-1 ring-white/15">
                <Pill className="h-3 w-3" strokeWidth={1.75} />
                Checking prescription
            </span>
        )
    }
    if (hasToken) {
        if (lineQuantity > quantityRemaining) {
            const refillLabel = quantityRemaining === 1 ? 'refill' : 'refills'
            return (
                <span className="inline-flex flex-wrap items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-200 ring-1 ring-amber-400/30">
                    <Pill className="h-3 w-3" strokeWidth={1.75} />
                    {quantityRemaining} {refillLabel} remaining, reduce quantity
                </span>
            )
        }
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#2DA5A0]/15 px-2 py-0.5 text-[10px] text-[#2DA5A0] ring-1 ring-[#2DA5A0]/30">
                <CheckCircle2 className="h-3 w-3" strokeWidth={1.75} />
                Prescription on file
            </span>
        )
    }
    return (
        <span className="inline-flex flex-wrap items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] text-red-200 ring-1 ring-red-400/30">
            <ShieldAlert className="h-3 w-3" strokeWidth={1.75} />
            Prescription required.
            <Link
                href="/practitioners"
                className="underline-offset-2 hover:underline"
            >
                Find a practitioner
            </Link>
        </span>
    )
}
