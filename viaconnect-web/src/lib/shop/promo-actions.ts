/**
 * Server actions for the Via Cura shop promo code system per Prompt #141
 * v3 Phase F5b. Wraps the two SECURITY DEFINER RPCs added by migration
 * 20260429120000:
 *   - validate_promo_code(code, subtotal_cents) -> rich error/result row
 *   - increment_promo_redemption(code) -> void (called on order finalize)
 *
 * Anonymous users can validate (RPC GRANT EXECUTE TO anon), useful for
 * showing a discount preview before sign-in. Only authenticated users can
 * increment redemption count, which finalizeShopOrder does on payment
 * success.
 *
 * RPCs are SECURITY DEFINER so RLS on promo_codes does not block reads.
 * Direct SELECT on promo_codes from anon/authenticated is blocked (no
 * policy added for those roles); validation is only available via the RPC
 * which returns just the fields the caller needs.
 */
'use server'

import { createClient } from '@/lib/supabase/server'
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout'
import { safeLog } from '@/lib/utils/safe-log'

export interface PromoValidationResult {
    ok: boolean
    normalizedCode?: string
    kind?: 'percent' | 'amount'
    value?: number
    error?: string
}

export async function serverValidatePromoCode(
    code: string,
    subtotalCents: number,
): Promise<PromoValidationResult> {
    const trimmed = (code ?? '').trim()
    if (!trimmed) {
        return { ok: false, error: 'Code is empty.' }
    }
    try {
        const supabase = createClient()
        const sb = supabase as unknown as {
            rpc: (
                fn: string,
                args: Record<string, unknown>,
            ) => Promise<{ data: unknown; error: unknown }>
        }
        const { data, error } = await withTimeout(
            sb.rpc('validate_promo_code', {
                p_code: trimmed,
                p_subtotal_cents: Math.max(0, Math.floor(subtotalCents)),
            }),
            3000,
            'shop.promo.validate',
        )
        if (error) {
            safeLog.warn('shop.promo', 'validate_promo_code RPC error', { error })
            return { ok: false, error: 'Could not validate code. Please try again.' }
        }
        const rows = (Array.isArray(data) ? data : []) as Array<{
            ok: boolean
            normalized_code: string | null
            kind: string | null
            value: number | string | null
            error: string | null
        }>
        const row = rows[0]
        if (!row) {
            return { ok: false, error: 'Code not recognized.' }
        }
        if (!row.ok) {
            return { ok: false, error: row.error ?? 'Code not recognized.' }
        }
        const numericValue =
            typeof row.value === 'string' ? Number(row.value) : (row.value ?? 0)
        const kindValue = row.kind === 'percent' || row.kind === 'amount' ? row.kind : undefined
        if (!kindValue || !Number.isFinite(numericValue) || numericValue <= 0) {
            return { ok: false, error: 'Code is misconfigured.' }
        }
        return {
            ok: true,
            normalizedCode: row.normalized_code ?? trimmed.toUpperCase(),
            kind: kindValue,
            value: numericValue,
        }
    } catch (error) {
        if (isTimeoutError(error)) {
            safeLog.warn('shop.promo', 'serverValidatePromoCode timed out', { error })
        } else {
            safeLog.error('shop.promo', 'serverValidatePromoCode failed', { error })
        }
        return { ok: false, error: 'Could not validate code. Please try again.' }
    }
}

export async function serverIncrementPromoRedemption(code: string): Promise<void> {
    const trimmed = (code ?? '').trim()
    if (!trimmed) return
    try {
        const supabase = createClient()
        const sb = supabase as unknown as {
            rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: unknown }>
        }
        const { error } = await withTimeout(
            sb.rpc('increment_promo_redemption', { p_code: trimmed }),
            3000,
            'shop.promo.increment',
        )
        if (error) {
            safeLog.warn('shop.promo', 'increment_promo_redemption RPC error', {
                error,
                code: trimmed,
            })
        }
    } catch (error) {
        safeLog.warn('shop.promo', 'serverIncrementPromoRedemption failed', { error })
    }
}
