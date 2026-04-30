/**
 * /shop/checkout multi-step checkout page per Prompt #141 v3 §5.5.
 * Server route, fetches session, mounts <CheckoutFlow />. Stripe handles
 * the payment step on its hosted page; success URL points back to
 * /shop/checkout/success which finalizes the order in our DB.
 */
import { CheckoutFlow } from '@/components/shop/CheckoutFlow'
import { getCurrentShopSession, isConsumerSession } from '@/lib/shop/role'

export const metadata = {
    title: 'Checkout | Via Cura',
    description: 'Complete your Via Cura purchase. Secured by Stripe.',
}

export default async function CheckoutPage() {
    const session = await getCurrentShopSession()
    const consumerSession = isConsumerSession(session.role)
    return <CheckoutFlow consumerSession={consumerSession} userId={session.userId} />
}
