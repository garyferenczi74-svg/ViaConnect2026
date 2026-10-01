import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
    EMAIL_CODE_DAY,
    LAUNCH_CONFIRM_BODY,
    LAUNCH_CONFIRM_TITLE,
    LAUNCH_PILL_HOVER,
    LAUNCH_PILL_REST,
    LAUNCH_TERMS_LINE_FIRST,
    LAUNCH_TERMS_LINE_NEXT,
    LAUNCH_TERMS_LINE_UNKNOWN,
    SHOP_CONTROL_JOIN,
    SHOP_CONTROL_PURCHASE,
    SHOP_CONTROL_VOTE,
    launchTermsLine,
} from '@/lib/shop/launch-vote-copy'
import { JOIN_WAITLIST_LABEL } from '@/lib/shop/coming-soon-copy'

describe('launch vote copy', () => {
    it('keeps the three control roles and does not call Join a vote or a purchase', () => {
        expect(SHOP_CONTROL_JOIN).toContain('email sign-up only')
        expect(SHOP_CONTROL_JOIN).toContain('not a vote')
        expect(SHOP_CONTROL_JOIN).toContain('not a purchase')
        expect(SHOP_CONTROL_PURCHASE).toContain('purchase button only')
        expect(SHOP_CONTROL_VOTE).toContain('vote control only')
        expect(SHOP_CONTROL_VOTE).toContain('does not replace Join the Revolution')
        expect(JOIN_WAITLIST_LABEL).toBe('Join the Revolution')
        expect(launchTermsLine(null)).toBe(LAUNCH_TERMS_LINE_UNKNOWN)
        expect(launchTermsLine(false)).toBe(LAUNCH_TERMS_LINE_FIRST)
        expect(launchTermsLine(true)).toBe(LAUNCH_TERMS_LINE_NEXT)
        expect(LAUNCH_PILL_REST).toBe('Launching Soon')
        expect(LAUNCH_PILL_HOVER).toBe('Vote for the next product launch')
        expect(LAUNCH_CONFIRM_TITLE).toBe('Vote for {productName}?')
        expect(LAUNCH_CONFIRM_BODY).toBe("One vote per product. Votes can't be undone.")
        expect(EMAIL_CODE_DAY).toBe('Your 25% code will be emailed the day this product releases.')
    })

    it('has no em dash, en dash, or emoji in the copy module', () => {
        const source = readFileSync(join(process.cwd(), 'src/lib/shop/launch-vote-copy.ts'), 'utf8')
        expect(source).not.toMatch(/[\u2013\u2014]/)
        expect(source).not.toMatch(/\p{Extended_Pictographic}/u)
    })

    it('does not describe Join the Revolution as a vote in the button source', () => {
        const button = readFileSync(join(process.cwd(), 'src/components/shop/JoinWaitlistButton.tsx'), 'utf8')
        expect(button).toContain('EMAIL SIGN-UP ONLY')
        expect(button).toContain('Not a vote and not a purchase')
        expect(button).not.toContain('Vote for the next product launch')
    })
})
