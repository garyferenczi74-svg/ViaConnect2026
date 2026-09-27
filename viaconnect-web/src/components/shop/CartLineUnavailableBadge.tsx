import { CART_LINE_UNAVAILABLE_BADGE } from '@/lib/shop/coming-soon-copy'

/** Small rose alert on a cart line that checkout will refuse. The line stays removable. */
export function CartLineUnavailableBadge() {
    return (
        <span className="mt-1 inline-flex w-fit items-center rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-100">
            {CART_LINE_UNAVAILABLE_BADGE}
        </span>
    )
}
