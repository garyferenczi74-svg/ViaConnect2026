/**
 * /api/shop/waitlist join and leave. Fixtures are not catalog data.
 * 42P01 is the existing 500 SERVER_ERROR.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const PRODUCT_ID = '22222222-2222-4222-8222-222222222222'

const upserts: { values: unknown; options: unknown }[] = []
const deleteEqs: { column: string; value: string }[] = []

const state = {
    user: { id: USER_ID } as { id: string } | null,
    authHang: false,
    authThrow: false,
    authError: null as { message: string } | null,
    getUserCalls: 0,
    product: null as Record<string, unknown> | null,
    productError: null as { code: string; message?: string } | null,
    productHang: false,
    phaseError: null as { code: string; message?: string } | null,
    phases: [] as { id: string; activation_status: string }[],
    upsertError: null as { code: string; message?: string } | null,
    upsertHang: false,
    deleteError: null as { code: string; message?: string } | null,
    deleteHang: false,
}

function resetState() {
    state.user = { id: USER_ID }
    state.authHang = false
    state.authThrow = false
    state.authError = null
    state.getUserCalls = 0
    state.product = null
    state.productError = null
    state.productHang = false
    state.phaseError = null
    state.phases = []
    state.upsertError = null
    state.upsertHang = false
    state.deleteError = null
    state.deleteHang = false
    upserts.length = 0
    deleteEqs.length = 0
}

vi.mock('@/lib/supabase/server', () => ({
    createClient: async () => ({
        auth: {
            getUser: async () => {
                state.getUserCalls += 1
                if (state.authHang) return new Promise(() => undefined)
                if (state.authThrow) throw new Error('network')
                if (state.authError) {
                    return { data: { user: null }, error: state.authError }
                }
                return { data: { user: state.user }, error: null }
            },
        },
        from(table: string) {
            if (table === 'launch_phases') {
                const promise = Promise.resolve(
                    state.phaseError
                        ? { data: null, error: state.phaseError }
                        : { data: state.phases, error: null },
                )
                const chain = {
                    select() {
                        return chain
                    },
                    in() {
                        return chain
                    },
                    then(onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) {
                        return promise.then(onFulfilled, onRejected)
                    },
                }
                return chain
            }
            if (table === 'products') {
                const promise = state.productHang
                    ? new Promise(() => undefined)
                    : Promise.resolve({ data: state.product, error: state.productError })
                const chain = {
                    select() {
                        return chain
                    },
                    eq() {
                        return chain
                    },
                    not() {
                        return chain
                    },
                    maybeSingle() {
                        return promise
                    },
                }
                return chain
            }
            if (table === 'shop_product_waitlist') {
                return {
                    upsert(values: unknown, options: unknown) {
                        upserts.push({ values, options })
                        if (state.upsertHang) return new Promise(() => undefined)
                        return Promise.resolve({ error: state.upsertError })
                    },
                    delete() {
                        const chain = {
                            eq(column: string, value: string) {
                                deleteEqs.push({ column, value })
                                return chain
                            },
                            then(
                                onFulfilled: (value: unknown) => unknown,
                                onRejected?: (reason: unknown) => unknown,
                            ) {
                                if (state.deleteHang) return new Promise(() => undefined)
                                return Promise.resolve({ data: null, error: state.deleteError }).then(
                                    onFulfilled,
                                    onRejected,
                                )
                            },
                        }
                        return chain
                    },
                    select() {
                        const promise = Promise.resolve({ data: [], error: null })
                        return {
                            then(onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) {
                                return promise.then(onFulfilled, onRejected)
                            },
                        }
                    },
                }
            }
            throw new Error(`unexpected table ${table}`)
        },
    }),
}))

import { DELETE, POST } from '@/app/api/shop/waitlist/route'
import { safeLog } from '@/lib/utils/safe-log'

function call(method: 'POST' | 'DELETE', body: unknown) {
    const handler = method === 'POST' ? POST : DELETE
    const raw = typeof body === 'string' ? body : JSON.stringify(body)
    return handler(
        new Request('http://localhost/api/shop/waitlist', {
            method,
            headers: { 'content-type': 'application/json' },
            body: raw,
        }),
    )
}

function unreleasedProduct(partial: Record<string, unknown> = {}) {
    state.product = {
        id: PRODUCT_ID,
        sku: 'FC-CREATINE-001',
        name: 'Creatine Fixture',
        category: 'supplement',
        product_type: 'supplement',
        active: true,
        launch_phase_id: 'shop_release_phase_2',
        ...partial,
    }
}

describe('/api/shop/waitlist', () => {
    beforeEach(() => {
        resetState()
        vi.spyOn(safeLog, 'warn').mockImplementation(() => undefined)
        vi.spyOn(safeLog, 'info').mockImplementation(() => undefined)
        vi.spyOn(safeLog, 'error').mockImplementation(() => undefined)
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.restoreAllMocks()
    })

    it('returns 401 when DELETE auth fails', async () => {
        state.authError = { message: 'invalid session' }
        state.user = null
        const response = await call('DELETE', { productId: PRODUCT_ID })
        expect(response.status).toBe(401)
        const body = (await response.json()) as { success: boolean; errorCode: string }
        expect(body.success).toBe(false)
        expect(body.errorCode).toBe('AUTH_REQUIRED')
        expect(deleteEqs).toEqual([])
        expect(state.getUserCalls).toBe(1)
    })

    it('returns 401 when there is no user', async () => {
        state.user = null
        const response = await call('POST', { productId: PRODUCT_ID, source: 'plp' })
        expect(response.status).toBe(401)
        const body = (await response.json()) as { success: boolean; errorCode: string }
        expect(body.success).toBe(false)
        expect(body.errorCode).toBe('AUTH_REQUIRED')
        expect(upserts).toEqual([])
    })

    it('returns 400 for bad JSON, a non-UUID, or a bad source', async () => {
        const badJson = await call('POST', '{')
        expect(badJson.status).toBe(400)
        expect(((await badJson.json()) as { errorCode: string }).errorCode).toBe('INVALID_BODY')

        const badId = await call('POST', { productId: 'nope', source: 'plp' })
        expect(badId.status).toBe(400)

        const badSource = await call('POST', { productId: PRODUCT_ID, source: 'email' })
        expect(badSource.status).toBe(400)

        const arrayBody = await call('POST', [])
        expect(arrayBody.status).toBe(400)
        expect(((await arrayBody.json()) as { errorCode: string }).errorCode).toBe('INVALID_BODY')
        expect(upserts).toEqual([])
    })

    it('returns 503 when auth times out and 500 when auth throws', async () => {
        vi.useFakeTimers()
        state.authHang = true
        let status = 0
        let errorCode = ''
        const pending = call('POST', { productId: PRODUCT_ID, source: 'plp' }).then(async (response) => {
            status = response.status
            errorCode = ((await response.json()) as { errorCode: string }).errorCode
        })
        await vi.advanceTimersByTimeAsync(2000)
        await pending
        expect(status).toBe(503)
        expect(errorCode).toBe('TIMEOUT')

        vi.useRealTimers()
        state.authHang = false
        state.authThrow = true
        const thrown = await call('DELETE', { productId: PRODUCT_ID })
        expect(thrown.status).toBe(500)
        expect(((await thrown.json()) as { errorCode: string }).errorCode).toBe('SERVER_ERROR')
        expect(deleteEqs).toEqual([])
    })

    it('returns 404 for an inactive or missing product', async () => {
        state.product = null
        const missing = await call('POST', { productId: PRODUCT_ID, source: 'plp' })
        expect(missing.status).toBe(404)
        expect(((await missing.json()) as { errorCode: string }).errorCode).toBe('PRODUCT_NOT_FOUND')

        unreleasedProduct({ active: false })
        const inactive = await call('POST', { productId: PRODUCT_ID, source: 'pdp' })
        expect(inactive.status).toBe(404)
        expect(upserts).toEqual([])
    })

    it('returns 409 with no upsert for a released product or an exempt kit', async () => {
        unreleasedProduct({ launch_phase_id: 'shop_release_phase_1' })
        state.phases = [{ id: 'shop_release_phase_1', activation_status: 'active' }]
        const released = await call('POST', { productId: PRODUCT_ID, source: 'plp' })
        expect(released.status).toBe(409)
        expect(((await released.json()) as { errorCode: string }).errorCode).toBe('PRODUCT_RELEASED')
        expect(upserts).toEqual([])

        resetState()
        unreleasedProduct({
            category: 'test_kit',
            product_type: 'test_kit',
            name: 'Panel Kit',
            launch_phase_id: null,
        })
        state.phaseError = { code: '42501', message: 'rls' }
        const kit = await call('POST', { productId: PRODUCT_ID, source: 'plp' })
        expect(kit.status).toBe(409)
        expect(upserts).toEqual([])
    })

    it('upserts an unreleased product and accepts a repeat join', async () => {
        unreleasedProduct()
        const first = await call('POST', { productId: PRODUCT_ID, source: 'plp' })
        expect(first.status).toBe(200)
        const firstBody = (await first.json()) as { success: boolean; data: { status: string } }
        expect(firstBody.success).toBe(true)
        expect(firstBody.data.status).toBe('joined')
        expect(upserts).toEqual([
            {
                values: { user_id: USER_ID, product_id: PRODUCT_ID, source: 'plp' },
                options: { onConflict: 'user_id,product_id', ignoreDuplicates: true },
            },
        ])
        expect(vi.mocked(safeLog.info)).toHaveBeenCalledWith('api.shop.waitlist', 'joined', {
            productId: PRODUCT_ID,
        })
        const logged = JSON.stringify(vi.mocked(safeLog.info).mock.calls)
        expect(logged).not.toContain('Creatine Fixture')
        expect(logged).not.toContain(USER_ID)

        const second = await call('POST', { productId: PRODUCT_ID, source: 'plp' })
        expect(second.status).toBe(200)
        expect(upserts).toHaveLength(2)
    })

    it('returns 503 on timeout and 500 SERVER_ERROR on 42P01', async () => {
        vi.useFakeTimers()
        unreleasedProduct()
        state.productHang = true
        let status = 0
        let errorCode = ''
        const pending = call('POST', { productId: PRODUCT_ID, source: 'plp' }).then(async (response) => {
            status = response.status
            errorCode = ((await response.json()) as { errorCode: string }).errorCode
        })
        await vi.advanceTimersByTimeAsync(1500)
        await pending
        expect(status).toBe(503)
        expect(errorCode).toBe('TIMEOUT')

        vi.useRealTimers()
        state.productHang = false
        state.upsertError = { code: '42P01', message: 'undefined_table' }
        const missing = await call('POST', { productId: PRODUCT_ID, source: 'plp' })
        expect(missing.status).toBe(500)
        expect(((await missing.json()) as { errorCode: string }).errorCode).toBe('SERVER_ERROR')
    })

    it('deletes by product id and the signed-in user id, and accepts a repeat leave', async () => {
        const first = await call('DELETE', { productId: PRODUCT_ID })
        expect(first.status).toBe(200)
        expect(((await first.json()) as { data: { status: string } }).data.status).toBe('left')
        expect(deleteEqs).toEqual([
            { column: 'product_id', value: PRODUCT_ID },
            { column: 'user_id', value: USER_ID },
        ])

        const second = await call('DELETE', { productId: PRODUCT_ID })
        expect(second.status).toBe(200)
        expect(deleteEqs).toHaveLength(4)
        expect(deleteEqs.filter((eq) => eq.column === 'user_id').every((eq) => eq.value === USER_ID)).toBe(true)
    })

    it('passes the route user id into leave and does not call getUser again', async () => {
        const response = await call('DELETE', { productId: PRODUCT_ID })
        expect(response.status).toBe(200)
        expect(state.getUserCalls).toBe(1)
        expect(deleteEqs).toEqual([
            { column: 'product_id', value: PRODUCT_ID },
            { column: 'user_id', value: USER_ID },
        ])
    })

    it('returns 503 or 500 when leave times out or the table is missing', async () => {
        vi.useFakeTimers()
        state.deleteHang = true
        let status = 0
        let errorCode = ''
        const pending = call('DELETE', { productId: PRODUCT_ID }).then(async (response) => {
            status = response.status
            errorCode = ((await response.json()) as { errorCode: string }).errorCode
        })
        await vi.advanceTimersByTimeAsync(1500)
        await pending
        expect(status).toBe(503)
        expect(errorCode).toBe('TIMEOUT')

        vi.useRealTimers()
        state.deleteHang = false
        state.deleteError = { code: '42P01', message: 'undefined_table' }
        const missing = await call('DELETE', { productId: PRODUCT_ID })
        expect(missing.status).toBe(500)
        expect(((await missing.json()) as { errorCode: string }).errorCode).toBe('SERVER_ERROR')
    })
})
