/**
 * Server actions for practitioner-side prescription token management
 * per Prompt #141 v3 Phase F6b.3b. These wrap the SECURITY DEFINER RPCs
 * shipped in F6b.3a (prescription_issue, prescription_revoke) and the
 * SELECT view that RLS exposes to the issuing practitioner.
 *
 * Live RPC mapping (from migration 20260430200000):
 *   - prescription_issue(p_patient_user_id, p_sku, p_quantity, p_expires_at,
 *       p_dosage_instructions, p_clinical_notes, p_metadata) -> uuid
 *     Role-gated to practitioner/naturopath inside the RPC. Validates SKU
 *     and patient existence, future expiration, positive quantity, no
 *     self-issue.
 *   - prescription_revoke(p_token_id, p_reason) -> boolean
 *     Only the issuing practitioner can revoke; non-active tokens cannot
 *     be revoked. F6b.3g extends this RPC to support an admin override
 *     for offboarded practitioners.
 *
 * The list query reads prescription_tokens directly via the
 * `prescription_tokens_select_practitioner` RLS policy which gates rows
 * to practitioner_user_id = auth.uid(). The explicit eq filter is
 * redundant with RLS but kept for planner clarity and defense in depth.
 *
 * Out of scope (later phases):
 *   - Patient-facing actions (F6b.3c)
 *   - Checkout integration (F6b.3d, validateCheckout + finalizeOrderForSession)
 *   - Practitioner UI (F6b.3e)
 *   - Audit log + admin override + expiry notifications (F6b.3g)
 *   - Refills + extended lifecycle (F6b.3h)
 */
'use server'

import { createClient } from '@/lib/supabase/server'
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout'
import { safeLog } from '@/lib/utils/safe-log'

export type PrescriptionStatus = 'active' | 'consumed' | 'revoked' | 'expired'

export interface IssuePrescriptionInput {
    patientUserId: string
    sku: string
    quantity: number
    expiresAt: string
    dosageInstructions?: string
    clinicalNotes?: string
    metadata?: Record<string, unknown>
}

export type IssuePrescriptionResult =
    | { ok: true; tokenId: string }
    | { ok: false; error: string }

export type RevokePrescriptionResult =
    | { ok: true }
    | { ok: false; error: string }

export interface IssuedPrescription {
    id: string
    patientUserId: string
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
    // Phase F6b.3h3: clinical_notes is deliberately NOT included in the
    // list result. The column is now REVOKE-gated at the DB layer; the
    // dedicated SECURITY DEFINER RPC get_my_issued_prescription_clinical_notes
    // is called via serverGetIssuedPrescriptionClinicalNotes when a
    // practitioner expands a card to view the notes on demand.
}

export type GetClinicalNotesResult =
    | { ok: true; notes: string | null }
    | { ok: false; error: string }

export interface ListIssuedFilters {
    status?: PrescriptionStatus
    patientUserId?: string
    limit?: number
}

export type ListIssuedResult =
    | { ok: true; prescriptions: IssuedPrescription[] }
    | { ok: false; error: string }

const MAX_LIST_LIMIT = 200
const DEFAULT_LIST_LIMIT = 100

