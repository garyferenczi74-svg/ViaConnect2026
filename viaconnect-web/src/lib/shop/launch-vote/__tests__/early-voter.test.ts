import { describe, expect, it } from 'vitest'
import { computeEarlyVoterLine, listEarlyVoterRows, type EarlyVoterCodeRow } from '@/lib/shop/launch-vote/early-voter-math'

const NOW = Date.parse('2026-10-02T00:00:00.000Z')

function code(partial: Partial<EarlyVoterCodeRow> = {}): EarlyVoterCodeRow {
    return {
        productId: 'p1',
        code: 'EV-ABC',
        percentOff: 25,
        expiresAt: '2026-10-08T00:00:00.000Z',
        redeemedAt: null,
        orderScope: 'first_order',
        ...partial,
    }
}

describe('computeEarlyVoterLine', () => {
    it('rounds integer cents for one unit and ignores quantity', () => {
        const line = computeEarlyVoterLine({
            enabled: true,
            code: code(),
            line: { sku: 'SKU', productId: 'p1', unitPriceCents: 1999, quantity: 4 },
            nowMs: NOW,
            otherOfferApplied: false,
        })
        expect(line?.discountCents).toBe(500)
    })

    it('returns null when another offer is applied, the code expired, or the flag is off', () => {
        const base = {
            enabled: true,
            code: code(),
            line: { sku: 'SKU', productId: 'p1', unitPriceCents: 1000, quantity: 1 },
            nowMs: NOW,
        }
        expect(computeEarlyVoterLine({ ...base, otherOfferApplied: true })).toBeNull()
        expect(
            computeEarlyVoterLine({
                ...base,
                otherOfferApplied: false,
                code: code({ expiresAt: '2026-10-01T00:00:00.000Z' }),
            }),
        ).toBeNull()
        expect(computeEarlyVoterLine({ ...base, enabled: false, otherOfferApplied: false })).toBeNull()
        expect(listEarlyVoterRows({ ...base, codes: [code()], lines: [base.line], otherOfferApplied: false, enabled: false })).toEqual([])
    })

    it('shows unavailable instead of stacking', () => {
        const rows = listEarlyVoterRows({
            enabled: true,
            codes: [code()],
            lines: [{ sku: 'SKU', productId: 'p1', unitPriceCents: 1000, quantity: 1 }],
            nowMs: NOW,
            otherOfferApplied: true,
        })
        expect(rows).toEqual([
            {
                kind: 'unavailable',
                productId: 'p1',
                discountCents: null,
                expiresAt: '2026-10-08T00:00:00.000Z',
                orderScope: 'first_order',
            },
        ])
    })
})
