/**
 * Server actions for patient-side prescription token visibility per
 * Prompt #141 v3 Phase F6b.3c. These read prescription_tokens via the
 * RLS policy `prescription_tokens_select_patient` which gates rows to
 * patient_user_id = auth.uid(), and wrap the SECURITY DEFINER RPC
 * `prescription_check_my_eligibility` (also gated to auth.uid() inside).
 *
 * Surface:
 *   - serverListMyPrescriptions: patient sees their own active /
 *     consumed / revoked / expired tokens, plus dosage and revocation
 *     reason (so they understand status changes) but NOT clinical_notes
 *     (practitioner-internal per HIPAA-aware posture confirmed by
 *     Hannah on the F6b.3a verdict).
 *   - serverCheckRxEligibility: per-SKU eligibility check used by
 *     F6b.3d validateCheckout to evolve the existing hard-wall L3/L4
 *     gate into a token-aware flow.
 *
 * Practitioner identity (display name, credentials) is intentionally
 * not joined at the action layer. The UI in F6b.3f does a separate
 * batched profile lookup against the practitioner_user_id values
 * returned here, keeping action latency tight and the cross-table
 * RLS surface narrow.
 *
 * Out of scope (later phases):
 *   - Checkout integration (F6b.3d)
 *   - Patient UI surface (F6b.3f)
 *   - Audit log + admin override + notifications (F6b.3g)
 *   - Refills + extended lifecycle (F6b.3h)
 */
'use server'

import { createClient } from '@/lib/supabase/server'
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout'
import { safeLog } from '@/lib/utils/safe-log'

export type PrescriptionStatus = 'active' | 'consumed' | 'revoked' | 'expired'

export interface PatientPrescription {
    id: string
    practitionerUserId: string
    sku: string
    quantityAuthorized: number
    quantityConsumed: number
    status: PrescriptionStatus
    issuedAt: string
    expiresAt: string
    consumedAt: string | null
    revokedAt: string | null
    dosageInstructions: string | null
    revocationReason: string | null
}

export interface ListMyPrescriptionsFilters {
    status?: PrescriptionStatus
    activeOnly?: boolean
    limit?: number
}

export type ListMyPrescriptionsResult =
    | { ok: true; prescriptions: PatientPrescription[] }
    | { ok: false; error: string }

export interface RxEligibilityRow {
    sku: string
    hasToken: boolean
    tokenId: string | null
    expiresAt: string | null
}

export type CheckRxEligibilityResult =
    | { ok: true; rows: RxEligibilityRow[] }
    | { ok: false; error: string }

const MAX_LIST_LIMIT = 200
const DEFAULT_LIST_LIMIT = 100
const MAX_ELIGIBILITY_SKUS = 50

export async function serverListMyPrescriptions(
    filters: ListMyPrescriptionsFilters = {},
): Promise<ListMyPrescriptionsResult> {
    try {
        const supabase = createClient()
        const sb = supabase as unknown as {
            from: (t: string) => any
        }
        let query = sb
            .from('prescription_tokens')
            .select(
                'id, practitioner_user_id, sku, quantity_authorized, quantity_consumed, status, issued_at, expires_at, consumed_at, revoked_at, dosage_instructions, revocation_reason',
            )
            .order('issued_at', { ascending: false })

        if (filters.status) {
            query = query.eq('status', filters.status)
        } else if (filters.activeOnly) {
            query = query.eq('status', 'active')
        }
        const limit =
            filters.limit && filters.limit > 0
                ? Math.min(filters.limit, MAX_LIST_LIMIT)
                : DEFAULT_LIST_LIMIT
        query = query.limit(limit)

        const { data, error } = await withTimeout(query, 5000, 'prescriptions.list_mine')
        if (error) {
            safeLog.warn('prescriptions.list_mine', 'list query error', { error })
            return { ok: false, error: 'Could not load prescriptions. Please try again.' }
        }
        const rows = (Array.isArray(data) ? data : []) as Array<{
            id: string
            practitioner_user_id: string
            sku: string
            quantity_authorized: number
            quantity_consumed: number
            status: string
            issued_at: string
            expires_at: string
            consumed_at: string | null
            revoked_at: string | null
            dosage_instructions: string | null
            revocation_reason: string | null
        }>
        const prescriptions: PatientPrescription[] = rows.map((r) => ({
            id: r.id,
            practitionerUserId: r.practitioner_user_id,
            sku: r.sku,
            quantityAuthorized: r.quantity_authorized,
            quantityConsumed: r.quantity_consumed,
            status: normalizeStatus(r.status),
            issuedAt: r.issued_at,
            expiresAt: r.expires_at,
            consumedAt: r.consumed_at,
            revokedAt: r.revoked_at,
            dosageInstructions: r.dosage_instructions,
            revocationReason: r.revocation_reason,
        }))
        return { ok: true, prescriptions }
    } catch (error) {
        if (isTimeoutError(error)) {
            safeLog.warn('prescriptions.list_mine', 'serverListMyPrescriptions timed out', { error })
            return { ok: false, error: 'List query timed out. Please try again.' }
        }
        safeLog.error('prescriptions.list_mine', 'serverListMyPrescriptions failed', { error })
        return { ok: false, error: 'Could not load prescriptions. Please try again.' }
    }
}

export async function serverCheckRxEligibility(
    skus: string[],
): Promise<CheckRxEligibilityResult> {
    if (!Array.isArray(skus)) {
        return { ok: false, error: 'SKUs must be provided as an array.' }
    }
    const cleaned = Array.from(
        new Set(
            skus
                .map((s) => (typeof s === 'string' ? s.trim() : ''))
                .filter((s) => s.length > 0),
        ),
    )
    if (cleaned.length === 0) {
        return { ok: true, rows: [] }
    }
    if (cleaned.length > MAX_ELIGIBILITY_SKUS) {
        return {
            ok: false,
            error: `Too many SKUs in one request (max ${MAX_ELIGIBILITY_SKUS}).`,
        }
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
            sb.rpc('prescription_check_my_eligibility', { p_skus: cleaned }),
            5000,
            'prescriptions.check_eligibility',
        )
        if (error) {
            const message = (error as { message?: string }).message ?? ''
            safeLog.warn('prescriptions.check_eligibility', 'RPC error', { error })
            if (message.includes('Authentication required')) {
                return { ok: false, error: 'Please sign in to check prescription eligibility.' }
            }
            return { ok: false, error: 'Could not check prescription eligibility. Please try again.' }
        }
        const rawRows = (Array.isArray(data) ? data : []) as Array<{
            sku: string
            has_token: boolean
            token_id: string | null
            expires_at: string | null
        }>
        const rows: RxEligibilityRow[] = rawRows.map((r) => ({
            sku: r.sku,
            hasToken: Boolean(r.has_token),
            tokenId: r.token_id,
            expiresAt: r.expires_at,
        }))
        return { ok: true, rows }
    } catch (error) {
        if (isTimeoutError(error)) {
            safeLog.warn('prescriptions.check_eligibility', 'serverCheckRxEligibility timed out', {
                error,
            })
            return { ok: false, error: 'Eligibility check timed out. Please try again.' }
        }
        safeLog.error('prescriptions.check_eligibility', 'serverCheckRxEligibility failed', { error })
        return { ok: false, error: 'Could not check prescription eligibility. Please try again.' }
    }
}

function normalizeStatus(raw: string): PrescriptionStatus {
    if (raw === 'active' || raw === 'consumed' || raw === 'revoked' || raw === 'expired') {
        return raw
    }
    return 'expired'
}
