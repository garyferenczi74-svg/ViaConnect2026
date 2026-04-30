/**
 * /shop/cart full cart page per Prompt #141 v3 §5.4. Server route that
 * resolves the shop session (role + userId) and mounts the client-side
 * <CartPageView /> with the appropriate gating props. CartChrome is
 * deliberately NOT mounted on this route to avoid double-mounting useCart
 * with userId, which would trigger two simultaneous serverInitialSync
 * calls and risk a write race.
 */
import { CartPageView } from '@/components/shop/CartPageView'
import { getCurrentShopSession, isConsumerSession } from '@/lib/shop/role'

export const metadata = {
    title: 'Cart | Via Cura',
    description:
        'Review your Via Cura cart, apply Helix tokens or a promo code, and proceed to checkout.',
}

export default async function CartPage() {
    const session = await getCurrentShopSession()
    const consumerSession = isConsumerSession(session.role)
    return <CartPageView consumerSession={consumerSession} userId={session.userId} />
}
