/**
 * Client-side hook that batches a single serverCheckRxEligibility call
 * for the L3/L4 SKUs in the cart and exposes lookup helpers per Prompt
 * #141 v3 Phase F6b.3f2. Used by CartChrome (drawer) and CartPageView
 * (full page) to render the Rx-required / Rx-authorized pill on each
 * L3/L4 cart line without each pill making its own server call.
 *
 * Effect dependency uses a stable sorted SKU key so the same set of
 * SKUs in different orders does not trigger a refetch. When the user
 * signs out or the cart has no L3/L4 lines, the hook returns an
 * isLoaded=true state with an empty map.
 *
 * Errors from serverCheckRxEligibility surface as "no token" entries
 * (the helpers return false for hasToken), keeping the pill conservative.
 * The patient still hits the F6b.3d validateCheckout gate at submit time
 * so this is fail-safe.
 */
'use client'

import { useEffect, useState } from 'react'
import { serverCheckRxEligibility } from '@/lib/prescriptions/patient-actions'

interface RxEligibilityEntry {
    hasToken: boolean
    expiresAt: string | null
    // Phase F6b.3h2: surface remaining capacity so the cart pill can
    // render an amber warning state when the line quantity exceeds the
    // matched token's remaining fills.
    quantityRemaining: number
}

export interface RxEligibilityState {
    isLoaded: boolean
    hasToken: (sku: string) => boolean
    tokenExpiresAt: (sku: string) => string | null
    quantityRemaining: (sku: string) => number
}

export function useRxEligibility(
    rxSkus: string[],
    userId: string | null,
): RxEligibilityState {
    const [data, setData] = useState<Map<string, RxEligibilityEntry>>(new Map())
    const [isLoaded, setIsLoaded] = useState(false)

    const skusKey = [...rxSkus].sort().join(',')

    useEffect(() => {
        if (!userId || rxSkus.length === 0) {
            setData(new Map())
            setIsLoaded(true)
            return
        }
        let cancelled = false
        setIsLoaded(false)
        void (async () => {
            const result = await serverCheckRxEligibility(rxSkus)
            if (cancelled) return
            const next = new Map<string, RxEligibilityEntry>()
            if (result.ok) {
                for (const r of result.rows) {
                    next.set(r.sku, {
                        hasToken: r.hasToken,
                        expiresAt: r.expiresAt,
                        quantityRemaining: r.quantityRemaining,
                    })
                }
            }
            setData(next)
            setIsLoaded(true)
        })()
        return () => {
            cancelled = true
        }
        // skusKey collapses the rxSkus array to a stable string identity so
        // an array reordered but same-content does not refetch.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [skusKey, userId])

    return {
        isLoaded,
        hasToken: (sku) => data.get(sku)?.hasToken === true,
        tokenExpiresAt: (sku) => data.get(sku)?.expiresAt ?? null,
        quantityRemaining: (sku) => data.get(sku)?.quantityRemaining ?? 0,
    }
}
