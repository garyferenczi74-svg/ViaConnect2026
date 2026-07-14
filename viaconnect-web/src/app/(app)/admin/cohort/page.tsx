'use client';

// Prompt 211b Workstream 1B -- FormaVision cohort research console (admin only).
//
// Enrolls research subjects (consent + chain-of-custody), enters labeled
// measurement pairs per session, triggers a validation run through the
// already-committed cohortLoader -> runValidation -> runAndPersist pipeline
// (via /api/admin/cohort/validation-runs), and displays the CLAIM-GATED
// report: no accuracy number renders unless held_out_pass && gary_signed_off.
//
// This surface is admin/research-role gated server-side by every API route
// it calls (requireResearchAdmin). It is never linked from, or reachable by,
// any consumer surface.
//
// No em-dashes, no en-dashes. Zero `any`. No new dependency. Desktop + mobile
// responsive, 44px touch targets, 16px inputs (text-base).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlaskConical, Plus, RefreshCw, Trash2, UserPlus } from 'lucide-react';
import GatedReportPanel from '@/components/admin/cohort/GatedReportPanel';
import type { GatedAccuracyState } from '@/lib/arnold/scanning/cohort/cohortClaimGate';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const SEX_OPTIONS = ['male', 'female', 'other'] as const;
type Sex = (typeof SEX_OPTIONS)[number];

const PROTOCOL_VERSIONS = ['tape-v1', 'dexa-v1', 'bodpod-v1'] as const;

const GIRTH_REGIONS = [
  'neck', 'upperArm', 'forearm', 'upperLeg', 'lowerLeg', 'chest', 'waist', 'hip',
] as const;
type GirthRegionOption = (typeof GIRTH_REGIONS)[number];

interface SubjectRow {
  id: string;
  sex: Sex;
  height_cm: number;
  weight_kg: number | null;
  body_size_bucket: string | null;
  consent_ledger_id: string | null;
  collected_by: string;
  collected_at: string;
  protocol_version: string;
  notes: string | null;
}

interface PendingPair {
  region: GirthRegionOption;
  predicted_cm: string;
  truth_cm: string;
}

function newSessionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  // Fallback for environments without crypto.randomUUID.
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CohortResearchConsolePage() {
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [gate, setGate] = useState<GatedAccuracyState | null>(null);
  const [runBusy, setRunBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadSubjects = useCallback(async () => {
    setLoadingSubjects(true);
    try {
      const res = await fetch('/api/admin/cohort/subjects');
      if (res.ok) {
        const body = (await res.json()) as { subjects: SubjectRow[] };
        setSubjects(body.subjects);
      }
    } finally {
      setLoadingSubjects(false);
    }
  }, []);

  const loadGate = useCallback(async () => {
    const res = await fetch('/api/admin/cohort/validation-runs');
    if (res.ok) {
      const body = (await res.json()) as { gate: GatedAccuracyState };
      setGate(body.gate);
    }
  }, []);

  useEffect(() => {
    loadSubjects();
    loadGate();
  }, [loadSubjects, loadGate]);

  const triggerRun = useCallback(async () => {
    setRunBusy(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/admin/cohort/validation-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: null }),
      });
      const body = await res.json();
      if (!res.ok) {
        setErrorMessage(body.error ?? 'Could not run validation');
        return;
      }
      setGate(body.gate as GatedAccuracyState);
      setStatusMessage(
        `Run complete: ${body.totalSamples} samples used, ${body.skippedRows} skipped.`,
      );
    } catch {
      setErrorMessage('Could not reach the validation run endpoint.');
    } finally {
      setRunBusy(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#1A2744] text-white px-4 py-6 md:px-8 md:py-10 space-y-6">
      <Header />

      {errorMessage && (
        <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errorMessage}
        </div>
      )}
      {statusMessage && (
        <div className="rounded-lg border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 px-4 py-3 text-sm text-[#8fe0da]">
          {statusMessage}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <EnrollSubjectForm
          onEnrolled={(subject) => {
            setSubjects((prev) => [subject, ...prev]);
            setStatusMessage('Subject enrolled.');
          }}
          onError={setErrorMessage}
        />
        <SubjectsList subjects={subjects} loading={loadingSubjects} onRefresh={loadSubjects} />
      </div>

      <AddMeasurementsForm
        subjects={subjects}
        onSubmitted={(count) => setStatusMessage(`Added ${count} labeled measurement pairs.`)}
        onError={setErrorMessage}
      />

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Validation run</h2>
            <p className="text-xs text-white/50">
              Loads all labeled measurement pairs, runs the harness, and persists the report.
            </p>
          </div>
          <button
            type="button"
            onClick={triggerRun}
            disabled={runBusy}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#B75E18] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#C96D1E] disabled:cursor-not-allowed disabled:opacity-60 w-full sm:w-auto"
          >
            <RefreshCw className={`h-4 w-4 ${runBusy ? 'animate-spin' : ''}`} strokeWidth={1.5} aria-hidden />
            {runBusy ? 'Running...' : 'Trigger validation run'}
          </button>
        </div>
        <GatedReportPanel gate={gate} />
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function Header() {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="w-10 h-10 rounded-xl bg-[#2DA5A0]/20 border border-[#2DA5A0]/33 flex items-center justify-center flex-shrink-0">
        <FlaskConical className="w-5 h-5 text-[#2DA5A0]" strokeWidth={1.5} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="text-lg md:text-xl font-bold text-white">FormaVision cohort research console</h1>
        <p className="text-xs text-white/50">
          Enroll consented subjects, enter labeled measurement pairs, and run the accuracy harness.
          Admin and research roles only. No accuracy figure renders until the held-out cohort passes
          and Gary signs off.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Enroll subject form
// ---------------------------------------------------------------------------

function EnrollSubjectForm({
  onEnrolled,
  onError,
}: {
  onEnrolled: (subject: SubjectRow) => void;
  onError: (message: string) => void;
}) {
  const [sex, setSex] = useState<Sex>('female');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [bodySizeBucket, setBodySizeBucket] = useState('');
  const [consentLedgerId, setConsentLedgerId] = useState('');
  const [protocolVersion, setProtocolVersion] = useState<string>(PROTOCOL_VERSIONS[0]);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setBusy(true);
      try {
        const res = await fetch('/api/admin/cohort/subjects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sex,
            height_cm: Number(heightCm),
            weight_kg: weightKg ? Number(weightKg) : null,
            body_size_bucket: bodySizeBucket || null,
            consent_ledger_id: consentLedgerId,
            protocol_version: protocolVersion,
            notes: notes || null,
          }),
        });
        const body = await res.json();
        if (!res.ok) {
          onError(body.error ?? 'Could not enroll subject');
          return;
        }
        onEnrolled(body.subject as SubjectRow);
        setHeightCm('');
        setWeightKg('');
        setBodySizeBucket('');
        setConsentLedgerId('');
        setNotes('');
      } catch {
        onError('Could not reach the enrollment endpoint.');
      } finally {
        setBusy(false);
      }
    },
    [sex, heightCm, weightKg, bodySizeBucket, consentLedgerId, protocolVersion, notes, onEnrolled, onError],
  );

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-6 space-y-4"
    >
      <div className="flex items-center gap-2">
        <UserPlus className="w-4 h-4 text-[#2DA5A0]" strokeWidth={1.5} aria-hidden />
        <h2 className="text-base font-semibold text-white">Enroll subject</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs text-white/60">
          Sex
          <select
            value={sex}
            onChange={(e) => setSex(e.target.value as Sex)}
            className="min-h-[44px] rounded-lg border border-white/15 bg-[#0E1A30] px-3 text-base text-white"
          >
            {SEX_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-white/60">
          Height (cm)
          <input
            type="number"
            required
            min={1}
            step="0.1"
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
            className="min-h-[44px] rounded-lg border border-white/15 bg-[#0E1A30] px-3 text-base text-white"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-white/60">
          Weight (kg, optional)
          <input
            type="number"
            min={1}
            step="0.1"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            className="min-h-[44px] rounded-lg border border-white/15 bg-[#0E1A30] px-3 text-base text-white"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-white/60">
          Body size bucket (optional)
          <input
            type="text"
            maxLength={10}
            placeholder="S / M / L / XL"
            value={bodySizeBucket}
            onChange={(e) => setBodySizeBucket(e.target.value)}
            className="min-h-[44px] rounded-lg border border-white/15 bg-[#0E1A30] px-3 text-base text-white"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-white/60 sm:col-span-2">
          Consent ledger reference (required)
          <input
            type="text"
            required
            placeholder="consent_ledger.id (uuid)"
            value={consentLedgerId}
            onChange={(e) => setConsentLedgerId(e.target.value)}
            className="min-h-[44px] rounded-lg border border-white/15 bg-[#0E1A30] px-3 text-base text-white"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-white/60">
          Protocol version
          <select
            value={protocolVersion}
            onChange={(e) => setProtocolVersion(e.target.value)}
            className="min-h-[44px] rounded-lg border border-white/15 bg-[#0E1A30] px-3 text-base text-white"
          >
            {PROTOCOL_VERSIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-white/60 sm:col-span-2">
          Notes (optional)
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="rounded-lg border border-white/15 bg-[#0E1A30] px-3 py-2 text-base text-white"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#2DA5A0] px-4 text-sm font-medium text-white transition hover:bg-[#37bab4] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        <Plus className="w-4 h-4" strokeWidth={1.5} aria-hidden />
        {busy ? 'Enrolling...' : 'Enroll subject'}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Subjects list (chain-of-custody visible: who / when / protocol / consent)
// ---------------------------------------------------------------------------

function SubjectsList({
  subjects,
  loading,
  onRefresh,
}: {
  subjects: SubjectRow[];
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-6 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">Enrolled subjects</h2>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs text-white/70 hover:bg-white/[0.08]"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} aria-hidden />
          Refresh
        </button>
      </div>

      {subjects.length === 0 ? (
        <p className="text-sm text-white/50">No subjects enrolled yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-white/40 uppercase tracking-wide">
                <th className="py-2 pr-3">Subject</th>
                <th className="py-2 pr-3">Sex</th>
                <th className="py-2 pr-3">Protocol</th>
                <th className="py-2 pr-3">Collected by</th>
                <th className="py-2 pr-3">Collected at</th>
                <th className="py-2 pr-3">Consent ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {subjects.map((s) => (
                <tr key={s.id} className="text-white/75">
                  <td className="py-2 pr-3 font-mono">{s.id.slice(0, 8)}</td>
                  <td className="py-2 pr-3">{s.sex}</td>
                  <td className="py-2 pr-3">{s.protocol_version}</td>
                  <td className="py-2 pr-3 font-mono">{s.collected_by.slice(0, 8)}</td>
                  <td className="py-2 pr-3">{new Date(s.collected_at).toLocaleDateString()}</td>
                  <td className="py-2 pr-3">
                    {s.consent_ledger_id ? (
                      <span className="font-mono">{s.consent_ledger_id.slice(0, 8)}</span>
                    ) : (
                      <span className="text-amber-300">missing</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add labeled measurement pairs (per subject + session)
// ---------------------------------------------------------------------------

function AddMeasurementsForm({
  subjects,
  onSubmitted,
  onError,
}: {
  subjects: SubjectRow[];
  onSubmitted: (count: number) => void;
  onError: (message: string) => void;
}) {
  const [subjectId, setSubjectId] = useState('');
  const [sessionId, setSessionId] = useState(() => newSessionId());
  const [region, setRegion] = useState<GirthRegionOption>('waist');
  const [predictedCm, setPredictedCm] = useState('');
  const [truthCm, setTruthCm] = useState('');
  const [pairs, setPairs] = useState<PendingPair[]>([]);
  const [busy, setBusy] = useState(false);

  const canAddPair = useMemo(
    () => predictedCm !== '' && truthCm !== '' && Number(predictedCm) > 0 && Number(truthCm) > 0,
    [predictedCm, truthCm],
  );

  const addPair = useCallback(() => {
    if (!canAddPair) return;
    setPairs((prev) => [...prev, { region, predicted_cm: predictedCm, truth_cm: truthCm }]);
    setPredictedCm('');
    setTruthCm('');
  }, [canAddPair, region, predictedCm, truthCm]);

  const removePair = useCallback((index: number) => {
    setPairs((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const submitSession = useCallback(async () => {
    if (!subjectId || pairs.length === 0) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/cohort/measurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_id: subjectId,
          session_id: sessionId,
          measurements: pairs.map((p) => ({
            region: p.region,
            predicted_cm: Number(p.predicted_cm),
            truth_cm: Number(p.truth_cm),
          })),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        onError(body.error ?? 'Could not add labeled measurements');
        return;
      }
      onSubmitted(pairs.length);
      setPairs([]);
      setSessionId(newSessionId());
    } catch {
      onError('Could not reach the measurements endpoint.');
    } finally {
      setBusy(false);
    }
  }, [subjectId, sessionId, pairs, onSubmitted, onError]);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-6 space-y-4">
      <h2 className="text-base font-semibold text-white">Labeled measurement pairs</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs text-white/60">
          Subject
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="min-h-[44px] rounded-lg border border-white/15 bg-[#0E1A30] px-3 text-base text-white"
          >
            <option value="">Select a subject</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.id.slice(0, 8)} ({s.sex})</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-white/60">
          Session id
          <input
            type="text"
            readOnly
            value={sessionId}
            className="min-h-[44px] rounded-lg border border-white/15 bg-[#0E1A30] px-3 text-base text-white/60 font-mono"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <label className="flex flex-col gap-1 text-xs text-white/60">
          Region
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value as GirthRegionOption)}
            className="min-h-[44px] rounded-lg border border-white/15 bg-[#0E1A30] px-3 text-base text-white"
          >
            {GIRTH_REGIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-white/60">
          Predicted (cm)
          <input
            type="number"
            min={0.1}
            step="0.1"
            value={predictedCm}
            onChange={(e) => setPredictedCm(e.target.value)}
            className="min-h-[44px] rounded-lg border border-white/15 bg-[#0E1A30] px-3 text-base text-white"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-white/60">
          Truth (cm)
          <input
            type="number"
            min={0.1}
            step="0.1"
            value={truthCm}
            onChange={(e) => setTruthCm(e.target.value)}
            className="min-h-[44px] rounded-lg border border-white/15 bg-[#0E1A30] px-3 text-base text-white"
          />
        </label>

        <button
          type="button"
          onClick={addPair}
          disabled={!canAddPair}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-[#2DA5A0]/40 bg-[#2DA5A0]/10 px-3 text-sm text-[#2DA5A0] hover:bg-[#2DA5A0]/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="w-4 h-4" strokeWidth={1.5} aria-hidden />
          Add pair
        </button>
      </div>

      {pairs.length > 0 && (
        <ul className="divide-y divide-white/[0.06] rounded-lg border border-white/10">
          {pairs.map((p, i) => (
            <li key={`${p.region}-${i}`} className="flex items-center justify-between px-3 py-2 text-sm text-white/75">
              <span>
                {p.region}: predicted {p.predicted_cm} cm, truth {p.truth_cm} cm
              </span>
              <button
                type="button"
                onClick={() => removePair(i)}
                aria-label={`Remove ${p.region} pair`}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-white/40 hover:bg-white/[0.06] hover:text-red-300"
              >
                <Trash2 className="w-4 h-4" strokeWidth={1.5} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={submitSession}
        disabled={busy || !subjectId || pairs.length === 0}
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#2DA5A0] px-4 text-sm font-medium text-white transition hover:bg-[#37bab4] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {busy ? 'Submitting...' : `Submit session (${pairs.length} pairs)`}
      </button>
    </section>
  );
}
