/**
 * Client component for the prescription issue form per Prompt #141 v3
 * Phase F6b.3e2. Two-step UX: practitioner enters patient email and
 * clicks "Find patient" to resolve a user_id, then fills the
 * prescription details and submits to issue.
 *
 * Wraps:
 *   - serverFindPatientByEmail (F6b.3e2) for the email lookup
 *   - serverIssuePrescription (F6b.3b) for the issuance call
 *
 * Default expiry is 90 days from today; practitioner can change. The
 * date input captures a local date which we convert to end-of-day ISO
 * timestamp at submit so a token dated 2026-04-30 stays valid through
 * that day in the patient's wall-clock time.
 *
 * Dosage instructions surface to the patient via F6b.3c
 * serverListMyPrescriptions (microcopy under the textarea reflects
 * this). Clinical notes are practitioner-internal, deliberately omitted
 * from the patient action's SELECT projection per Hannah's F6b.3a
 * verdict (microcopy reflects this too).
 */
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
    AlertTriangle,
    CheckCircle2,
    Search,
    Send,
    UserCheck,
} from 'lucide-react'
import { serverFindPatientByEmail } from '@/lib/prescriptions/lookup-actions'
import { serverIssuePrescription } from '@/lib/prescriptions/practitioner-actions'

interface CatalogEntry {
    sku: string
    productName: string
    pricingTier: string
}

const DEFAULT_EXPIRY_DAYS = 90

function defaultExpiryIsoDate(): string {
    const d = new Date()
    d.setDate(d.getDate() + DEFAULT_EXPIRY_DAYS)
    return d.toISOString().slice(0, 10)
}