export async function serverIssuePrescription(
    input: IssuePrescriptionInput,
): Promise<IssuePrescriptionResult> {
    if (!input.patientUserId || !input.sku) {
        return { ok: false, error: 'Patient and SKU are required.' }
    }
    if (!input.quantity || input.quantity <= 0) {
        return { ok: false, error: 'Quantity must be positive.' }
    }
    const expiresAtMs = Date.parse(input.expiresAt)
    if (Number.isNaN(expiresAtMs) || expiresAtMs <= Date.now()) {
        return { ok: false, error: 'Expiration must be a valid future date.' }
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
            sb.rpc('prescription_issue', {
                p_patient_user_id: input.patientUserId,
                p_sku: input.sku,
                p_quantity: Math.floor(input.quantity),
                p_expires_at: input.expiresAt,
                p_dosage_instructions: input.dosageInstructions ?? null,
                p_clinical_notes: input.clinicalNotes ?? null,
                p_metadata: input.metadata ?? {},
            }),
            5000,
            'prescriptions.issue',
        )
        if (error) {
            const message = (error as { message?: string }).message ?? ''
            safeLog.warn('prescriptions.issue', 'prescription_issue RPC error', { error })
            return { ok: false, error: friendlyIssueError(message) }
        }
        const tokenId = typeof data === 'string' ? data : null
        if (!tokenId) {
            safeLog.warn('prescriptions.issue', 'prescription_issue returned no token id', { data })
            return { ok: false, error: 'Issuance returned no token id.' }
        }
        return { ok: true, tokenId }
    } catch (error) {
        if (isTimeoutError(error)) {
            safeLog.warn('prescriptions.issue', 'serverIssuePrescription timed out', { error })
            return { ok: false, error: 'Issuance timed out. Please try again.' }
        }
        safeLog.error('prescriptions.issue', 'serverIssuePrescription failed', { error })
        return { ok: false, error: 'Could not issue prescription. Please try again.' }
    }
}

export async function serverRevokePrescription(
    tokenId: string,
    reason: string,
): Promise<RevokePrescriptionResult> {
    if (!tokenId) {
        return { ok: false, error: 'Token id is required.' }
    }
    const trimmedReason = (reason ?? '').trim()
    if (!trimmedReason) {
        return { ok: false, error: 'Revocation reason is required.' }
    }
    try {
        const supabase = createClient()
        const sb = supabase as unknown as {
            rpc: (
                fn: string,
                args: Record<string, unknown>,
            ) => Promise<{ data: unknown; error: unknown }>
        }
        const { error } = await withTimeout(
            sb.rpc('prescription_revoke', {
                p_token_id: tokenId,
                p_reason: trimmedReason,
            }),
            5000,
            'prescriptions.revoke',
        )
        if (error) {
            const message = (error as { message?: string }).message ?? ''
            safeLog.warn('prescriptions.revoke', 'prescription_revoke RPC error', { error })
            return { ok: false, error: friendlyRevokeError(message) }
        }
        return { ok: true }
    } catch (error) {
        if (isTimeoutError(error)) {
            safeLog.warn('prescriptions.revoke', 'serverRevokePrescription timed out', { error })
            return { ok: false, error: 'Revocation timed out. Please try again.' }
        }
        safeLog.error('prescriptions.revoke', 'serverRevokePrescription failed', { error })
        return { ok: false, error: 'Could not revoke prescription. Please try again.' }
    }
}

