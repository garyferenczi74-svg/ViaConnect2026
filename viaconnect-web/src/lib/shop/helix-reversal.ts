/**
 * Helix reversal for refunded shop orders per Prompt #141 v3 Phase F6b.2.
 *
 * When a Stripe charge.refunded webhook fires for a fully refunded order
 * (amount_refunded === amount), the original earn + burn transactions on
 * helix_transactions need to be unwound so the user's balance is restored
 * to its pre-order state. The reversal:
 *
 *   - Looks up the order's existing helix_transactions rows via
 *     related_entity_id = orderId. F6b.1 set this to orderRow.id at credit
 *     time; F5/F6a wrote burn rows with the same reference. Burn rows have
 *     negative amounts; earn rows have positive amounts.
 *   - For each non-zero transaction, writes a reversing helix_transactions
 *     row with source='shop_refund' and an inverted amount, then calls
 *     helix_increment_balance to update the on-disk balance atomically.
 *   - The reversal credits/debits the SAME user_id as the original (which,
 *     for family-pool routed earns, may be a different user than the
 *     purchasing user — F6b.1's routing-aware logic handles this correctly
 *     because we're cloning the original target).
 *
 * Idempotency:
 *   - If a reversal row already exists for the order (source='shop_refund'),
 *     this function short-circuits and returns alreadyReversed=true. Stripe
 *     can retry charge.refunded events for hours; we must not double-reverse.
 *
 * Out of scope (F6b.5):
 *   - Partial refunds. The webhook caller checks amount_refunded === amount
 *     before invoking this helper.
 *   - Reversal-of-reversal (e.g., refund cancelled). No Stripe event for
 *     that flow today.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { withTimeout } from '@/lib/utils/with-timeout'
import { safeLog } from '@/lib/utils/safe-log'

export interface HelixReversalResult {
    alreadyReversed: boolean
    earnReversed: boolean
    burnReversed: boolean
    earnAmount: number
    burnAmount: number
}

interface HelixTxnRow {
    id: string
    user_id: string
    type: string
    amount: number
    source: string
}

export async function reverseHelixForOrder(
    supabase: SupabaseClient,
    orderId: string,
    orderNumber: string,
): Promise<HelixReversalResult> {
    const sb = supabase as unknown as {
        from: (t: string) => any
        rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: unknown }>
    }

    try {
        const { data: existingReversal } = await withTimeout(
            sb
                .from('helix_transactions')
                .select('id')
                .eq('related_entity_id', orderId)
                .eq('source', 'shop_refund')
                .limit(1)
                .maybeSingle(),
            3000,
            'shop.helix_reversal.idempotency',
        )
        if (existingReversal) {
            return {
                alreadyReversed: true,
                earnReversed: false,
                burnReversed: false,
                earnAmount: 0,
                burnAmount: 0,
            }
        }

        const { data: txnData } = await withTimeout(
            sb
                .from('helix_transactions')
                .select('id, user_id, type, amount, source')
                .eq('related_entity_id', orderId)
                .in('source', ['shop_order', 'supplement_purchase_dollar']),
            3000,
            'shop.helix_reversal.lookup',
        )
        const txns = (Array.isArray(txnData) ? txnData : []) as HelixTxnRow[]

        let earnAmount = 0
        let burnAmount = 0
        let earnUserId: string | null = null
        let burnUserId: string | null = null
        for (const t of txns) {
            if (t.amount > 0) {
                earnAmount = t.amount
                earnUserId = t.user_id
            } else if (t.amount < 0) {
                burnAmount = Math.abs(t.amount)
                burnUserId = t.user_id
            }
        }

        let earnReversed = false
        let burnReversed = false

        if (earnAmount > 0 && earnUserId) {
            try {
                await withTimeout(
                    sb.from('helix_transactions').insert({
                        user_id: earnUserId,
                        type: 'spend',
                        amount: -earnAmount,
                        source: 'shop_refund',
                        description: `Earn reversal for refunded order ${orderNumber}`,
                        related_entity_id: orderId,
                        metadata: {
                            order_number: orderNumber,
                            reversal_type: 'earn',
                        },
                    }),
                    3000,
                    'shop.helix_reversal.earn_log',
                )
                await withTimeout(
                    sb.rpc('helix_increment_balance', {
                        p_user_id: earnUserId,
                        p_points: -earnAmount,
                    }),
                    3000,
                    'shop.helix_reversal.earn_rpc',
                )
                earnReversed = true
            } catch (error) {
                safeLog.warn('shop.helix_reversal', 'earn reversal failed', {
                    error,
                    orderId,
                    orderNumber,
                })
            }
        }

        if (burnAmount > 0 && burnUserId) {
            try {
                await withTimeout(
                    sb.from('helix_transactions').insert({
                        user_id: burnUserId,
                        type: 'earning',
                        amount: burnAmount,
                        source: 'shop_refund',
                        description: `Burn reversal for refunded order ${orderNumber}`,
                        related_entity_id: orderId,
                        metadata: {
                            order_number: orderNumber,
                            reversal_type: 'burn',
                        },
                    }),
                    3000,
                    'shop.helix_reversal.burn_log',
                )
                await withTimeout(
                    sb.rpc('helix_increment_balance', {
                        p_user_id: burnUserId,
                        p_points: burnAmount,
                    }),
                    3000,
                    'shop.helix_reversal.burn_rpc',
                )
                burnReversed = true
            } catch (error) {
                safeLog.warn('shop.helix_reversal', 'burn reversal failed', {
                    error,
                    orderId,
                    orderNumber,
                })
            }
        }

        return {
            alreadyReversed: false,
            earnReversed,
            burnReversed,
            earnAmount,
            burnAmount,
        }
    } catch (error) {
        safeLog.error('shop.helix_reversal', 'reverseHelixForOrder failed', { error, orderNumber })
        return {
            alreadyReversed: false,
            earnReversed: false,
            burnReversed: false,
            earnAmount: 0,
            burnAmount: 0,
        }
    }
}
