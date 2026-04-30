/**
 * Patient prescriptions list page per Prompt #141 v3 Phase F6b.3f.
 * Server component fetches the patient's prescription tokens via the
 * F6b.3c serverListMyPrescriptions action (RLS-gated to patient_user_id
 * = auth.uid()) and hands off to the client component for filtering
 * and the details surface.
 *
 * Practitioner identity resolution (display name from practitioner_user_id
 * uuid) is intentionally not included in F6b.3f. The patient already
 * knows which practitioner issued each token from the consultation
 * context; surfacing a name without a verified profile RLS pattern
 * risks leaking display info beyond the practitioner-patient
 * relationship. F6b.3g audit phase can land a SECURITY DEFINER RPC
 * scoped to "practitioners who have issued me prescriptions" if the
 * UX warrants.
 */
import Link from 'next/link'
import { ClipboardList } from 'lucide-react'
import { serverListMyPrescriptions } from '@/lib/prescriptions/patient-actions'
import PatientPrescriptionsList from './PatientPrescriptionsList'

export const dynamic = 'force-dynamic'

export default async function PatientPrescriptionsPage() {
    const result = await serverListMyPrescriptions({ limit: 200 })

    return (
        <div className="text-white">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2DA5A0]/15 ring-1 ring-[#2DA5A0]/30">
                        <ClipboardList className="h-5 w-5 text-[#2DA5A0]" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold sm:text-2xl">My prescriptions</h2>
                        <p className="text-sm text-white/60">
                            Authorizations from your practitioner for prescription products.
                        </p>
                    </div>
                </div>
                <Link
                    href="/practitioners"
                    className="inline-flex items-center gap-2 self-start rounded-lg bg-white/5 px-4 py-2.5 text-sm text-white/80 ring-1 ring-white/10 transition hover:bg-white/10 sm:self-auto"
                >
                    Find a practitioner
                </Link>
            </div>

            {!result.ok ? (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                    {result.error}
                </div>
            ) : (
                <PatientPrescriptionsList prescriptions={result.prescriptions} />
            )}
        </div>
    )
}
