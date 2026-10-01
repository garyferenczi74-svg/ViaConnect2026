import { afterEach, describe, expect, it } from 'vitest'
import {
    earlyVoterDiscountEnabled,
    launchVoteEmailsEnabled,
    launchVoteEnabled,
} from '@/lib/shop/launch-vote/flags'

const KEYS = ['LAUNCH_VOTE_ENABLED', 'LAUNCH_VOTE_EMAILS_ENABLED', 'EARLY_VOTER_DISCOUNT_ENABLED'] as const

afterEach(() => {
    for (const key of KEYS) delete process.env[key]
})

describe('launch vote flags', () => {
    it('defaults off unless the value is the literal true', () => {
        expect(launchVoteEnabled()).toBe(false)
        expect(launchVoteEmailsEnabled()).toBe(false)
        expect(earlyVoterDiscountEnabled()).toBe(false)
        process.env.LAUNCH_VOTE_ENABLED = 'TRUE'
        process.env.LAUNCH_VOTE_EMAILS_ENABLED = '1'
        process.env.EARLY_VOTER_DISCOUNT_ENABLED = 'yes'
        expect(launchVoteEnabled()).toBe(false)
        expect(launchVoteEmailsEnabled()).toBe(false)
        expect(earlyVoterDiscountEnabled()).toBe(false)
        process.env.LAUNCH_VOTE_ENABLED = 'true'
        process.env.LAUNCH_VOTE_EMAILS_ENABLED = 'true'
        process.env.EARLY_VOTER_DISCOUNT_ENABLED = 'true'
        expect(launchVoteEnabled()).toBe(true)
        expect(launchVoteEmailsEnabled()).toBe(true)
        expect(earlyVoterDiscountEnabled()).toBe(true)
    })
})
