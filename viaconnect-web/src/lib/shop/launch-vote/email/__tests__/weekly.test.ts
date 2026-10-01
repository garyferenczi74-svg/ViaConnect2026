import { afterEach, describe, expect, it } from 'vitest'
import { isoWeekPeriodKey, parseAdminDigestRecipients, planWeeklyUserSends, runLaunchVoteWeekly } from '@/lib/shop/launch-vote/email/weekly'

afterEach(() => {
    delete process.env.LAUNCH_VOTE_EMAILS_ENABLED
    delete process.env.LAUNCH_VOTE_ADMIN_DIGEST_TO
})

describe('weekly launch vote mail', () => {
    it('uses the ISO week of Monday 5 Oct 2026', () => {
        expect(isoWeekPeriodKey(new Date('2026-10-05T15:00:00.000Z'))).toBe('2026-W41')
    })

    it('reads admin recipients from the env list only', () => {
        expect(parseAdminDigestRecipients(undefined)).toEqual([])
        expect(parseAdminDigestRecipients('a@example.test, a@example.test, b@example.test')).toEqual([
            'a@example.test',
            'b@example.test',
        ])
    })

    it('skips a user already sent for the period', () => {
        const planned = planWeeklyUserSends({
            alreadySentUserIds: new Set(['u1']),
            rows: [
                {
                    userId: 'u1',
                    email: 'a@example.test',
                    productId: 'p1',
                    productName: 'NAD+',
                    imageUrl: null,
                    productPath: '/shop/product/nad',
                    voted: true,
                    releaseDate: null,
                    orderScope: 'first_order',
                },
                {
                    userId: 'u2',
                    email: '',
                    productId: 'p1',
                    productName: 'NAD+',
                    imageUrl: null,
                    productPath: '/shop/product/nad',
                    voted: false,
                    releaseDate: null,
                    orderScope: null,
                },
            ],
        })
        expect(planned).toEqual([])
    })

    it('returns flag_off before database or network work', async () => {
        const result = await runLaunchVoteWeekly(new Date('2026-10-05T15:00:00.000Z'))
        expect(result).toEqual({ skipped: 'flag_off' })
    })
})
