'use client';

// Prompt #96 Phase 2: Practitioner enrollment client.
//
// Three-step UX:
//   1. Explainer card explaining Level 3 White-Label
//   2. Eligibility check (calls the API; renders the three-path result)
//   3. Begin Enrollment CTA when eligible
//
// On successful enrollment, routes the practitioner toward brand setup
// (Phase 3, not yet built; placeholder shown).

import { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  XCircle,
  Loader2,
  Award,
  Briefcase,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';

interface EligibilityResponse {
  practitioner_id: string;
  is_eligible: boolean;
  qualifying_paths: string[];
  primary_path: string | null;
  reasons: string[];
  evidence: Record<string, unknown>;
}

interface EnrollmentResponse {
  enrollment: { id: string; status: string; qualifying_path: string; enrolled_at: string };
  was_existing: boolean;
}

const PATH_LABELS: Record<string, { label: string; Icon: typeof Award }> = {
  certification_level_3:           { label: 'Level 3 Master Practitioner certification', Icon: Award },
  white_label_tier_subscription:   { label: 'White-Label Platform tier subscription',    Icon: Briefcase },
  volume_threshold:                { label: '12+ months tenure with $25K+ wholesale',    Icon: TrendingUp },
};

export default function EnrollClient() {
  const [eligibility, setEligibility] = useState<EligibilityResponse | null>(null);
  const [enrollment, setEnrollment] = useState<EnrollmentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkEligibility() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/practitioner/white-label/eligibility');
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      setEligibility(json as EligibilityResponse);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function enroll() {
    setEnrolling(true);
    setError(null);
    try {
      const r = await fetch('/api/practitioner/white-label/enroll', { method: 'POST' });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      setEnrollment(json as EnrollmentResponse);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEnrolling(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-8 md:px-8 md:py-12">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-wider text-copper">Level 3</p>
          <h1 className="text-3xl md:text-4xl font-bold mt-1">White-Label Products</h1>
          <p className="text-sm text-gray-400 mt-2 max-w-2xl">
            Manufacture supplements under your own brand. ViaCura formulations, your label, your retail price. Eight week production runs from a 100 unit minimum.
          </p>
        </header>

        <section className="mb-8 rounded-xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-sm uppercase tracking-wider text-gray-400 mb-3">What you commit to</h2>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>Minimum order value of $15,000 per production run.</li>
            <li>50% deposit at proof approval; 50% at shipment.</li>
            <li>FDA-compliant label review by ViaCura before any production starts.</li>
            <li>Inventory ownership transfers to you on production; storage fees apply after 60 days at the ViaCura warehouse.</li>
          </ul>
        </section>

        {!eligibility && (
          <button
            onClick={checkEligibility}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-copper hover:bg-amber-600 text-white text-sm font-medium disabled:opacity-40"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> : <ShieldCheck className="w-4 h-4" strokeWidth={1.5} />}
            Check my eligibility
          </button>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        {eligibility && !enrollment && (
          <section className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-6">
            <header className="flex items-center gap-3 mb-5">
              {eligibility.is_eligible ? (
                <CheckCircle2 className="w-6 h-6 text-portal-green" strokeWidth={1.5} />
              ) : (
                <XCircle className="w-6 h-6 text-rose-300" strokeWidth={1.5} />
              )}
              <div>
                <p className="font-semibold">
                  {eligibility.is_eligible ? 'You are eligible' : 'Not yet eligible'}
                </p>
                <p className="text-xs text-gray-400">
                  {eligibility.qualifying_paths.length === 0
                    ? 'You currently meet none of the three paths.'
                    : `Qualifies on ${eligibility.qualifying_paths.length} of 3 paths.`}
                </p>
              </div>
            </header>

            <ul className="space-y-3">
              {(['certification_level_3', 'white_label_tier_subscription', 'volume_threshold'] as const).map((pathId) => {
                const meta = PATH_LABELS[pathId];
                const qualifies = eligibility.qualifying_paths.includes(pathId);
                return (
                  <li
                    key={pathId}
                    className={`flex items-start gap-3 rounded-lg border p-3 ${
                      qualifies
                        ? 'border-portal-green/30 bg-portal-green/5'
                        : 'border-white/10 bg-white/[0.03]'
                    }`}
                  >
                    <meta.Icon className={`w-5 h-5 shrink-0 mt-0.5 ${qualifies ? 'text-portal-green' : 'text-gray-500'}`} strokeWidth={1.5} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{meta.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {qualifies ? 'Qualified.' : 'Not yet met.'}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>

            {eligibility.is_eligible && (
              <button
                onClick={enroll}
                disabled={enrolling}
                className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-copper hover:bg-amber-600 text-white text-sm font-medium disabled:opacity-40"
              >
                {enrolling ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> : <ArrowRight className="w-4 h-4" strokeWidth={1.5} />}
                Begin enrollment
              </button>
            )}
          </section>
        )}

        {enrollment && (
          <section className="mt-8 rounded-xl border border-portal-green/30 bg-portal-green/10 p-6">
            <header className="flex items-center gap-3 mb-3">
              <CheckCircle2 className="w-6 h-6 text-portal-green" strokeWidth={1.5} />
              <p className="font-semibold">
                {enrollment.was_existing ? 'You are already enrolled' : 'Enrollment created'}
              </p>
            </header>
            <p className="text-sm text-gray-300">
              Status: <span className="font-mono">{enrollment.enrollment.status}</span>; qualified via{' '}
              <span className="font-mono">{enrollment.enrollment.qualifying_path}</span>.
            </p>
            <p className="text-xs text-gray-400 mt-3">
              Next step: brand setup (Phase 3, coming online when launch flag activates).
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
