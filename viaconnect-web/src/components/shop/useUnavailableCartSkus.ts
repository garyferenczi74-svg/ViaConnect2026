'use client'

import { useEffect, useState } from 'react'
import { serverUnavailableCartSkus } from '@/lib/shop/cart-actions'

const DEBOUNCE_MS = 300

export async function fetchUnavailableSkuSet(skus: readonly string[]): Promise<ReadonlySet<string>> {
    try {
        const list = await serverUnavailableCartSkus([...skus])
        return new Set(list)
    } catch {
        return new Set()
    }
}

/**
 * Asks the server which cart SKUs are not purchasable.
 * A lookup error yields an empty set. Checkout still refuses those lines.
 * Works when there is no user id: the release read does not need one.
 */
export function unavailableCartEffect(
    skus: readonly string[],
    enabled: boolean,
    setUnavailable: (next: ReadonlySet<string>) => void,
): () => void {
    if (!enabled || skus.length === 0) {
        setUnavailable(new Set())
        return () => undefined
    }
    let cancelled = false
    const timer = setTimeout(() => {
        void fetchUnavailableSkuSet(skus).then((next) => {
            if (!cancelled) setUnavailable(next)
        })
    }, DEBOUNCE_MS)
    return () => {
        cancelled = true
        clearTimeout(timer)
    }
}

export function useUnavailableCartSkus(
    skus: readonly string[],
    enabled: boolean,
): ReadonlySet<string> {
    const [unavailable, setUnavailable] = useState<ReadonlySet<string>>(new Set())
    const key = skus.join('\n')

    useEffect(() => unavailableCartEffect(skus, enabled, setUnavailable), [enabled, key, skus])

    return unavailable
}
