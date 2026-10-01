import { afterEach, describe, expect, it } from 'vitest'
import { sendLaunchEmail } from '@/lib/shop/launch-vote/email/send'

const KEYS = [
    'LAUNCH_VOTE_EMAILS_ENABLED',
    'SENDGRID_API_KEY',
    'LAUNCH_VOTE_EMAIL_POSTAL_ADDRESS',
    'SENDGRID_FROM_EMAIL',
] as const

afterEach(() => {
    for (const key of KEYS) delete process.env[key]
})

const input = {
    to: 'person@example.test',
    subject: 'Subject',
    html: '<p>Hi</p>',
    text: 'Hi',
    userId: '11111111-1111-4111-8111-111111111111',
}

describe('sendLaunchEmail', () => {
    it('skips before a fetch when the email flag is off', async () => {
        let called = false
        const result = await sendLaunchEmail(input, {
            fetchImpl: async () => {
                called = true
                return new Response(null, { status: 202 })
            },
        })
        expect(result).toEqual({ status: 'skipped', reason: 'flag_off' })
        expect(called).toBe(false)
    })

    it('skips with no provider when the key is missing and does not fetch', async () => {
        process.env.LAUNCH_VOTE_EMAILS_ENABLED = 'true'
        let called = false
        const result = await sendLaunchEmail(input, {
            fetchImpl: async () => {
                called = true
                return new Response(null, { status: 202 })
            },
        })
        expect(result).toEqual({ status: 'skipped', reason: 'no_provider' })
        expect(called).toBe(false)
    })

    it('skips when the postal address is missing', async () => {
        process.env.LAUNCH_VOTE_EMAILS_ENABLED = 'true'
        process.env.SENDGRID_API_KEY = 'key'
        const result = await sendLaunchEmail(input, {
            fetchImpl: async () => new Response(null, { status: 202 }),
        })
        expect(result).toEqual({ status: 'skipped', reason: 'no_postal_address' })
    })

    it('skips an opted-out subscriber before fetch', async () => {
        process.env.LAUNCH_VOTE_EMAILS_ENABLED = 'true'
        process.env.SENDGRID_API_KEY = 'key'
        process.env.LAUNCH_VOTE_EMAIL_POSTAL_ADDRESS = '1 Main'
        process.env.SENDGRID_FROM_EMAIL = 'news@example.test'
        let called = false
        const result = await sendLaunchEmail(input, {
            isOptedOut: async () => true,
            fetchImpl: async () => {
                called = true
                return new Response(null, { status: 202 })
            },
        })
        expect(result).toEqual({ status: 'skipped', reason: 'opt_out' })
        expect(called).toBe(false)
    })
})
