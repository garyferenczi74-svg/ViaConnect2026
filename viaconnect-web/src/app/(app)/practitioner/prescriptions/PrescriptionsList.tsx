/**
 * Client component for the practitioner prescriptions list per Prompt
 * #141 v3 Phase F6b.3e. Renders status filter chips, sorted token cards,
 * and the revoke modal flow. Wraps serverRevokePrescription from F6b.3b.
 *
 * Hannah F6b.3c verdict note: revocation reason field includes microcopy
 * "Patient will see this reason." so practitioners write patient-appropriate
 * text rather than internal shorthand.
 */
'use client'

import { useMemo, useState, useTransition } from 'react'
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Clock, X, XCircle } from 'lucide-react'
import {
    serverGetIssuedPrescriptionClinicalNotes,
    serverRevokePrescription,
    type IssuedPrescription,
    type PrescriptionStatus,
} from '@/lib/prescriptions/practitioner-actions'

type FilterKey = 'all' | PrescriptionStatus

const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'consumed', label: 'Consumed' },
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
        label: 'Consumed',
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

export default function PrescriptionsList({
    prescriptions,
}: {
    prescriptions: IssuedPrescription[]
}) {
    const [filter, setFilter] = useState<FilterKey>('all')
    const [revokingId, setRevokingId] = useState<string | null>(null)

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
                        <PrescriptionCard
                            key={p.id}
                            prescription={p}
                            onRevokeClick={() => setRevokingId(p.id)}
                        />
                    ))}
                </ul>
            )}

            {revokingId && (
                <RevokeModal
                    prescription={
                        prescriptions.find((p) => p.id === revokingId) as IssuedPrescription
                    }
                    onClose={() => setRevokingId(null)}
                />
            )}
        </>
    )
}

function EmptyState({ filter }: { filter: FilterKey }) {
    return (
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-10 text-center">
            <p className="text-sm text-white/60">
                {filter === 'all'
                    ? 'You have not issued any prescriptions yet.'
                    : `No ${filter} prescriptions.`}
            </p>
        </div>
    )
}

function PrescriptionCard({
    prescription: p,
    onRevokeClick,
}: {
    prescription: IssuedPrescription
    onRevokeClick: () => void
}) {
    const style = STATUS_STYLE[p.status]
    const remaining = Math.max(0, p.quantityAuthorized - p.quantityConsumed)
    const truncatedPatient = `${p.patientUserId.slice(0, 8)}...`
    const issuedFmt = formatDate(p.issuedAt)
    const expiresFmt = formatDate(p.expiresAt)
    const expiresSoon =
        p.status === 'active' &&
        Date.parse(p.expiresAt) - Date.now() < 7 * 24 * 60 * 60 * 1000

    return (
        <li className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
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
                    <h3 className="truncate text-base font-medium">{p.sku}</h3>
                    <p className="text-sm text-white/60">
                        Patient {truncatedPatient}
                    </p>
                </div>
                {p.status === 'active' && (
                    <button
                        type="button"
                        onClick={onRevokeClick}
                        className="inline-flex items-center gap-1.5 rounded-md bg-red-500/15 px-3 py-1.5 text-sm text-red-200 ring-1 ring-red-400/30 transition hover:bg-red-500/25"
                    >
                        <XCircle className="h-4 w-4" />
                        Revoke
                    </button>
                )}
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <Field label="Authorized" value={String(p.quantityAuthorized)} />
                <Field label="Remaining" value={String(remaining)} />
                <Field label="Issued" value={issuedFmt} />
                <Field label="Expires" value={expiresFmt} />
            </dl>

            {(p.dosageInstructions || p.revocationReason) && (
                <div className="mt-3 space-y-2 border-t border-white/10 pt-3 text-sm">
                    {p.dosageInstructions && (
                        <div>
                            <span className="text-white/50">Dosage:</span>{' '}
                            <span className="text-white/80">{p.dosageInstructions}</span>
                        </div>
                    )}
                    {p.revocationReason && (
                        <div>
                            <span className="text-white/50">Revocation reason:</span>{' '}
                            <span className="text-red-200">{p.revocationReason}</span>
                        </div>
                    )}
                </div>
            )}

            <ClinicalNotesSection tokenId={p.id} />
        </li>
    )
}

function ClinicalNotesSection({ tokenId }: { tokenId: string }) {
    const [isOpen, setIsOpen] = useState(false)
    const [hasLoaded, setHasLoaded] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [notes, setNotes] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    async function handleToggle() {
        if (!isOpen && !hasLoaded) {
            setIsLoading(true)
            setError(null)
            const result = await serverGetIssuedPrescriptionClinicalNotes(tokenId)
            if (result.ok) {
                setNotes(result.notes)
            } else {
                setError(result.error)
            }
            setHasLoaded(true)
            setIsLoading(false)
        }
        setIsOpen((v) => !v)
    }

    return (
        <div className="mt-3 border-t border-white/10 pt-3">
            <button
                type="button"
                onClick={handleToggle}
                className="inline-flex items-center gap-1.5 text-xs text-white/60 transition hover:text-white"
            >
                {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {isOpen ? 'Hide clinical notes' : 'View clinical notes'}
            </button>
            {isOpen && (
                <div className="mt-2 text-sm">
                    {isLoading && <span className="text-white/50">Loading...</span>}
                    {error && (
                        <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-red-200">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                            <span className="text-xs">{error}</span>
                        </div>
                    )}
                    {!isLoading && !error && hasLoaded && (
                        <span className="text-white/80">
                            {notes && notes.trim().length > 0 ? (
                                notes
                            ) : (
                                <span className="italic text-white/40">No clinical notes recorded.</span>
                            )}
                        </span>
                    )}
                </div>
            )}
        </div>
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

function RevokeModal({
    prescription,
    onClose,
}: {
    prescription: IssuedPrescription
    onClose: () => void
}) {
    const [reason, setReason] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const trimmed = reason.trim()
        if (!trimmed) {
            setError('A revocation reason is required.')
            return
        }
        setError(null)
        startTransition(async () => {
            const result = await serverRevokePrescription(prescription.id, trimmed)
            if (result.ok) {
                window.location.reload()
            } else {
                setError(result.error)
            }
        })
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-xl border border-white/10 bg-[#0F1A2F] p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-400" />
                        <h2 className="text-lg font-semibold">Revoke prescription</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <p className="mb-4 text-sm text-white/70">
                    Revoking the {prescription.sku} prescription cannot be undone. The
                    patient will not be able to use this token again.
                </p>

                <form onSubmit={handleSubmit}>
                    <label className="block text-sm font-medium text-white/80">
                        Reason for revocation
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={3}
                        placeholder="e.g., switched to alternate protocol"
                        className="mt-1.5 w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-[#2DA5A0] focus:outline-none focus:ring-1 focus:ring-[#2DA5A0]"
                    />
                    <p className="mt-1.5 text-xs text-white/50">
                        Patient will see this reason.
                    </p>

                    {error && (
                        <div className="mt-3 flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-2.5 text-sm text-red-200">
                            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="mt-5 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isPending}
                            className="rounded-md px-4 py-2 text-sm text-white/70 transition hover:bg-white/10 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isPending || !reason.trim()}
                            className="inline-flex items-center gap-1.5 rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
                        >
                            {isPending ? (
                                <>
                                    <Clock className="h-4 w-4 animate-spin" />
                                    Revoking
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-4 w-4" />
                                    Confirm revoke
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
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
