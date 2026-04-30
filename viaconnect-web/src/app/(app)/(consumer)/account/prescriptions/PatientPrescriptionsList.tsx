/**
 * Client component for the patient prescriptions list per Prompt #141
 * v3 Phase F6b.3f. Renders status filter chips and per-prescription
 * cards. Read-only: patients view their tokens but cannot revoke (only
 * the issuing practitioner can revoke per the F6b.3a prescription_revoke
 * RPC contract).
 *
 * Distinct from the practitioner-side PrescriptionsList (F6b.3e) in
 * three ways:
 *   1. No revoke action (patient is not the principal who can revoke).
 *   2. Surfaces dosage_instructions prominently as patient-facing dosing
 *      guidance.
 *   3. Surfaces revocation_reason (when status=revoked) so the patient
 *      knows why their authorization was withdrawn.
 *   4. Omits clinical_notes entirely (F6b.3c serverListMyPrescriptions
 *      excludes it from the SELECT projection per Hannah's HIPAA-aware
 *      posture; F6b.3g may add a column-grant defense-in-depth on top).
 */
'use client'

import { useMemo, useState } from 'react'
import { Clock, Pill } from 'lucide-react'
import type {
    PatientPrescription,
    PrescriptionStatus,
} from '@/lib/prescriptions/patient-actions'

type FilterKey = 'all' | PrescriptionStatus

const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'consumed', label: 'Used' },
    { key: 'revoked', label: 'Revoked' },
    { key: 'expired', label: 'Expired' },
]

const STATUS_STYLE: Record<
    PrescriptionStatus,
    { dot: string; label: string; pill: string }
> = {
    active: {
        dot: 'bg-[#2DA5A0]',
        label: 'Active',
        pill: 'bg-[#2DA5A0]/15 text-[#2DA5A0] ring-1 ring-[#2DA5A0]/30',
    },
    consumed: {
        dot: 'bg-white/40',
        label: 'Used',
        pill: 'bg-white/10 text-white/70 ring-1 ring-white/20',
    },
    revoked: {
        dot: 'bg-red-400',
        label: 'Revoked',
        pill: 'bg-red-500/15 text-red-300 ring-1 ring-red-400/30',
    },
    expired: {
        dot: 'bg-amber-400',
        label: 'Expired',
        pill: 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/30',
    },
}

export default function PatientPrescriptionsList({
    prescriptions,
}: {
    prescriptions: PatientPrescription[]
}) {
    const [filter, setFilter] = useState<FilterKey>('all')

    const filtered = useMemo(() => {
        if (filter === 'all') return prescriptions
        return prescriptions.filter((p) => p.status === filter)
    }, [prescriptions, filter])

    const counts = useMemo(() => {
        const tally: Record<FilterKey, number> = {
            all: prescriptions.length,
            active: 0,
            consumed: 0,
            revoked: 0,
            expired: 0,
        }
        for (const p of prescriptions) {
            tally[p.status] += 1
        }
        return tally
    }, [prescriptions])

    return (
        <>
            <div className="mb-4 flex flex-wrap gap-2">
                {FILTERS.map((f) => {
                    const isActive = filter === f.key
                    return (
                        <button
                            key={f.key}
                            type="button"
                            onClick={() => setFilter(f.key)}
                            className={
                                'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition ' +
                                (isActive
                                    ? 'bg-[#2DA5A0] text-white'
                                    : 'bg-white/5 text-white/70 ring-1 ring-white/10 hover:bg-white/10')
                            }
                        >
                            {f.label}
                            <span
                                className={
                                    'rounded-full px-2 py-0.5 text-xs ' +
                                    (isActive ? 'bg-white/20' : 'bg-white/10')
                                }
                            >
                                {counts[f.key]}
                            </span>
                        </button>
                    )
                })}
            </div>

            {filtered.length === 0 ? (
                <EmptyState filter={filter} />
            ) : (
                <ul className="space-y-3">
                    {filtered.map((p) => (
                        <PatientPrescriptionCard key={p.id} prescription={p} />
                    ))}
                </ul>
            )}
        </>
    )
}

function EmptyState({ filter }: { filter: FilterKey }) {
    return (
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-10 text-center">
            <p className="text-sm text-white/60">
                {filter === 'all'
                    ? 'You do not have any prescriptions on file.'
                    : `No ${filter === 'consumed' ? 'used' : filter} prescriptions.`}
            </p>
        </div>
    )
}

function PatientPrescriptionCard({
    prescription: p,
}: {
    prescription: PatientPrescription
}) {
    const style = STATUS_STYLE[p.status]
    const remaining = Math.max(0, p.quantityAuthorized - p.quantityConsumed)
    const issuedFmt = formatDate(p.issuedAt)
    const expiresFmt = formatDate(p.expiresAt)
    const expiresSoon =
        p.status === 'active' &&
        Date.parse(p.expiresAt) - Date.now() < 7 * 24 * 60 * 60 * 1000

    return (
        <li className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${style.pill}`}
                        >
                            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                            {style.label}
                        </span>
                        {expiresSoon && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs text-amber-200 ring-1 ring-amber-400/30">
                                <Clock className="h-3 w-3" />
                                Expires soon
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Pill className="h-4 w-4 text-white/50" />
                        <h3 className="truncate text-base font-medium">{p.sku}</h3>
                    </div>
                </div>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <Field label="Authorized" value={String(p.quantityAuthorized)} />
                <Field label="Remaining" value={String(remaining)} />
                <Field label="Issued" value={issuedFmt} />
                <Field label="Expires" value={expiresFmt} />
            </dl>

            {p.dosageInstructions && (
                <div className="mt-3 rounded-md border border-[#2DA5A0]/20 bg-[#2DA5A0]/5 p-3 text-sm">
                    <div className="text-xs uppercase tracking-wide text-[#2DA5A0]">
                        Dosage
                    </div>
                    <div className="mt-1 text-white/90">{p.dosageInstructions}</div>
                </div>
            )}

            {p.status === 'revoked' && p.revocationReason && (
                <div className="mt-3 rounded-md border border-red-500/20 bg-red-500/5 p-3 text-sm">
                    <div className="text-xs uppercase tracking-wide text-red-300">
                        Revocation reason
                    </div>
                    <div className="mt-1 text-white/90">{p.revocationReason}</div>
                </div>
            )}
        </li>
    )
}

function Field({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-white/50">{label}</dt>
            <dd className="mt-0.5 text-white/90">{value}</dd>
        </div>
    )
}

function formatDate(iso: string): string {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
}
