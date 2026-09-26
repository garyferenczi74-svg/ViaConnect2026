'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { PLP_PRODUCTS_TRY_AGAIN_LABEL } from '@/lib/shop/plp-copy'

interface PlpProductsRetryControlProps {
    isPending: boolean
    onRetry: () => void
}

export function PlpProductsRetryControl({ isPending, onRetry }: PlpProductsRetryControlProps) {
    return (
        <button
            type="button"
            data-testid="plp-products-retry"
            data-pending={isPending ? 'true' : 'false'}
            aria-busy={isPending}
            disabled={isPending}
            onClick={onRetry}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-[#1E3054] px-4 py-2 text-base font-semibold text-white/80 transition-colors hover:border-white/35 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
            <RefreshCw
                className={`h-4 w-4 shrink-0 ${isPending ? 'animate-spin motion-reduce:animate-none' : ''}`}
                strokeWidth={1.5}
                aria-hidden="true"
            />
            {PLP_PRODUCTS_TRY_AGAIN_LABEL}
        </button>
    )
}

export function PlpProductsRetryButton() {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    return (
        <PlpProductsRetryControl
            isPending={isPending}
            onRetry={() => {
                startTransition(() => {
                    router.refresh()
                })
            }}
        />
    )
}