export default function IssueForm({ catalog }: { catalog: CatalogEntry[] }) {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [patientUserId, setPatientUserId] = useState<string | null>(null)
    const [lookupError, setLookupError] = useState<string | null>(null)
    const [isLookingUp, setIsLookingUp] = useState(false)

    const [sku, setSku] = useState('')
    const [quantity, setQuantity] = useState(1)
    const [expiresAt, setExpiresAt] = useState(defaultExpiryIsoDate())
    const [dosage, setDosage] = useState('')
    const [notes, setNotes] = useState('')

    const [submitError, setSubmitError] = useState<string | null>(null)
    const [isSubmitting, startTransition] = useTransition()

    async function handleLookup() {
        const trimmed = email.trim()
        if (!trimmed) {
            setLookupError('Enter the patient email.')
            return
        }
        setIsLookingUp(true)
        setLookupError(null)
        try {
            const result = await serverFindPatientByEmail(trimmed)
            if (!result.ok) {
                setLookupError(result.error)
                setPatientUserId(null)
            } else {
                setPatientUserId(result.patientUserId)
                setLookupError(null)
            }
        } finally {
            setIsLookingUp(false)
        }
    }

    function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
        setEmail(e.target.value)
        if (patientUserId) {
            setPatientUserId(null)
            setLookupError(null)
        }
    }

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!patientUserId) {
            setSubmitError('Please look up the patient before issuing.')
            return
        }
        if (!sku) {
            setSubmitError('Choose a SKU.')
            return
        }
        if (quantity < 1) {
            setSubmitError('Quantity must be at least 1.')
            return
        }
        const expiresIso = new Date(`${expiresAt}T23:59:59`).toISOString()

        setSubmitError(null)
        startTransition(async () => {
            const result = await serverIssuePrescription({
                patientUserId,
                sku,
                quantity,
                expiresAt: expiresIso,
                dosageInstructions: dosage.trim() || undefined,
                clinicalNotes: notes.trim() || undefined,
            })
            if (!result.ok) {
                setSubmitError(result.error)
                return
            }
            router.push('/practitioner/prescriptions')
            router.refresh()
        })
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
        >
            <Section title="Patient">
                <label className="block text-sm font-medium text-white/80">Email</label>
                <div className="mt-1.5 flex gap-2">
                    <input
                        type="email"
                        value={email}
                        onChange={handleEmailChange}
                        placeholder="patient@example.com"
                        className="flex-1 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-[#2DA5A0] focus:outline-none focus:ring-1 focus:ring-[#2DA5A0]"
                    />
                    <button
                        type="button"
                        onClick={handleLookup}
                        disabled={isLookingUp || !email.trim()}
                        className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-2 text-sm text-white/90 transition hover:bg-white/15 disabled:opacity-50"
                    >
                        <Search className="h-4 w-4" />
                        {isLookingUp ? 'Looking up' : 'Find patient'}
                    </button>
                </div>
                {patientUserId && (
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-[#2DA5A0]/15 px-2.5 py-1 text-sm text-[#2DA5A0] ring-1 ring-[#2DA5A0]/30">
                        <UserCheck className="h-4 w-4" />
                        Patient found
                    </div>
                )}
                {lookupError && <ErrorRow message={lookupError} />}
            </Section>

            <Section title="Prescription">
                <label className="block text-sm font-medium text-white/80">SKU</label>
                <select
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="mt-1.5 w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#2DA5A0] focus:outline-none focus:ring-1 focus:ring-[#2DA5A0]"
                >
                    <option value="">Select an L3 or L4 SKU</option>
                    {catalog.map((c) => (
                        <option key={c.sku} value={c.sku}>
                            {c.productName} ({c.sku}, {c.pricingTier})
                        </option>
                    ))}
                </select>
                {catalog.length === 0 && (
                    <p className="mt-1.5 text-xs text-amber-300">
                        No L3 or L4 SKUs available in the catalog. Contact ops if this seems wrong.
                    </p>
                )}

                <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-white/80">
                            Quantity authorized
                        </label>
                        <input
                            type="number"
                            min={1}
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                            className="mt-1.5 w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#2DA5A0] focus:outline-none focus:ring-1 focus:ring-[#2DA5A0]"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-white/80">
                            Expires (date)
                        </label>
                        <input
                            type="date"
                            value={expiresAt}
                            onChange={(e) => setExpiresAt(e.target.value)}
                            className="mt-1.5 w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#2DA5A0] focus:outline-none focus:ring-1 focus:ring-[#2DA5A0]"
                        />
                    </div>
                </div>

                <div className="mt-4">
                    <label className="block text-sm font-medium text-white/80">
                        Dosage instructions
                    </label>
                    <textarea
                        rows={2}
                        value={dosage}
                        onChange={(e) => setDosage(e.target.value)}
                        placeholder="e.g., 1 capsule daily with food"
                        className="mt-1.5 w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-[#2DA5A0] focus:outline-none focus:ring-1 focus:ring-[#2DA5A0]"
                    />
                    <p className="mt-1 text-xs text-white/50">
                        Patient will be able to see this on their prescriptions list.
                    </p>
                </div>

                <div className="mt-4">
                    <label className="block text-sm font-medium text-white/80">
                        Clinical notes
                    </label>
                    <textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Internal notes for your records"
                        className="mt-1.5 w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-[#2DA5A0] focus:outline-none focus:ring-1 focus:ring-[#2DA5A0]"
                    />
                    <p className="mt-1 text-xs text-white/50">
                        Internal field; not shown to the patient.
                    </p>
                </div>
            </Section>

            {submitError && <ErrorRow message={submitError} />}

            <div className="flex justify-end gap-2">
                <button
                    type="submit"
                    disabled={isSubmitting || !patientUserId || !sku}
                    className="inline-flex items-center gap-1.5 rounded-md bg-[#2DA5A0] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#34b8b3] disabled:opacity-50"
                >
                    {isSubmitting ? (
                        <>
                            <CheckCircle2 className="h-4 w-4 animate-spin" />
                            Issuing
                        </>
                    ) : (
                        <>
                            <Send className="h-4 w-4" />
                            Issue prescription
                        </>
                    )}
                </button>
            </div>
        </form>
    )
}

function Section({
    title,
    children,
}: {
    title: string
    children: React.ReactNode
}) {
    return (
        <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">
                {title}
            </h2>
            {children}
        </div>
    )
}

function ErrorRow({ message }: { message: string }) {
    return (
        <div className="mt-2 flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-2.5 text-sm text-red-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{message}</span>
        </div>
    )
}
