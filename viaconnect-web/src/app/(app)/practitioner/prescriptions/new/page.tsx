/**
 * New prescription issue form page per Prompt #141 v3 Phase F6b.3e2.
 * Server component that fetches the L3 and L4 product catalog from
 * public.products for the SKU dropdown and hands off to the IssueForm
 * client component. The IssueForm calls serverFindPatientByEmail then
 * serverIssuePrescription on submit.
 *
 * Role gate inherited from the area layout at
 * (app)/practitioner/prescriptions/layout.tsx.
 *
 * The catalog fetch is best-effort: if products RLS blocks or the table
 * is empty, the form falls through to an empty SKU dropdown with a
 * "no L3 or L4 SKUs available" hint. The issue RPC's "Unknown SKU"
 * check is the authoritative gate; the dropdown is a UX convenience.
 */
import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { safeLog } from '@/lib/utils/safe-log'
import IssueForm from './IssueForm'

export const dynamic = 'force-dynamic'

interface CatalogEntry {
    sku: string
    productName: string
    pricingTier: string
}

export default async function NewPrescriptionPage() {
    const supabase = createClient()
    const sb = supabase as unknown as {
        from: (t: string) => any
    }

    let catalog: CatalogEntry[] = []
    try {
        const { data } = await sb
            .from('products')
            .select('sku, name, pricing_tier')
            .in('pricing_tier', ['L3', 'L4'])
            .order('name', { ascending: true })
        if (Array.isArray(data)) {
            catalog = (data as Array<{
                sku: string | null
                name: string | null
                pricing_tier: string
            }>)
                .filter((r) => Boolean(r.sku) && Boolean(r.name))
                .map((r) => ({
                    sku: r.sku as string,
                    productName: r.name as string,
                    pricingTier: r.pricing_tier,
                }))
        }
    } catch (error) {
        // Best-effort: form falls back to empty dropdown with a notice.
        safeLog.warn('prescriptions.new', 'catalog fetch failed', { error })
    }

    return (
        <div className="min-h-screen bg-[#0D1729] text-[#FAFAF7]">
            <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-6">
                    <Link
                        href="/practitioner/prescriptions"
                        className="inline-flex items-center gap-1.5 text-sm text-white/60 transition hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to prescriptions
                    </Link>
                </div>
                <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2DA5A0]/15 ring-1 ring-[#2DA5A0]/30">
                        <FileText className="h-5 w-5 text-[#2DA5A0]" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold sm:text-2xl">
                            Issue prescription
                        </h1>
                        <p className="text-sm text-white/60">
                            Authorize a patient to purchase an L3 or L4 SKU.
                        </p>
                    </div>
                </div>
                <IssueForm catalog={catalog} />
            </div>
        </div>
    )
}
