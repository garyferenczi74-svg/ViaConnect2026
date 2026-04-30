/**
 * Layout-level role gate for the practitioner prescriptions area per
 * Prompt #141 v3 Phase F6b.3e2 (covering the F6b.3e Hannah note about
 * belt-and-suspenders gating). Both the list page (F6b.3e) and the new
 * prescription form (F6b.3e2) inherit this redirect.
 *
 * The auth check is already performed by the parent (app)/layout.tsx;
 * this layout adds a role check so consumers cannot land on these
 * practitioner-only pages even though the underlying RLS would already
 * return zero rows for them.
 *
 * Naturopaths share the practitioner UI surface (the prescription_issue
 * RPC accepts both roles); a future phase may mirror these pages under
 * /naturopath/prescriptions/.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function PrescriptionsAreaLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = createClient()
    const { data: userResult } = await supabase.auth.getUser()
    const userId = userResult?.user?.id
    if (!userId) {
        redirect('/login')
    }
    const sb = supabase as unknown as {
        from: (t: string) => any
    }
    const { data: profile } = await sb
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle()
    const role = (profile as { role?: string } | null)?.role ?? null
    if (role !== 'practitioner' && role !== 'naturopath') {
        redirect('/dashboard')
    }
    return <>{children}</>
}
