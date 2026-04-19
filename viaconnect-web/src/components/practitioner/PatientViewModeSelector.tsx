'use client';

// Revised Prompt #91 Phase 5.5: Standard / Naturopathic view toggle.
// Renders only when the signed-in practitioner has a credential type that
// supports the naturopathic view (nd, dc, lac); the parent page is
// responsible for the visibility gate.
//
// Three levels of override:
//   1. URL ?view=standard|naturopathic (transient, current page only)
//   2. patient_view_mode_override on practitioner_patients (persistent)
//   3. practitioner.default_patient_view_mode (account default)
//
// "Save as default for this patient" writes level 2.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Stethoscope, Leaf, BookmarkPlus, Loader2 } from 'lucide-react';

interface Props {
  patientId: string;
  currentMode: 'standard' | 'naturopathic';
  savedOverride: 'standard' | 'naturopathic' | null;
  practitionerDefault: 'standard' | 'naturopathic';
}

export function PatientViewModeSelector({
  patientId, currentMode, savedOverride, practitionerDefault,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveSaved = savedOverride ?? practitionerDefault;
  const isDifferentFromSaved = currentMode !== effectiveSaved;

  function setUrlMode(next: 'standard' | 'naturopathic') {
    router.push(`/practitioner/patients/${patientId}?view=${next}`);
  }

  async function saveAsDefault() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/practitioner/patient-view-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, viewMode: currentMode }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? `Save failed (status ${res.status}).`);
      } else {
        router.refresh();
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 md:flex-row md:items-center">
      <span className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">
        View
      </span>

      <div className="inline-flex overflow-hidden rounded-md border border-white/10">
        <button
          type="button"
          onClick={() => setUrlMode('standard')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-portal-green/40 ${
            currentMode === 'standard'
              ? 'bg-portal-green text-white'
              : 'bg-[#0B1424] text-white/65 hover:bg-white/[0.05]'
          }`}
        >
          <Stethoscope className="h-4 w-4" strokeWidth={1.5} />
          Standard
        </button>
        <button
          type="button"
          onClick={() => setUrlMode('naturopathic')}
          className={`inline-flex items-center gap-2 border-l border-white/10 px-4 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
            currentMode === 'naturopathic'
              ? 'bg-emerald-600 text-white'
              : 'bg-[#0B1424] text-white/65 hover:bg-white/[0.05]'
          }`}
        >
          <Leaf className="h-4 w-4" strokeWidth={1.5} />
          Naturopathic
        </button>
      </div>

      {isDifferentFromSaved && (
        <button
          type="button"
          onClick={saveAsDefault}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-portal-green transition-colors hover:bg-portal-green/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-portal-green/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
          ) : (
            <BookmarkPlus className="h-3 w-3" strokeWidth={1.5} />
          )}
          Save as default for this patient
        </button>
      )}

      {error && <span className="text-xs text-red-300">{error}</span>}
    </div>
  );
}
