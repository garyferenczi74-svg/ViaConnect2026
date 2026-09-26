/**
 * Pure release rules. Fixtures are not catalog data.
 */
import { describe, expect, it } from 'vitest'
import {
    isExemptTestKit,
    isReleasedPhaseStatus,
    readLaunchPhaseId,
    resolveRelease,
} from '@/lib/shop/release-rules'

describe('isReleasedPhaseStatus', () => {
    it('is true only for active and completed', () => {
        expect(isReleasedPhaseStatus('active')).toBe(true)
        expect(isReleasedPhaseStatus('completed')).toBe(true)
        for (const status of ['planned', 'scheduled', 'paused', 'canceled', 'Active', ' active', '', null, undefined]) {
            expect(isReleasedPhaseStatus(status)).toBe(false)
        }
    })
})

describe('isExemptTestKit', () => {
    it('is true only when both fields are exactly test_kit', () => {
        expect(isExemptTestKit({ category: 'test_kit', product_type: 'test_kit' })).toBe(true)
    })

    it('does not exempt a null or mismatched type', () => {
        expect(isExemptTestKit({ category: 'test_kit', product_type: null })).toBe(false)
        expect(isExemptTestKit({ category: null, product_type: null })).toBe(false)
        expect(isExemptTestKit({ category: 'supplement', product_type: 'test_kit' })).toBe(false)
        expect(isExemptTestKit({ category: 'Test_Kit', product_type: 'test_kit' })).toBe(false)
        expect(isExemptTestKit({ category: ' test_kit', product_type: 'test_kit' })).toBe(false)
        expect(isExemptTestKit({ category: undefined, product_type: undefined })).toBe(false)
    })
})

describe('resolveRelease', () => {
    it('keeps an exempt kit released and a supplement unreleased when the lookup failed', () => {
        expect(
            resolveRelease({ category: 'test_kit', product_type: 'test_kit' }, null),
        ).toBe(true)
        expect(
            resolveRelease({ category: 'supplement', product_type: 'supplement' }, null),
        ).toBe(false)
    })

    it('releases a supplement only when its phase id is in the released set', () => {
        const released = new Set(['shop_release_phase_1'])
        expect(
            resolveRelease(
                {
                    category: 'supplement',
                    product_type: 'supplement',
                    launch_phase_id: 'shop_release_phase_1',
                },
                released,
            ),
        ).toBe(true)
        expect(
            resolveRelease(
                {
                    category: 'supplement',
                    product_type: 'supplement',
                    launch_phase_id: 'shop_release_phase_2',
                },
                released,
            ),
        ).toBe(false)
    })
})

describe('readLaunchPhaseId', () => {
    it('returns null when the key is absent', () => {
        expect(readLaunchPhaseId({ sku: 'FC-NAD-001' })).toBeNull()
    })

    it('returns null for a null value and the string when present', () => {
        expect(readLaunchPhaseId({ launch_phase_id: null })).toBeNull()
        expect(readLaunchPhaseId({ launch_phase_id: 'shop_release_phase_1' })).toBe(
            'shop_release_phase_1',
        )
    })
})
