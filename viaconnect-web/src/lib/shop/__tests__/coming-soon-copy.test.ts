/**
 * Lex-approved shopper strings, byte for byte.
 * Dash checks use code points so this file does not add U+2014 or U+2013.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as copy from '@/lib/shop/coming-soon-copy'
import { checkoutUnavailableError } from '@/lib/shop/coming-soon-copy'

const EXPECTED: Record<string, string> = {
    COMING_SOON_OVERLAY_TEXT: 'Coming soon',
    JOIN_WAITLIST_LABEL: 'Join the Revolution',
    JOIN_WAITLIST_ARIA: 'Join the Revolution waiting list for {productName}',
    JOIN_WAITLIST_PENDING: 'Joining...',
    JOIN_WAITLIST_JOINED: "You're on the list",
    JOIN_WAITLIST_JOINED_SR: "You're on the waiting list for {productName}",
    JOIN_WAITLIST_ERROR: "We couldn't add you to the list. Please try again.",
    JOIN_WAITLIST_SIGNED_OUT: 'Sign in to join the list',
    CHECKOUT_UNAVAILABLE_ERROR_ONE:
        'This item is not available yet: {productName}. Remove it from your cart to continue.',
    CHECKOUT_UNAVAILABLE_ERROR_MANY:
        'These items are not available yet: {productNames}. Remove them from your cart to continue.',
    LEAVE_WAITLIST_LABEL: 'Leave the list',
    LEAVE_WAITLIST_ARIA: 'Leave the waiting list for {productName}',
    LEAVE_WAITLIST_PENDING: 'Leaving...',
    LEAVE_WAITLIST_DONE_SR: 'You left the waiting list for {productName}',
    LEAVE_WAITLIST_ERROR: "We couldn't remove you from the list. Please try again.",
    WAITLIST_PRIVACY_LINE:
        "We use this list only to plan launches. We don't sell it, share it, or use it for ads.",
    CART_LINE_UNAVAILABLE_BADGE: 'Not available yet',
}

describe('coming soon copy', () => {
    it('matches each approved string exactly', () => {
        const bag = copy as unknown as Record<string, unknown>
        for (const [key, value] of Object.entries(EXPECTED)) {
            expect(bag[key]).toBe(value)
        }
    })

    it('fills the singular and plural checkout templates', () => {
        expect(checkoutUnavailableError(['A'])).toBe(
            'This item is not available yet: A. Remove it from your cart to continue.',
        )
        expect(checkoutUnavailableError(['A', 'B'])).toBe(
            'These items are not available yet: A, B. Remove them from your cart to continue.',
        )
    })

    it('has no em dash, en dash, or notification wording', () => {
        const em = String.fromCharCode(0x2014)
        const en = String.fromCharCode(0x2013)
        const values = Object.values(copy).filter((value): value is string => typeof value === 'string')
        for (const value of values) {
            expect(value.includes(em)).toBe(false)
            expect(value.includes(en)).toBe(false)
            expect(value).not.toMatch(/notify|we'll email|be first|early access|founder|priority|discount/i)
        }
    })

    it('does not define removed or unused shopper strings', () => {
        const bag = copy as unknown as Record<string, unknown>
        expect(bag.JOIN_WAITLIST_JOINED_HELPER).toBeUndefined()
        expect(bag.STRIPE_PRICE_NOT_AVAILABLE).toBeUndefined()
        expect(bag.CATEGORY_ALL_COMING_SOON).toBeUndefined()
        const source = readFileSync(join(process.cwd(), 'src/lib/shop/coming-soon-copy.ts'), 'utf8')
        expect(source).toContain('PENDING')
        expect(source).not.toContain('JOIN_WAITLIST_JOINED_HELPER')
    })

    it('does not render the pending privacy line', () => {
        const files = [
            'src/components/shop/JoinWaitlistButton.tsx',
            'src/components/shop/ProductCard.tsx',
            'src/components/shop/ProductCard.SupplementBody.tsx',
            'src/components/shop/ProductCard.TestingBody.tsx',
            'src/components/shop/PdpRightRail.tsx',
            'src/components/shop/ComingSoonOverlay.tsx',
            'src/components/shop/CartLineUnavailableBadge.tsx',
        ]
        for (const file of files) {
            const source = readFileSync(join(process.cwd(), file), 'utf8')
            expect(source).not.toContain('WAITLIST_PRIVACY_LINE')
        }
    })
})
