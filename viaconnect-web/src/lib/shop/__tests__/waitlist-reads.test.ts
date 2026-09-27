/**
 * Own-row waitlist reads. Fixtures are not catalog data.
 * A read error returns an empty id list so the shop still renders.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = {
    rows: [] as { product_id?: unknown }[],
    error: null as { code?: string; message?: string } | null,
    hang: false,
    throwRead: false,
}

vi.mock('@/lib/supabase/server', () => ({
    createClient: async () => ({
        from(table: string) {
            if (table !== 'shop_product_waitlist') {
                throw new Error(`unexpected table ${table}`)
            }
            const promise = state.throwRead
                ? Promise.reject(new Error('network'))
                : state.hang
                  ? new Promise(() => undefined)
                  : Promise.resolve({ data: state.rows, error: state.error })
            return {
                select() {
                    return {
                        then(
                            onFulfilled: (value: unknown) => unknown,
                            onRejected?: (reason: unknown) => unknown,
                        ) {
                            return promise.then(onFulfilled, onRejected)
                        },
                    }
                },
            }
        },
    }),
}))

import { getJoinedWaitlistProductIds } from '@/lib/shop/waitlist'
import { safeLog } from '@/lib/utils/safe-log'

describe('getJoinedWaitlistProductIds', () => {
    beforeEach(() => {
        state.rows = []
        state.error = null
        state.hang = false
        state.throwRead = false
        vi.spyOn(safeLog, 'warn').mockImplementation(() => undefined)
    })

    it('returns the caller product ids and skips blank values', async () => {
        state.rows = [
            { product_id: '22222222-2222-4222-8222-222222222222' },
            { product_id: '' },
            { product_id: 4 },
        ]
        const ids = await getJoinedWaitlistProductIds()
        expect(ids).toEqual(['22222222-2222-4222-8222-222222222222'])
    })

    it('returns an empty list when the read errors, times out, or throws', async () => {
        state.error = { code: '42501', message: 'rls' }
        expect(await getJoinedWaitlistProductIds()).toEqual([])

        vi.useFakeTimers()
        state.error = null
        state.hang = true
        const pending = getJoinedWaitlistProductIds()
        await vi.advanceTimersByTimeAsync(1500)
        expect(await pending).toEqual([])
        vi.useRealTimers()

        state.hang = false
        state.throwRead = true
        expect(await getJoinedWaitlistProductIds()).toEqual([])
    })
})

describe('waitlist module server boundary', () => {
    it('keeps leaveProductWaitlist in a use server module', () => {
        const source = readFileSync(join(process.cwd(), 'src/lib/shop/waitlist.ts'), 'utf8')
        const directive = source.match(/^\s*(?:\/\*\*[\s\S]*?\*\/\s*)?(['"])use server\1/)
        expect(directive).not.toBeNull()
        expect(source).toContain('export async function leaveProductWaitlist')
    })
})
