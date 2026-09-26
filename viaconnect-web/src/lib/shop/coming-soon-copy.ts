/**
 * Shopper-facing strings for unreleased supplements.
 * Lex-approved strings are verbatim. Straight apostrophes.
 * No em dash or en dash. No notification or priority wording.
 *
 * {productName} and {productNames} are the catalog name field, verbatim.
 */

export const COMING_SOON_OVERLAY_TEXT = 'Coming soon'

export const JOIN_WAITLIST_LABEL = 'Join the Revolution'

export const JOIN_WAITLIST_ARIA = 'Join the Revolution waiting list for {productName}'

export const JOIN_WAITLIST_PENDING = 'Joining...'

export const JOIN_WAITLIST_JOINED = "You're on the list"

export const JOIN_WAITLIST_JOINED_SR = "You're on the waiting list for {productName}"

export const JOIN_WAITLIST_ERROR = "We couldn't add you to the list. Please try again."

export const JOIN_WAITLIST_SIGNED_OUT = 'Sign in to join the list'

export const CHECKOUT_UNAVAILABLE_ERROR_ONE =
    'This item is not available yet: {productName}. Remove it from your cart to continue.'

export const CHECKOUT_UNAVAILABLE_ERROR_MANY =
    'These items are not available yet: {productNames}. Remove them from your cart to continue.'

export const LEAVE_WAITLIST_LABEL = 'Leave the list'

export const LEAVE_WAITLIST_ARIA = 'Leave the waiting list for {productName}'

export const LEAVE_WAITLIST_PENDING = 'Leaving...'

export const LEAVE_WAITLIST_DONE_SR = 'You left the waiting list for {productName}'

export const LEAVE_WAITLIST_ERROR = "We couldn't remove you from the list. Please try again."

/**
 * PENDING: Lex PASS WITH EDIT + HOLD.
 * Do not render. Ships only after Gary or legal confirms the privacy
 * notice has a matching line. WA MHMDA call is legal's.
 */
export const WAITLIST_PRIVACY_LINE =
    "We use this list only to plan launches. We don't sell it, share it, or use it for ads."

export const CART_LINE_UNAVAILABLE_BADGE = 'Not available yet'

export function applyProductName(template: string, productName: string): string {
    return template.split('{productName}').join(productName)
}

export function checkoutUnavailableError(names: string[]): string {
    if (names.length < 2) {
        return CHECKOUT_UNAVAILABLE_ERROR_ONE.split('{productName}').join(names[0] ?? '')
    }
    return CHECKOUT_UNAVAILABLE_ERROR_MANY.split('{productNames}').join(names.join(', '))
}
