/**
 * Server-side helper for resolving the current shop session role per
 * Prompt #141 v3 §5.4 (Helix earn line is consumer-only). Reads role from
 * profiles.role with fallback to user_metadata.role, normalized to the
 * three shop-facing values: 'consumer' | 'practitioner' | 'naturopath' |
 * null (anonymous).
 *
 * Anonymous sessions are treated as consumer-like for the shop UX so the
 * Helix earn line is visible to logged-out browsers (the actual ledger
 * write only happens on authenticated checkout in Phase F5).
 *
 * Wrapped in withTimeout for resilience parity with the rest of the shop
 * data layer; failures degrade to null and the caller treats it as
 * anonymous (consumer-like).
 */
import { createClient } from '@/lib/supabase/server'
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout'
import { safeLog } from '@/lib/utils/safe-log'

export type ShopRole = 'consumer' | 'practitioner' | 'naturopath' | null

function normalizeRole(raw: string | null | undefined): ShopRole {
    if (!raw) return null
    if (raw === 'patient') return 'consumer'
    if (raw === 'admin') return 'consumer'
    if (raw === 'consumer' || raw === 'practitioner' || raw === 'naturopath') return raw
    return null
}

export async function getCurrentShopRole(): Promise<ShopRole> {
    const session = await getCurrentShopSession()
    return session.role
}

export interface ShopSession {
    role: ShopRole
    userId: string | null
}

export async function getCurrentShopSession(): Promise<ShopSession> {
    try {
        const supabase = createClient()
        const userResult = await withTimeout(
            supabase.auth.getUser(),
            2000,
            'shop.session.getUser',
        )
        if (userResult.error || !userResult.data.user) {
            return { role: null, userId: null }
        }
        const userId = userResult.data.user.id
        const metadataRole = (userResult.data.user.user_metadata?.role as string | undefined) ?? undefined

        const sb = supabase as unknown as {
            from: (t: string) => {
                select: (s: string) => {
                    eq: (
                        c: string,
                        v: string,
                    ) => {
                        maybeSingle: () => Promise<{ data: { role: string | null } | null; error: unknown }>
                    }
                }
            }
        }
        try {
            const profileResult = await withTimeout(
                sb.from('profiles').select('role').eq('id', userId).maybeSingle(),
                1500,
                'shop.session.profiles',
            )
            const role = profileResult.data?.role ?? metadataRole
            return { role: normalizeRole(role), userId }
        } catch (error) {
            if (isTimeoutError(error)) {
                safeLog.warn('shop.session', 'profiles role lookup timed out, falling back to user_metadata', {
                    error,
                })
            } else {
                safeLog.warn('shop.session', 'profiles role lookup failed', { error })
            }
            return { role: normalizeRole(metadataRole), userId }
        }
    } catch (error) {
        if (isTimeoutError(error)) {
            safeLog.warn('shop.session', 'getUser timed out', { error })
        } else {
            safeLog.error('shop.session', 'getCurrentShopSession failed', { error })
        }
        return { role: null, userId: null }
    }
}

export function isConsumerSession(role: ShopRole): boolean {
    return role === null || role === 'consumer'
}
