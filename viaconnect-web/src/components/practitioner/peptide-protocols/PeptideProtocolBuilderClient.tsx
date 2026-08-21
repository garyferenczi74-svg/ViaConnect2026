'use client';

/**
 * Prompt 226 Module B: de-identified protocol authoring.
 * Requires verified practitioner (AB/NY). Opaque patient_ref only.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, FileText, ShieldCheck } from 'lucide-react';

type Compound = {
  id: string;
  slug: string;
  displayName: string;
  converterEligible: boolean;
};

export function PeptideProtocolBuilderClient() {
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [verification, setVerification] = useState<{
    moduleBVerified: boolean;
    hasPractitionerRow: boolean;
    requests: Array<{ id: string; status: string; jurisdiction: string }>;
  } | null>(null);

  const [jurisdiction, setJurisdiction] = useState<'AB' | 'NY'>('AB');
  const [issuingBody, setIssuingBody] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [vrMsg, setVrMsg] = useState('');

  const [compounds, setCompounds] = useState<Compound[]>([]);
  const [protocols, setProtocols] = useState<
    Array<{
      id: string;
      patient_ref: string;
      status: string;
      computed_units: number;
      dose_amount: number;
      dose_unit: string;
    }>
  >([]);

  const [patientRef, setPatientRef] = useState('');
  const [peptideId, setPeptideId] = useState('');
  const [doseAmount, setDoseAmount] = useState('');
  const [doseUnit, setDoseUnit] = useState<'mg' | 'mcg' | 'IU'>('mg');
  const [vialAmount, setVialAmount] = useState('');
  const [vialUnit, setVialUnit] = useState<'mg' | 'mcg' | 'IU'>('mg');
  const [diluentMl, setDiluentMl] = useState('');
  const [frequencyText, setFrequencyText] = useState('');
  const [timingText, setTimingText] = useState('');
  const [durationText, setDurationText] = useState('');
  const [syringeStandard, setSyringeStandard] = useState<'U-100' | 'U-40'>('U-100');
  const [barrelSize, setBarrelSize] = useState<100 | 50 | 30>(100);
  const [msg, setMsg] = useState('');
  const [sheet, setSheet] = useState<Record<string, unknown> | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const vr = await fetch('/api/practitioner/peptide-protocols/verification');
      if (vr.status === 401) {
        setMsg('Sign in as a practitioner to continue.');
        setLoading(false);
        return;
      }
      const vrJson = await vr.json();
      setVerification(vrJson);
      setVerified(Boolean(vrJson.moduleBVerified));

      if (vrJson.moduleBVerified) {
        const list = await fetch('/api/practitioner/peptide-protocols');
        const listJson = await list.json();
        if (listJson.ok) {
          setCompounds(listJson.compounds ?? []);
          setProtocols(listJson.protocols ?? []);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submitVerification() {
    setVrMsg('');
    const res = await fetch('/api/practitioner/peptide-protocols/verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jurisdiction,
        issuingBody,
        licenseNumber,
        displayName,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      setVrMsg('Verification request submitted. An admin must approve before Module B unlocks.');
      void refresh();
    } else {
      setVrMsg(data.error || 'Submit failed');
    }
  }

  async function createDraft() {
    setMsg('');
    setSheet(null);
    const res = await fetch('/api/practitioner/peptide-protocols', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientRef,
        peptideId,
        doseAmount: Number(doseAmount),
        doseUnit,
        vialAmount: Number(vialAmount),
        vialUnit,
        diluentMl: Number(diluentMl),
        frequencyText,
        timingText,
        durationText,
        syringeStandard,
        barrelSize,
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      setMsg(data.message || data.error || data.compute?.message || 'Create failed');
      return;
    }
    setMsg(`Draft saved. Computed ${data.compute?.syringeUnitsDisplay} units.`);
    void refresh();
  }

  async function issueProtocol(id: string) {
    setMsg('');
    const res = await fetch(`/api/practitioner/peptide-protocols/${id}/issue`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!data.ok) {
      setMsg(data.error || 'Issue failed');
      return;
    }
    setSheet(data.sheet ?? null);
    setMsg('Protocol issued. Attribution sheet ready to print.');
    void refresh();
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#1E3054] p-6 text-sm text-white/50">
        Loading Module B...
      </div>
    );
  }

  if (!verified) {
    return (
      <div className="space-y-4" data-testid="module-b-verification">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-200">
            <ShieldCheck className="w-4 h-4" strokeWidth={1.5} />
            <span className="text-sm font-semibold">Module B verification required</span>
          </div>
          <p className="text-xs text-white/60 leading-relaxed">
            Self-asserted practitioner role is not enough. Submit licence details for Alberta (AB)
            or New York (NY). An admin must approve before you can issue protocols.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#1E3054] p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-white/70">
          <label className="space-y-1">
            Jurisdiction
            <select
              className="w-full rounded-xl bg-[#1A2744] border border-white/15 px-3 py-2 text-sm text-white"
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value as 'AB' | 'NY')}
            >
              <option value="AB">Alberta (AB)</option>
              <option value="NY">New York (NY)</option>
            </select>
          </label>
          <label className="space-y-1">
            Issuing body
            <input
              className="w-full rounded-xl bg-[#1A2744] border border-white/15 px-3 py-2 text-sm text-white"
              value={issuingBody}
              onChange={(e) => setIssuingBody(e.target.value)}
              placeholder="e.g. CPSA or NYSED"
            />
          </label>
          <label className="space-y-1">
            Licence number
            <input
              className="w-full rounded-xl bg-[#1A2744] border border-white/15 px-3 py-2 text-sm text-white"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
            />
          </label>
          <label className="space-y-1">
            Display name (if creating practitioner row)
            <input
              className="w-full rounded-xl bg-[#1A2744] border border-white/15 px-3 py-2 text-sm text-white"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={() => void submitVerification()}
            className="md:col-span-2 rounded-xl bg-[#2DA5A0] px-4 py-2 text-sm font-semibold text-white"
          >
            Submit verification request
          </button>
          {vrMsg ? <p className="md:col-span-2 text-[11px] text-white/50">{vrMsg}</p> : null}
          {verification?.requests?.length ? (
            <ul className="md:col-span-2 text-[11px] text-white/45 space-y-1">
              {verification.requests.map((r) => (
                <li key={r.id}>
                  {r.jurisdiction} · {r.status} · {r.id.slice(0, 8)}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="module-b-builder">
      <header className="space-y-1">
        <h2 className="text-base font-semibold text-white">Peptide protocol builder</h2>
        <p className="text-xs text-white/50 leading-relaxed">
          De-identified mode: enter an opaque patient reference you hold outside ViaConnect. Do not
          type a legal name. You enter the regimen; ViaConnect converts units only.
        </p>
      </header>

      <div className="rounded-2xl border border-white/10 bg-[#1E3054] p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-white/70">
        <label className="space-y-1 md:col-span-2">
          Opaque patient reference
          <input
            className="w-full rounded-xl bg-[#1A2744] border border-white/15 px-3 py-2 text-sm text-white"
            value={patientRef}
            onChange={(e) => setPatientRef(e.target.value)}
            placeholder="e.g. CLINIC-A-0042"
            data-testid="module-b-patient-ref"
          />
        </label>
        <label className="space-y-1 md:col-span-2">
          Compound
          <select
            className="w-full rounded-xl bg-[#1A2744] border border-white/15 px-3 py-2 text-sm text-white"
            value={peptideId}
            onChange={(e) => setPeptideId(e.target.value)}
          >
            <option value="">Select...</option>
            {compounds.map((c) => (
              <option key={c.id} value={c.id}>
                {c.displayName}
                {c.converterEligible ? '' : ' (compounded / educational)'}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          Prescriber dose amount
          <div className="flex gap-2">
            <input
              type="number"
              className="flex-1 rounded-xl bg-[#1A2744] border border-white/15 px-3 py-2 text-sm text-white"
              value={doseAmount}
              onChange={(e) => setDoseAmount(e.target.value)}
            />
            <select
              className="rounded-xl bg-[#1A2744] border border-white/15 px-2 text-sm text-white"
              value={doseUnit}
              onChange={(e) => setDoseUnit(e.target.value as 'mg' | 'mcg' | 'IU')}
            >
              <option value="mg">mg</option>
              <option value="mcg">mcg</option>
              <option value="IU">IU</option>
            </select>
          </div>
        </label>
        <label className="space-y-1">
          Vial amount
          <div className="flex gap-2">
            <input
              type="number"
              className="flex-1 rounded-xl bg-[#1A2744] border border-white/15 px-3 py-2 text-sm text-white"
              value={vialAmount}
              onChange={(e) => setVialAmount(e.target.value)}
            />
            <select
              className="rounded-xl bg-[#1A2744] border border-white/15 px-2 text-sm text-white"
              value={vialUnit}
              onChange={(e) => setVialUnit(e.target.value as 'mg' | 'mcg' | 'IU')}
            >
              <option value="mg">mg</option>
              <option value="mcg">mcg</option>
              <option value="IU">IU</option>
            </select>
          </div>
        </label>
        <label className="space-y-1">
          Diluent (mL)
          <input
            type="number"
            className="w-full rounded-xl bg-[#1A2744] border border-white/15 px-3 py-2 text-sm text-white"
            value={diluentMl}
            onChange={(e) => setDiluentMl(e.target.value)}
          />
        </label>
        <label className="space-y-1">
          Frequency (your wording)
          <input
            className="w-full rounded-xl bg-[#1A2744] border border-white/15 px-3 py-2 text-sm text-white"
            value={frequencyText}
            onChange={(e) => setFrequencyText(e.target.value)}
          />
        </label>
        <label className="space-y-1">
          Timing (your wording)
          <input
            className="w-full rounded-xl bg-[#1A2744] border border-white/15 px-3 py-2 text-sm text-white"
            value={timingText}
            onChange={(e) => setTimingText(e.target.value)}
          />
        </label>
        <label className="space-y-1">
          Duration (your wording)
          <input
            className="w-full rounded-xl bg-[#1A2744] border border-white/15 px-3 py-2 text-sm text-white"
            value={durationText}
            onChange={(e) => setDurationText(e.target.value)}
          />
        </label>
        <div className="space-y-1">
          Syringe standard
          <div className="flex gap-2">
            {(['U-100', 'U-40'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSyringeStandard(s)}
                className={`rounded-xl px-3 py-2 border text-xs ${
                  syringeStandard === s
                    ? 'border-[#2DA5A0] bg-[#2DA5A0]/20 text-white'
                    : 'border-white/15 text-white/60'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          Barrel
          <div className="flex gap-2">
            {([100, 50, 30] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBarrelSize(b)}
                className={`rounded-xl px-3 py-2 border text-xs ${
                  barrelSize === b
                    ? 'border-[#2DA5A0] bg-[#2DA5A0]/20 text-white'
                    : 'border-white/15 text-white/60'
                }`}
              >
                {b}u
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void createDraft()}
          className="md:col-span-2 rounded-xl bg-[#2DA5A0] px-4 py-2 text-sm font-semibold text-white"
        >
          Save draft + convert units
        </button>
        {msg ? (
          <p className="md:col-span-2 text-[11px] text-white/55 flex gap-1.5 items-start">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" strokeWidth={1.5} />
            {msg}
          </p>
        ) : null}
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-white/80">Your drafts and issued protocols</h3>
        <ul className="space-y-2">
          {protocols.map((p) => (
            <li
              key={p.id}
              className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/65 flex flex-wrap items-center justify-between gap-2"
            >
              <span>
                {p.patient_ref} · {p.dose_amount} {p.dose_unit} ·{' '}
                {Number(p.computed_units).toFixed(2)} u · {p.status}
              </span>
              {p.status === 'draft' ? (
                <button
                  type="button"
                  onClick={() => void issueProtocol(p.id)}
                  className="rounded-lg border border-[#2DA5A0]/40 px-2 py-1 text-[#2DA5A0]"
                >
                  Sign off and issue
                </button>
              ) : (
                <Link
                  href={`/practitioner/peptide-protocols/${p.id}/sheet`}
                  className="inline-flex items-center gap-1 text-[#2DA5A0]"
                >
                  <FileText className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Sheet
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>

      {sheet ? (
        <section
          className="rounded-2xl border border-white/10 bg-white text-[#1A2744] p-5 space-y-2 print:border-0"
          data-testid="module-b-sheet-preview"
        >
          <h3 className="text-base font-semibold">Patient instruction sheet</h3>
          <p className="text-sm">Patient ref: {String(sheet.patientRef)}</p>
          <p className="text-sm">Compound: {String(sheet.compound)}</p>
          <p className="text-sm">
            Dose (prescriber-entered): {String(sheet.doseEnteredByPrescriber)}
          </p>
          <p className="text-sm">Frequency: {String(sheet.frequency || '-')}</p>
          <p className="text-sm">Timing: {String(sheet.timing || '-')}</p>
          <p className="text-sm">Duration: {String(sheet.duration || '-')}</p>
          <p className="text-sm">Route: {String(sheet.route)}</p>
          <p className="text-sm">
            Converted draw: {String(sheet.syringeUnits)} units on {String(sheet.syringeStandard)} (
            {String(sheet.volumeMl)} mL)
          </p>
          <p className="text-xs pt-3 border-t border-[#1A2744]/20">{String(sheet.attribution)}</p>
          <p className="text-xs text-[#1A2744]/70">{String(sheet.note)}</p>
        </section>
      ) : null}
    </div>
  );
}
