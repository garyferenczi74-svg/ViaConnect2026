import { describe, expect, it } from 'vitest'
import { visiblePairings } from '@/lib/shop/launch-vote/email/content'
import { renderSubscriberWeekly, renderVoteConfirmation } from '@/lib/shop/launch-vote/email/templates'
import { EMAIL_CODE_DAY } from '@/lib/shop/launch-vote-copy'

describe('launch vote email templates', () => {
    it('escapes names and omits approved blocks when content is null', () => {
        const rendered = renderSubscriberWeekly({
            postal: 'Postal line',
            unsubscribeUrl: 'https://example.test/unsub?token=abc',
            products: [
                {
                    productName: 'NAD+ <script>',
                    imageUrl: null,
                    productUrl: 'https://example.test/shop/product/nad',
                    voted: false,
                    releaseDate: null,
                    approved: null,
                    orderScope: null,
                },
            ],
        })
        expect(rendered.html).toContain('NAD+ &lt;script&gt;')
        expect(rendered.html).not.toContain('<script>')
        expect(rendered.html).toContain('Unsubscribe')
        expect(rendered.html).not.toContain(EMAIL_CODE_DAY)
        expect(rendered.text).not.toContain('placeholder')
    })

    it('includes terms and the code-day line only for a vote', () => {
        const rendered = renderVoteConfirmation({
            productName: 'RISE+',
            productUrl: 'https://example.test/p',
            orderScope: 'next_order',
            postal: 'Postal line',
            unsubscribeUrl: 'https://example.test/unsub',
        })
        expect(rendered.html).toContain(EMAIL_CODE_DAY)
        expect(rendered.html).toContain('your next order')
        expect(rendered.html).not.toMatch(/[\u2013\u2014]/)
    })

    it('keeps pairings to released products outside a protocol and not a competitor', () => {
        const visible = visiblePairings([
            { name: 'Released', released: true, inProtocol: false, competitor: false },
            { name: 'Held', released: false, inProtocol: false, competitor: false },
            { name: 'Protocol', released: true, inProtocol: true, competitor: false },
            { name: 'Other brand', released: true, inProtocol: false, competitor: true },
        ])
        expect(visible.map((row) => row.name)).toEqual(['Released'])
    })
})