export async function serverListMyIssuedPrescriptions(
    filters: ListIssuedFilters = {},
): Promise<ListIssuedResult> {
    try {
        const supabase = createClient()
        const sb = supabase as unknown as {
            from: (t: string) => any
        }
        let query = sb
            .from('prescription_tokens')
            .select(
                'id, patient_user_id, sku, quantity_authorized, quantity_consumed, status, issued_at, expires_at, consumed_at, revoked_at, dosage_instructions, revocation_reason',
            )
            .order('issued_at', { ascending: false })
        if (filters.status) {
            query = query.eq('status', filters.status)
        }
        if (filters.patientUserId) {
            query = query.eq('patient_user_id', filters.patientUserId)
        }
        const limit =
            filters.limit && filters.limit > 0
                ? Math.min(filters.limit, MAX_LIST_LIMIT)
                : DEFAULT_LIST_LIMIT
        query = query.limit(limit)

        const { data, error } = await withTimeout(query, 5000, 'prescriptions.list_issued')
        if (error) {
            safeLog.warn('prescriptions.list_issued', 'list query error', { error })
            return { ok: false, error: 'Could not load prescriptions. Please try again.' }
        }
        const rows = (Array.isArray(data) ? data : []) as Array<{
            id: string
            patient_user_id: string
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
        const prescriptions: IssuedPrescription[] = rows.map((r) => ({
            id: r.id,
            patientUserId: r.patient_user_id,
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
            safeLog.warn('prescriptions.list_issued', 'serverListMyIssuedPrescriptions timed out', {
                error,
            })
            return { ok: false, error: 'List query timed out. Please try again.' }
        }
        safeLog.error('prescriptions.list_issued', 'serverListMyIssuedPrescriptions failed', {
            error,
        })
        return { ok: false, error: 'Could not load prescriptions. Please try again.' }
    }
}

export async function serverGetIssuedPrescriptionClinicalNotes(
    tokenId: string,
): Promise<GetClinicalNotesResult> {
    if (!tokenId) {
        return { ok: false, error: 'Token id is required.' }
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
            sb.rpc('get_my_issued_prescription_clinical_notes', { p_token_id: tokenId }),
            5000,
            'prescriptions.clinical_notes_fetch',
        )
        if (error) {
            const message = (error as { message?: string }).message ?? ''
            safeLog.warn(
                'prescriptions.clinical_notes_fetch',
                'get_my_issued_prescription_clinical_notes RPC error',
                { error },
            )
            if (message.includes('Authentication required')) {
                return { ok: false, error: 'Please sign in to view clinical notes.' }
            }
            if (message.includes('Only the issuing practitioner')) {
                return {
                    ok: false,
                    error: 'Only the practitioner who issued this prescription can view its clinical notes.',
                }
            }
            if (message.includes('Prescription token not found')) {
                return { ok: false, error: 'Prescription not found.' }
            }
            return { ok: false, error: 'Could not load clinical notes. Please try again.' }
        }
        const notes = typeof data === 'string' ? data : null
        return { ok: true, notes }
    } catch (error) {
        if (isTimeoutError(error)) {
            safeLog.warn(
                'prescriptions.clinical_notes_fetch',
                'serverGetIssuedPrescriptionClinicalNotes timed out',
                { error },
            )
            return { ok: false, error: 'Clinical notes fetch timed out. Please try again.' }
        }
        safeLog.error(
            'prescriptions.clinical_notes_fetch',
            'serverGetIssuedPrescriptionClinicalNotes failed',
            { error },
        )
        return { ok: false, error: 'Could not load clinical notes. Please try again.' }
    }
}

function normalizeStatus(raw: string): PrescriptionStatus {
    if (raw === 'active' || raw === 'consumed' || raw === 'revoked' || raw === 'expired') {
        return raw
    }
    return 'expired'
}

function friendlyIssueError(rpcMessage: string): string {
    if (rpcMessage.includes('Authentication required')) {
        return 'Please sign in to issue prescriptions.'
    }
    if (rpcMessage.includes('Only practitioners and naturopaths')) {
        return 'Only practitioner and naturopath accounts can issue prescriptions.'
    }
    if (rpcMessage.includes('Unknown SKU')) {
        return 'That SKU is not in our catalog.'
    }
    if (rpcMessage.includes('Unknown patient')) {
        return 'That patient account was not found.'
    }
    if (rpcMessage.includes('Expiration must be')) {
        return 'Expiration must be in the future.'
    }
    if (rpcMessage.includes('Quantity must be positive')) {
        return 'Quantity must be a positive number.'
    }
    if (rpcMessage.includes('cannot issue a prescription to themselves')) {
        return 'You cannot issue a prescription to yourself.'
    }
    return 'Could not issue prescription. Please try again.'
}

function friendlyRevokeError(rpcMessage: string): string {
    if (rpcMessage.includes('Authentication required')) {
        return 'Please sign in to revoke prescriptions.'
    }
    if (rpcMessage.includes('Only the issuing practitioner')) {
        return 'Only the practitioner who issued this prescription can revoke it.'
    }
    if (rpcMessage.includes('not active')) {
        return 'This prescription has already been consumed, expired, or revoked.'
    }
    if (rpcMessage.includes('not found')) {
        return 'Prescription not found.'
    }
    return 'Could not revoke prescription. Please try again.'
}
