/**
 * Server action wrapping the find_patient_user_id_by_email RPC per
 * Prompt #141 v3 Phase F6b.3e2. Used by the practitioner issue form
 * to resolve a patient email to a user_id before calling
 * prescription_issue.
 *
 * Role gating happens inside the RPC (practitioner/naturopath only).
 * This wrapper handles input cleaning, the friendly error mapping for
 * the RPC's RAISE EXCEPTION strings, and the not-found case (RPC
 * returns NULL when no match exists; we surface that as a friendly
 * "No patient with that email was found." error).
 */
'use server'

import { createClient } from '@/lib/supabase/server'
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout'
import { safeLog } from '@/lib/utils/safe-log'

export type FindPatientByEmailResult =
    | { ok: true; patientUserId: string }
    | { ok: false; error: string }

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export async function serverFindPatientByEmail(
    email: string,
): Promise<FindPatientByEmailResult> {
    const trimmed = (email ?? '').trim()
    if (!trimmed) {
        return { ok: false, error: 'Email is required.' }
    }
    if (!EMAIL_RE.test(trimmed)) {
        return { ok: false, error: 'Please enter a valid email address.' }
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
            sb.rpc('find_patient_user_id_by_email', { p_email: trimmed }),
            5000,
            'prescriptions.lookup',
        )
        if (error) {
            const message = (error as { message?: string }).message ?? ''
            safeLog.warn('prescriptions.lookup', 'find_patient_user_id_by_email RPC error', {
                error,
            })
            if (message.includes('Authentication required')) {
                return { ok: false, error: 'Please sign in to look up patients.' }
            }
            if (message.includes('Only practitioners and naturopaths')) {
                return {
                    ok: false,
                    error: 'Only practitioner and naturopath accounts can look up patients.',
                }
            }
            if (message.includes('Invalid email format')) {
                return { ok: false, error: 'Please enter a valid email address.' }
            }
            return { ok: false, error: 'Could not look up patient. Please try again.' }
        }
        const patientUserId = typeof data === 'string' ? data : null
        if (!patientUserId) {
            return { ok: false, error: 'No patient with that email was found.' }
        }
        return { ok: true, patientUserId }
    } catch (error) {
        if (isTimeoutError(error)) {
            safeLog.warn('prescriptions.lookup', 'serverFindPatientByEmail timed out', {
                error,
            })
            return { ok: false, error: 'Lookup timed out. Please try again.' }
        }
        safeLog.error('prescriptions.lookup', 'serverFindPatientByEmail failed', { error })
        return { ok: false, error: 'Could not look up patient. Please try again.' }
    }
}
