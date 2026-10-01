/**
 * Early-voter cart math. Display only. Integer cents. One unit.
 * Another promo or Helix makes the line unavailable. Never stacks.
 * Percent comes from the code row and must be 25.
 * Safe to import from client components. No server client.
 */
export type OrderScope = 'first_order' | 'next_order'

export const EARLY_VOTER_UNITS = 1

export interface EarlyVoterCodeRow {
    productId: string
    code: string
    percentOff: number
    expiresAt: string
    redeemedAt: string | null
    orderScope: OrderScope
}

export interface EarlyVoterCartLine {
    sku: string
    productId: string
    unitPriceCents: number
    quantity: number
}

export interface AppliedEarlyVoterLine {
    discountCents: number
    expiresAt: string
    orderScope: OrderScope
    productId: string
}

export function computeEarlyVoterLine(input: {
    enabled: boolean
    code: EarlyVoterCodeRow | null
    line: EarlyVoterCartLine | null
    nowMs: number
    otherOfferApplied: boolean
}): AppliedEarlyVoterLine | null {
    if (!input.enabled || !input.code || !input.line) return null
    if (input.otherOfferApplied) return null
    if (input.code.redeemedAt) return null
    if (input.code.percentOff !== 25) return null
    if (input.code.productId !== input.line.productId) return null
    const expiresMs = Date.parse(input.code.expiresAt)
    if (Number.isNaN(expiresMs) || expiresMs <= input.nowMs) return null
    const discountCents = Math.round((input.line.unitPriceCents * input.code.percentOff) / 100)
    if (!Number.isInteger(discountCents)) return null
    return {
        discountCents,
        expiresAt: input.code.expiresAt,
        orderScope: input.code.orderScope,
        productId: input.code.productId,
    }
}

export interface EarlyVoterDisplayRow {
    kind: 'applied' | 'unavailable'
    productId: string
    discountCents: number | null
    expiresAt: string
    orderScope: OrderScope
}

export function listEarlyVoterRows(input: {
    enabled: boolean
    codes: readonly EarlyVoterCodeRow[]
    lines: readonly EarlyVoterCartLine[]
    nowMs: number
    otherOfferApplied: boolean
}): EarlyVoterDisplayRow[] {
    if (!input.enabled) return []
    const rows: EarlyVoterDisplayRow[] = []
    for (const line of input.lines) {
        const code = input.codes.find((item) => item.productId === line.productId) ?? null
        if (!code) continue
        if (input.otherOfferApplied) {
            const would = computeEarlyVoterLine({
                enabled: true,
                code,
                line,
                nowMs: input.nowMs,
                otherOfferApplied: false,
            })
            if (!would) continue
            rows.push({
                kind: 'unavailable',
                productId: line.productId,
                discountCents: null,
                expiresAt: would.expiresAt,
                orderScope: would.orderScope,
            })
            continue
        }
        const applied = computeEarlyVoterLine({
            enabled: true,
            code,
            line,
            nowMs: input.nowMs,
            otherOfferApplied: false,
        })
        if (!applied) continue
        rows.push({
            kind: 'applied',
            productId: applied.productId,
            discountCents: applied.discountCents,
            expiresAt: applied.expiresAt,
            orderScope: applied.orderScope,
        })
    }
    return rows
}
