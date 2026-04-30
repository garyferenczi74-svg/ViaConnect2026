/**
 * Practitioner prescriptions list page per Prompt #141 v3 Phase F6b.3e.
 * Server component fetches the practitioner's issued tokens via the
 * F6b.3b serverListMyIssuedPrescriptions action (RLS-gated to
 * practitioner_user_id = auth.uid()) and hands off to the client
 * component for filtering, sorting, and the revoke modal flow.
 *
 * Patient identity resolution (display name from practitioner_user_id
 * uuid) is deferred to F6b.3e2 along with the new-prescription issue
 * form which needs the same patient lookup RPC. F6b.3e shows truncated
 * uuid as the patient identifier; the practitioner can match by SKU,
 * issue date, and quantity which is sufficient for revoke decisions.
 */
import Link from 'next/link'
import { Plus, Pill } from 'lucide-react'
import { serverListMyIssuedPrescriptions } from '@/lib/prescriptions/practitioner-actions'
import PrescriptionsList from './PrescriptionsList'

export const dynamic = 'force-dynamic'

export default async function PractitionerPrescriptionsPage() {
    const result = await serverListMyIssuedPrescriptions({ limit: 200 })

    return (
        <div className="min-h-screen bg-[#0D1729] text-[#FAFAF7]">
            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2DA5A0]/15 ring-1 ring-[#2DA5A0]/30">
                            <Pill className="h-5 w-5 text-[#2DA5A0]" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold sm:text-2xl">Prescriptions</h1>
                            <p className="text-sm text-white/60">
                                Tokens you have issued for L3 and L4 SKU purchases.
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/practitioner/prescriptions/new"
                        className="inline-flex items-center gap-2 self-start rounded-lg bg-[#2DA5A0] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#34b8b3] sm:self-auto"
                    >
                        <Plus className="h-4 w-4" />
                        Issue prescription
                    </Link>
                </div>

                {!result.ok ? (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                        {result.error}
                    </div>
                ) : (
                    <PrescriptionsList prescriptions={result.prescriptions} />
                )}
            </div>
        </div>
    )
}
