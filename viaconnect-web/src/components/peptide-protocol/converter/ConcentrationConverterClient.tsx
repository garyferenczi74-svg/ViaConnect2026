'use client';

/**
 * Prompt 226 Module A: concentration converter.
 * Dose field starts empty. Scale is read-only. Platform never originates a dose.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, FlaskConical, Save, ShieldAlert } from 'lucide-react';
import { SyringeUnitScale, type ScaleState } from './SyringeUnitScale';
import { CONVERTER_COPY, u100ToU40Factor } from '@/lib/peptides/converterMath';
import { PeptideCatalogPicker } from '@/components/peptide-protocol/PeptideCatalogPicker';
import { GlassSegmentedControl } from '@/components/peptide-protocol/converter/GlassSegmentedControl';

type Compound = {
  id: string;
  slug: string;
  displayName: string;
  iuEnabled: boolean;
};

type ComputeOk = {
  ok: true;
  concentrationPerMl: number;
  volumeMl: number;
  syringeUnits: number;
  syringeUnitsDisplay: number;
  volumeMlDisplay: number;
  concentrationDisplay: number;
  warnings: Array<{ code: string; message: string }>;
  needsUnitConfirmation: boolean;
  resultStandardLabel: string;
};

type ComputeFail = { ok: false; code: string; message: string };

export function ConcentrationConverterClient() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [layer1, setLayer1] = useState('');
  const [layer2, setLayer2] = useState('');
  const [layer3, setLayer3] = useState(CONVERTER_COPY.layer3);
  const [ackStandard, setAckStandard] = useState<'U-100' | 'U-40'>('U-100');
  const [compounds, setCompounds] = useState<Compound[]>([]);
  const [unavailableReason, setUnavailableReason] = useState('');
  const [fromRxBanner, setFromRxBanner] = useState(false);

  const [peptideId, setPeptideId] = useState('');
  const [vialAmount, setVialAmount] = useState(''); // empty by default
  const [vialUnit, setVialUnit] = useState<'mg' | 'mcg' | 'IU'>('mg');
  const [diluentMl, setDiluentMl] = useState(''); // empty by default
  const [doseAmount, setDoseAmount] = useState(''); // MUST stay empty until user types (or loads their own Rx)
  const [doseUnit, setDoseUnit] = useState<'mg' | 'mcg' | 'IU'>('mg');
  const [syringeStandard, setSyringeStandard] = useState<'U-100' | 'U-40'>('U-100');
  const [barrelSize, setBarrelSize] = useState<100 | 50 | 30>(100);
  const [prevStandard, setPrevStandard] = useState<'U-100' | 'U-40' | null>(null);
  const [standardChangeNote, setStandardChangeNote] = useState('');

  const [result, setResult] = useState<ComputeOk | ComputeFail | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [history, setHistory] = useState<
    Array<{
      id: string;
      dose_amount: number;
      dose_unit: string;
      computed_units: number;
      syringe_standard: string;
      created_at: string;
      label: string;
    }>
  >([]);

  const selected = compounds.find((c) => c.id === peptideId);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      const statusRes = await fetch('/api/peptides/converter/status');
      if (statusRes.status === 401) {
        setAvailable(false);
        setUnavailableReason('Sign in to use the concentration converter.');
        setLoading(false);
        return;
      }
      const status = await statusRes.json();
      if (!status.available) {
        setAvailable(false);
        setUnavailableReason(status.message || 'Converter unavailable.');
        setLoading(false);
        return;
      }
      setAvailable(true);
      setLayer1(status.disclaimer?.layer1Markdown ?? '');
      setLayer2(status.disclaimer?.layer2Text ?? '');
      setLayer3(status.disclaimer?.layer3Text ?? CONVERTER_COPY.layer3);
      setAcknowledged(Boolean(status.acknowledged));
      if (status.syringeStandardConfirmed) {
        setAckStandard(status.syringeStandardConfirmed);
        setSyringeStandard(status.syringeStandardConfirmed);
      }

      const allowRes = await fetch('/api/peptides/converter/allowlist');
      const allow = await allowRes.json();
      if (!allow.ok || allow.unavailable) {
        setAvailable(false);
        setUnavailableReason('Peptide catalog unavailable. Retry shortly.');
        setLoading(false);
        return;
      }
      setCompounds(allow.compounds ?? []);

      // Prefill only from the user's own prescribed-peptide link (fromRx=1).
      // Still user-originated numbers; platform never invents them.
      if (searchParams.get('fromRx') === '1') {
        const pid = searchParams.get('peptideId') || '';
        const inAllow = (allow.compounds ?? []).some(
          (c: Compound) => c.id === pid,
        );
        if (inAllow && pid) {
          setPeptideId(pid);
          const d = searchParams.get('dose');
          const du = searchParams.get('doseUnit');
          const v = searchParams.get('vial');
          const vu = searchParams.get('vialUnit');
          const dil = searchParams.get('diluent');
          if (d) setDoseAmount(d);
          if (du === 'mg' || du === 'mcg' || du === 'IU') setDoseUnit(du);
          if (v) setVialAmount(v);
          if (vu === 'mg' || vu === 'mcg' || vu === 'IU') setVialUnit(vu);
          if (dil) setDiluentMl(dil);
          setFromRxBanner(true);
        }
      }

      if (status.acknowledged) {
        const histRes = await fetch('/api/peptides/converter/sessions');
        const hist = await histRes.json();
        if (hist.ok) setHistory(hist.sessions ?? []);
      }
    } catch {
      setAvailable(false);
      setUnavailableReason('Converter unavailable. Retry shortly.');
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const allInputsPresent = useMemo(() => {
    return (
      Boolean(peptideId) &&
      vialAmount.trim() !== '' &&
      diluentMl.trim() !== '' &&
      doseAmount.trim() !== ''
    );
  }, [peptideId, vialAmount, diluentMl, doseAmount]);

  useEffect(() => {
    if (!acknowledged || !allInputsPresent) {
      setResult(null);
      return;
    }
    const t = setTimeout(() => {
      void (async () => {
        setBusy(true);
        try {
          const res = await fetch('/api/peptides/converter/compute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              peptideId,
              vialAmount: Number(vialAmount),
              vialUnit,
              diluentMl: Number(diluentMl),
              doseAmount: Number(doseAmount),
              doseUnit,
              syringeStandard,
              barrelSize,
            }),
          });
          const data = await res.json();
          if (data.result) setResult(data.result);
          if (data.layer3) setLayer3(data.layer3);
        } finally {
          setBusy(false);
        }
      })();
    }, 250);
    return () => clearTimeout(t);
  }, [
    acknowledged,
    allInputsPresent,
    peptideId,
    vialAmount,
    vialUnit,
    diluentMl,
    doseAmount,
    doseUnit,
    syringeStandard,
    barrelSize,
  ]);

  async function handleAcknowledge() {
    setBusy(true);
    try {
      const res = await fetch('/api/peptides/converter/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syringeStandard: ackStandard }),
      });
      const data = await res.json();
      if (data.ok) {
        setAcknowledged(true);
        setSyringeStandard(ackStandard);
      }
    } finally {
      setBusy(false);
    }
  }

  function changeStandard(next: 'U-100' | 'U-40') {
    if (next === syringeStandard) return;
    setPrevStandard(syringeStandard);
    setSyringeStandard(next);
    const factor = u100ToU40Factor();
    setStandardChangeNote(
      next === 'U-40'
        ? `Standard changed to U-40. For the same volume, U-100 units are ${factor}x higher than U-40 units. Confirm the syringe in your hand.`
        : `Standard changed to U-100. For the same volume, U-40 units are lower by a factor of ${factor}. Confirm the syringe in your hand.`,
    );
  }

  async function handleSave() {
    if (!result || !result.ok || !allInputsPresent) return;
    setBusy(true);
    setSaveMsg('');
    try {
      const res = await fetch('/api/peptides/converter/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          peptideId,
          vialAmount: Number(vialAmount),
          vialUnit,
          diluentMl: Number(diluentMl),
          doseAmount: Number(doseAmount),
          doseUnit,
          syringeStandard,
          barrelSize,
          label: '',
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setSaveMsg('Saved to your converter history.');
        const histRes = await fetch('/api/peptides/converter/sessions');
        const hist = await histRes.json();
        if (hist.ok) setHistory(hist.sessions ?? []);
      } else {
        setSaveMsg('Save failed.');
      }
    } finally {
      setBusy(false);
    }
  }

  const scaleState: ScaleState = !result
    ? 'normal'
    : !result.ok
      ? 'error'
      : result.warnings.some((w) => w.code === 'precision_low')
        ? 'precision'
        : 'normal';

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#1E3054]/60 p-6 text-sm text-white/50">
        Loading converter...
      </div>
    );
  }

  if (!available) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 space-y-2">
        <div className="flex items-center gap-2 text-amber-200">
          <ShieldAlert className="w-4 h-4" strokeWidth={1.5} />
          <span className="text-sm font-semibold">Converter unavailable</span>
        </div>
        <p className="text-xs text-white/60 leading-relaxed">{unavailableReason}</p>
        <Link
          href="/peptide-protocol"
          className="inline-block text-xs text-[#2DA5A0] underline"
        >
          Back to monographs
        </Link>
      </div>
    );
  }

  if (!acknowledged) {
    return (
      <div
        className="rounded-2xl border border-[var(--orange)]/40 bg-[var(--card)] p-5 md:p-6 space-y-4"
        data-testid="converter-first-use"
      >
        <h2 className="text-base font-semibold text-white">
          Before you use the converter
        </h2>
        <div className="prose prose-invert prose-sm max-w-none text-white/75 whitespace-pre-wrap text-sm leading-relaxed">
          {layer1}
        </div>
        <div className="space-y-2">
          <GlassSegmentedControl
            label="Confirm which syringe you are physically holding:"
            value={ackStandard}
            options={[
              { value: 'U-100', label: 'U-100 (100 units/mL)' },
              { value: 'U-40', label: 'U-40 (40 units/mL)' },
            ]}
            onChange={setAckStandard}
            testId="converter-ack-standard"
          />
          <p className="text-[11px] text-amber-200">
            Using a U-100 calculation on a U-40 syringe delivers {u100ToU40Factor()}x the
            intended amount.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleAcknowledge()}
          className="rounded-xl px-4 py-2 text-sm font-semibold text-white bg-[var(--teal)] disabled:opacity-50"
        >
          I understand. Continue
        </button>
      </div>
    );
  }

  const units =
    result && result.ok ? result.syringeUnits : null;
  const numericLabel =
    result && result.ok
      ? `${result.syringeUnitsDisplay} units on a ${barrelSize}u ${syringeStandard} barrel (${result.volumeMlDisplay} mL)`
      : 'No result yet. Enter vial, diluent, and dose.';

  return (
    <div
      className="space-y-4"
      data-testid="concentration-converter"
      data-peptide-converter="true"
    >
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-[var(--teal)]" strokeWidth={1.5} />
          <h2 className="text-base font-semibold text-white">Concentration converter</h2>
        </div>
        <p className="text-xs text-white/50">{CONVERTER_COPY.subtitle}</p>
        {/* Layer 2: solid disclaimer panel (226b Section 3). Not glass. */}
        <p className="pep-disclaimer-panel pep-disclaimer-text text-[11px] leading-relaxed rounded-xl p-3">
          {layer2}
        </p>
        {fromRxBanner ? (
          <p className="text-[11px] text-[var(--teal)] leading-relaxed">
            Prefilling from your saved prescribed peptide. Those numbers came from you (your Rx),
            not from ViaConnect. Edit anything that does not match your prescription.
          </p>
        ) : null}
      </header>

      {/*
        Prompt 226c (Gary correction): true 2x2 tabs.
        Left: Compound / Vial. Right: Diluent + chips / Dose + prescription note.
      */}
      <div className="converter-fields" data-testid="converter-fields">
        <div className="field--compound">
          <PeptideCatalogPicker
            items={compounds}
            value={peptideId}
            onChange={setPeptideId}
            placeholder="Type to search peptides..."
            testId="converter-compound"
            glass
          />
        </div>

        <div className="field--diluent space-y-3 text-xs text-white/60">
          <label className="flex flex-col gap-3">
            <span className="pep-field-label">Diluent volume (mL)</span>
            <input
              type="number"
              inputMode="decimal"
              className="pep-glass-input w-full rounded-xl px-3 py-2 text-sm"
              value={diluentMl}
              onChange={(e) => setDiluentMl(e.target.value)}
              placeholder=""
              data-testid="converter-diluent"
            />
          </label>
          <div className="field--diluent-extras">
            <span className="field--diluent-extras-label">
              {CONVERTER_COPY.bacShortcutsLabel}
            </span>
            <div className="flex flex-wrap gap-2" data-testid="converter-diluent-chips">
              {(['1', '2', '3'] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={diluentMl === n}
                  className="pep-segment px-2 py-1 text-[11px] rounded-lg"
                  data-checked={diluentMl === n ? 'true' : 'false'}
                  onClick={() => setDiluentMl(n)}
                >
                  {n} mL
                </button>
              ))}
            </div>
          </div>
        </div>

        <label className="field--vial flex flex-col gap-3 text-xs text-white/60">
          <span className="pep-field-label">Vial amount</span>
          <div className="flex gap-2">
            <input
              type="number"
              inputMode="decimal"
              className="pep-glass-input flex-1 rounded-xl px-3 py-2 text-sm"
              value={vialAmount}
              onChange={(e) => setVialAmount(e.target.value)}
              placeholder=""
              data-testid="converter-vial"
            />
            <select
              className="pep-glass-input rounded-xl px-2 py-2 text-sm"
              value={vialUnit}
              onChange={(e) => setVialUnit(e.target.value as 'mg' | 'mcg' | 'IU')}
              data-testid="converter-vial-unit"
            >
              <option value="mg">mg</option>
              <option value="mcg">mcg</option>
              <option value="IU" disabled={!selected?.iuEnabled}>
                IU
              </option>
            </select>
          </div>
        </label>

        <div className="field--dose flex flex-col gap-3 text-xs text-white/60">
          <label className="flex flex-col gap-3" htmlFor="dose-input">
            <span className="pep-field-label">Dose (your number)</span>
            <div className="flex gap-2">
              <input
                id="dose-input"
                type="number"
                inputMode="decimal"
                className="pep-glass-input flex-1 rounded-xl px-3 py-2 text-sm"
                value={doseAmount}
                onChange={(e) => setDoseAmount(e.target.value)}
                placeholder=""
                data-testid="converter-dose"
                autoComplete="off"
                aria-describedby="dose-note"
              />
              <select
                className="pep-glass-input rounded-xl px-2 py-2 text-sm"
                value={doseUnit}
                onChange={(e) => setDoseUnit(e.target.value as 'mg' | 'mcg' | 'IU')}
                data-testid="converter-dose-unit"
              >
                <option value="mg">mg</option>
                <option value="mcg">mcg</option>
                <option value="IU" disabled={!selected?.iuEnabled}>
                  IU
                </option>
              </select>
            </div>
          </label>
          <p
            id="dose-note"
            className="field--dose-note"
            data-testid="converter-dose-note"
          >
            You enter the dose from your prescription. ViaConnect converts units only.
          </p>
        </div>
      </div>

      <div className="converter-segments mt-6" data-testid="converter-segments">
        <div className="space-y-2">
          <GlassSegmentedControl
            label="Syringe standard"
            value={syringeStandard}
            options={[
              { value: 'U-100', label: 'U-100' },
              { value: 'U-40', label: 'U-40' },
            ]}
            onChange={(next) => changeStandard(next)}
            testId="converter-syringe-standard"
          />
          {standardChangeNote ? (
            <p className="text-[11px] text-amber-200 flex gap-1.5 items-start">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" strokeWidth={1.5} />
              <span>{standardChangeNote}</span>
            </p>
          ) : null}
          {prevStandard ? (
            <p className="text-[10px] text-white/40">
              Previous standard: {prevStandard}
            </p>
          ) : null}
        </div>

        <GlassSegmentedControl
          label="Barrel size"
          value={String(barrelSize) as '100' | '50' | '30'}
          options={[
            { value: '100', label: '100u' },
            { value: '50', label: '50u' },
            { value: '30', label: '30u' },
          ]}
          onChange={(next) => setBarrelSize(Number(next) as 100 | 50 | 30)}
          testId="converter-barrel-size"
        />
      </div>

      <SyringeUnitScale
        units={units}
        barrelSize={barrelSize}
        state={scaleState}
        numericLabel={numericLabel}
      />

      {!allInputsPresent ? (
        <p className="pep-functional-text text-xs" data-testid="converter-waiting-inputs">
          No result until compound, vial amount, diluent, and dose are all entered.
        </p>
      ) : null}

      {result && !result.ok ? (
        <div
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200"
          data-testid="converter-error"
        >
          {result.message}
        </div>
      ) : null}

      {result && result.ok ? (
        <div
          className="rounded-2xl border border-[var(--glass-border-226)] bg-[var(--card)] p-4 space-y-2"
          data-testid="converter-result"
        >
          <p className="text-sm font-semibold text-white">
            {selected?.displayName}: {result.syringeUnitsDisplay} units
          </p>
          <p className="text-xs text-white/60">
            Concentration {result.concentrationDisplay} mg/mL · Volume{' '}
            {result.volumeMlDisplay} mL
          </p>
          <p className="text-xs text-[var(--teal)]">{result.resultStandardLabel}</p>
          {result.warnings.map((w) => (
            <p key={w.code} className="text-[11px] text-amber-200">
              {w.message}
            </p>
          ))}
          {/* Layer 3: solid disclaimer, not glass */}
          <p className="pep-disclaimer-text text-[11px] border-t border-[var(--glass-border-226)] pt-2">
            {layer3}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleSave()}
            className="pep-segment inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs"
          >
            <Save className="w-3.5 h-3.5" strokeWidth={1.5} />
            Save to history
          </button>
          {saveMsg ? <p className="text-[11px] text-white/50">{saveMsg}</p> : null}
        </div>
      ) : null}

      {history.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-white/80">Your converter history</h3>
          <ul className="space-y-2">
            {history.slice(0, 10).map((h) => (
              <li
                key={h.id}
                className="rounded-xl border border-[var(--glass-border-226)] bg-[var(--card)] p-3 text-xs text-white/65"
              >
                <div>
                  Dose you entered: {h.dose_amount} {h.dose_unit} → {Number(h.computed_units).toFixed(2)}{' '}
                  units ({h.syringe_standard})
                </div>
                <div className="text-white/45 mt-1">{new Date(h.created_at).toLocaleString()}</div>
                <div className="pep-disclaimer-text mt-1">{layer3}</div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
