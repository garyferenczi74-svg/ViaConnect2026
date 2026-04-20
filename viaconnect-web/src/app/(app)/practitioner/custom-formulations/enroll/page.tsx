'use client';

// Prompt #97 Phase 2.2: Level 4 practitioner enrollment.
// Eligibility check, exclusive-use agreement, enrollment creation.
// Gated behind the custom_formulations_2029 launch phase flag.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  FlaskConical,
  Lock,
  Shield,
  XCircle,
} from 'lucide-react';

interface EligibilityResult {
  isEligible: boolean;
  dependencyPending: boolean;
  masterCertActive: boolean;
  deliveredLevel3OrderExists: boolean;
  evidence: {
    certification?: { id: string; certifiedAt: string; expiresAt: string };
    deliveredOrder?: { id: string; deliveredAt: string; orderNumber: string };
  };
  reasons: string[];
}

export default function Level4EnrollPage() {
  const router = useRouter();
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [acknowledged, setAcknowledged] = useState(false);
  const [typedSignature, setTypedSignature] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/practitioner/custom-formulations/eligibility');
      if (response.ok) {
        setEligibility((await response.json()) as EligibilityResult);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const enroll = async () => {
    setMessage(null);
    if (!acknowledged) {
      setMessage('You must acknowledge the exclusive-use agreement.');
      return;
    }
    if (typedSignature.trim().length < 3) {
      setMessage('Please type your full name as signature.');
      return;
    }
    setSubmitting(true);
    const response = await fetch('/api/practitioner/custom-formulations/enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        acknowledged_exclusive_use_agreement: acknowledged,
        typed_signature: typedSignature.trim(),
      }),
    });
    setSubmitting(false);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      setMessage(`Enrollment failed: ${err.error ?? response.status}`);
      return;
    }
    setMessage('Enrolled. Redirecting to formulation builder...');
    setTimeout(() => router.push('/practitioner/custom-formulations'), 1500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1520] text-white p-8">
        <p className="text-sm text-white/60">Checking eligibility...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
        <div>
          <Link
            href="/practitioner"
            className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Practitioner portal
          </Link>
          <h1 className="text-xl sm:text-2xl font-semibold mt-2 flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} /> Level 4 Custom Formulations
          </h1>
          <p className="text-xs text-white/55 mt-1">
            Design your own formulation. ViaCura manufactures to your spec. You own the brand,
            we own the formulation IP with your exclusive-use rights.
          </p>
        </div>

        <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4 space-y-2">
          <h2 className="text-sm font-semibold">Program at a glance</h2>
          <ul className="text-xs text-white/75 space-y-1 list-disc list-inside">
            <li>Formulation development fee: $3,888 (refundable against first production order, minus $500 admin fee)</li>
            <li>Medical review fee: $888 per first review; substantive revisions re-charged</li>
            <li>Dual review: Fadi Dagher (medical) + Steve Rica (regulatory); both must approve</li>
            <li>Minimum production run: 500 units, $30,000 minimum order value</li>
            <li>Lead time: 14 weeks standard, 10 weeks expedited (+20%)</li>
            <li>Ingredient library: Q1 admits pre-1994 + GRAS-affirmed ingredients only</li>
          </ul>
        </section>

        {eligibility?.dependencyPending ? (
          <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100 flex items-start gap-3">
            <Lock className="h-5 w-5 flex-none mt-0.5" strokeWidth={1.5} />
            <div>
              <p className="font-semibold">Enrollment opens soon</p>
              <ul className="text-xs text-amber-200/85 mt-1 space-y-0.5 list-disc list-inside">
                {eligibility.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4 space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} /> Your eligibility
            </h2>
            <div className="flex items-center gap-2 text-xs">
              {eligibility?.masterCertActive ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-300" strokeWidth={1.5} />
              ) : (
                <XCircle className="h-4 w-4 text-red-300" strokeWidth={1.5} />
              )}
              Level 3 Master Practitioner certification
              {eligibility?.evidence.certification && (
                <span className="text-white/50 ml-2">
                  (expires {new Date(eligibility.evidence.certification.expiresAt).toLocaleDateString()})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs">
              {eligibility?.deliveredLevel3OrderExists ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-300" strokeWidth={1.5} />
              ) : (
                <XCircle className="h-4 w-4 text-red-300" strokeWidth={1.5} />
              )}
              Delivered Level 3 production order
              {eligibility?.evidence.deliveredOrder && (
                <span className="text-white/50 ml-2">
                  ({eligibility.evidence.deliveredOrder.orderNumber})
                </span>
              )}
            </div>
            {!eligibility?.isEligible && (
              <ul className="text-[11px] text-white/65 mt-2 space-y-0.5 list-disc list-inside">
                {eligibility?.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
          </section>
        )}

        {eligibility?.isEligible && (
          <section className="rounded-2xl border border-[#E8803A]/30 bg-[#E8803A]/5 p-4 space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-[#E8803A]" strokeWidth={1.5} /> Exclusive-use agreement
            </h2>
            <p className="text-xs text-white/75 leading-relaxed">
              By enrolling in Level 4, you acknowledge that any formulation ViaCura approves for
              you is subject to exclusive-use rights granted to you, that ViaCura retains the
              formulation IP and will not produce the same formulation for another practitioner,
              that you may not take the formulation to a competing manufacturer or reverse-engineer
              it to produce elsewhere, and that violations are contractual matters handled outside
              the platform.
            </p>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />
              I acknowledge and agree to the exclusive-use terms
            </label>
            <label className="block text-xs">
              Typed signature (full name)
              <input
                type="text"
                value={typedSignature}
                onChange={(e) => setTypedSignature(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-white"
              />
            </label>
            <button
              type="button"
              onClick={enroll}
              disabled={!acknowledged || typedSignature.trim().length < 3 || submitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#E8803A] text-[#0B1520] px-4 py-2 text-sm font-semibold hover:bg-[#E8803A]/90 disabled:opacity-40"
            >
              {submitting ? 'Enrolling...' : 'Enroll in Level 4'}
            </button>
          </section>
        )}

        {message && (
          <div className="rounded-xl bg-[#2DA5A0]/10 border border-[#2DA5A0]/30 px-3 py-2 text-xs text-[#2DA5A0]">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
