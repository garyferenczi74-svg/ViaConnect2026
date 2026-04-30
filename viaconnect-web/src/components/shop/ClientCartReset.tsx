/**
 * ClientCartReset clears the client-side localStorage cart on mount.
 * Mounted only on /shop/checkout/success after a successful order
 * finalization. The server-side cart was already cleared by
 * finalizeShopOrder; this clears the local mirror.
 */
'use client'

import { useEffect } from 'react'
import { clearCart } from '@/lib/shop/cart-store'

export function ClientCartReset() {
    useEffect(() => {
        clearCart()
    }, [])
    return null
}
