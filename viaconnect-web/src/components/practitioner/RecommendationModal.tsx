'use client';

// RecommendationModal — full recommendation form for practitioners /
// naturopaths to formally attach a peptide (or other product) to a patient
// profile. Writes to practitioner_recommendations.
//
// Naturopath restriction: cannot use 'prescribed' recommendation_type.
// Enforced both in UI (radio option hidden) and on the application side
// (database has practitioner_role column for audit but doesn't enforce).

import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { X, Check, Loader2, AlertTriangle, Stethoscope } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { usePractitioner } from '@/context/PractitionerContext';

interface PeptideMinimal {
  /** product_slug to record. For peptides this is typically the registry id. */
  slug: string;
  /** Display name */
  name: string;
  /** product_type written to the row. */
  productType: 'peptide' | 'supplement' | 'genetic_test' | 'custom_package';
  /** Optional category (just stored in metadata) */
  category?: string;
  /** Available delivery forms for the radio buttons. */
  deliveryForms?: string[];
}

interface RecommendationModalProps {
  product: PeptideMinimal;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

type RecType = 'prescribed' | 'suggested' | 'informational';
type Priority = 'critical' | 'high' | 'normal' | 'low';

const PRIORITY_LABELS: Record<Priority, string> = {
  critical: 'Critical',
  high: 'High',
  normal: 'Normal',
  low: 'Low',
};

const DEFAULT_DURATIONS = [
  { label: '14 days', value: 14 },
  { label: '30 days', value: 30 },
  { label: '60 days', value: 60 },
  { label: '90 days', value: 90 },
  { label: 'Ongoing', value: 0 },
];

const DELIVERY_LABELS: Record<string, string> = {
  liposomal: 'Liposomal',
  micellar: 'Micellar',
  injectable: 'Injectable',
  nasal_spray: 'Nasal Spray',
};

export function RecommendationModal({
  product,
  open,
  onClose,
  onSaved,
}: RecommendationModalProps) {
  const { selectedPatient, portalType } = usePractitioner();
  const supabase = createClient();

  const canPrescribe = portalType === 'practitioner';

  const [recType, setRecType] = useState<RecType>(
    canPrescribe ? 'prescribed' : 'suggested',
  );
  const [priority, setPriority] = useState<Priority>('normal');
  const [deliveryForm, setDeliveryForm] = useState<string>(
    product.deliveryForms?.[0] ?? '',
  );
  const [durationDays, setDurationDays] = useState<number>(30);
  const [dosingInstructions, setDosingInstructions] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedPatient) {
      setError('No patient selected. Pick a patient first.');
      return;
    }

    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError('Not signed in.');
      setSaving(false);
      return;
    }

    const { error: insertError } = await (supabase as any)
      .from('practitioner_recommendations')
      .insert({
        practitioner_id: user.id,
        patient_id: selectedPatient.id,
        practitioner_role: portalType,
        product_slug: product.slug,
        product_name: product.name,
        product_type: product.productType,
        recommendation_type: recType,
        priority,
        delivery_form: deliveryForm || null,
        duration_days: durationDays > 0 ? durationDays : null,
        dosing_instructions: dosingInstructions || null,
        notes: notes || null,
        status: 'active',
        metadata: {
          category: product.category ?? null,
          recordedFromPortal: portalType,
        },
      });

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    onSaved?.();
    onClose();
  };

  const accent = portalType === 'naturopath' ? '#B75E18' : '#2DA5A0';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-2xl overflow-hidden rounded-t-2xl border border-[rgba(255,255,255,0.10)] bg-[#1E3054] shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-[rgba(255,255,255,0.06)] px-5 py-4 sm:px-6 sm:py-5">
            <div className="min-w-0">
              <p
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: accent }}
              >
                Recommend To {selectedPatient?.firstName ?? 'Patient'}
              </p>
              <h2 className="mt-1 break-words text-base font-bold text-white sm:text-lg">
                {product.name}
              </h2>
              {product.category && (
                <p className="mt-0.5 text-xs text-[rgba(255,255,255,0.45)]">
                  {product.category}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.55)] transition-all hover:border-[rgba(255,255,255,0.20)] hover:text-white"
              aria-label="Close"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-4 px-5 py-4 sm:px-6 sm:py-5">
            {/* Recommendation type */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.40)]">
                Recommendation Type
              </p>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {canPrescribe && (
                  <RadioPill
                    label="Prescribed"
                    description="Formal prescription"
                    selected={recType === 'prescribed'}
                    onClick={() => setRecType('prescribed')}
                    accent={accent}
                  />
                )}
                <RadioPill
                  label="Suggested"
                  description="Recommended but optional"
                  selected={recType === 'suggested'}
                  onClick={() => setRecType('suggested')}
                  accent={accent}
                />
                <RadioPill
                  label="Informational"
                  description="For patient awareness"
                  selected={recType === 'informational'}
                  onClick={() => setRecType('informational')}
                  accent={accent}
                />
              </div>
              {!canPrescribe && (
                <p className="mt-1.5 text-[10px] text-[rgba(255,255,255,0.40)]">
                  Naturopaths can suggest but cannot prescribe peptides.
                </p>
              )}
            </div>

            {/* Priority */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.40)]">
                Priority
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => (
                  <RadioPill
                    key={p}
                    label={PRIORITY_LABELS[p]}
                    selected={priority === p}
                    onClick={() => setPriority(p)}
                    accent={accent}
                  />
                ))}
              </div>
            </div>

            {/* Delivery form + duration */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {product.deliveryForms && product.deliveryForms.length > 0 && (
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.40)]">
                    Delivery Form
                  </label>
                  <select
                    value={deliveryForm}
                    onChange={(e) => setDeliveryForm(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] px-3 text-sm text-white outline-none transition-all focus:border-[rgba(45,165,160,0.40)]"
                  >
                    {product.deliveryForms.map((df) => (
                      <option key={df} value={df} className="bg-[#1A2744]">
                        {DELIVERY_LABELS[df] ?? df}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.40)]">
                  Duration
                </label>
                <select
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                  className="mt-1 h-10 w-full rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] px-3 text-sm text-white outline-none transition-all focus:border-[rgba(45,165,160,0.40)]"
                >
                  {DEFAULT_DURATIONS.map((d) => (
                    <option key={d.value} value={d.value} className="bg-[#1A2744]">
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dosing */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.40)]">
                Dosing Instructions
              </label>
              <textarea
                value={dosingInstructions}
                onChange={(e) => setDosingInstructions(e.target.value)}
                rows={2}
                placeholder="e.g., 500mcg twice daily with meals"
                className="mt-1 w-full rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-white placeholder:text-[rgba(255,255,255,0.30)] outline-none transition-all focus:border-[rgba(45,165,160,0.40)]"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.40)]">
                Notes for Patient
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Any additional context or instructions for the patient"
                className="mt-1 w-full rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-white placeholder:text-[rgba(255,255,255,0.30)] outline-none transition-all focus:border-[rgba(45,165,160,0.40)]"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-[rgba(239,68,68,0.30)] bg-[rgba(239,68,68,0.08)] px-3 py-2">
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#F87171]"
                  strokeWidth={1.5}
                />
                <p className="text-xs text-[rgba(255,255,255,0.65)]">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex flex-col gap-2 border-t border-[rgba(255,255,255,0.06)] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] px-5 py-2.5 text-sm font-medium text-[rgba(255,255,255,0.65)] transition-all hover:border-[rgba(255,255,255,0.20)] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !selectedPatient}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                backgroundColor: accent,
              }}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                  Saving
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" strokeWidth={1.5} />
                  Save Recommendation
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// Reusable radio pill button used across the form
function RadioPill({
  label,
  description,
  selected,
  onClick,
  accent,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
  accent: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border px-3 py-2 text-left text-sm transition-all"
      style={{
        backgroundColor: selected ? `${accent}1A` : 'rgba(255,255,255,0.03)',
        borderColor: selected ? `${accent}66` : 'rgba(255,255,255,0.10)',
        color: selected ? accent : 'rgba(255,255,255,0.65)',
      }}
    >
      <div className="font-semibold">{label}</div>
      {description && (
        <div className="mt-0.5 text-[10px] font-normal text-[rgba(255,255,255,0.40)]">
          {description}
        </div>
      )}
    </button>
  );
}
