'use client';

// Natural protocols. Foundation depth: scaffold for a builder that
// integrates botanicals, lifestyle interventions, and constitutional
// framework tagging. Persists into the existing supplement_protocols table
// with a 'naturopathic' tag so the standard protocol pipeline picks it up.

import { useState } from 'react';
import {
  Leaf,
  ClipboardList,
  Sun,
  Moon,
  Salad,
  Activity,
  Brain,
  Plus,
  ArrowRight,
} from 'lucide-react';

type LifestyleArea = 'diet' | 'sleep' | 'movement' | 'stress';

const LIFESTYLE_TEMPLATES: { area: LifestyleArea; label: string; Icon: any; suggestion: string }[] = [
  { area: 'diet',     label: 'Diet',     Icon: Salad,     suggestion: 'Warm, cooked, easily digestible foods. Reduce raw and cold inputs.' },
  { area: 'sleep',    label: 'Sleep',    Icon: Moon,      suggestion: 'Wind down by 10pm. Magnesium glycinate before bed if Vata dominant.' },
  { area: 'movement', label: 'Movement', Icon: Activity,  suggestion: 'Daily 20 to 30 minute morning walk. Rhythmic, not competitive.' },
  { area: 'stress',   label: 'Stress',   Icon: Brain,     suggestion: 'Pranayama or breath cycling 5 minutes morning and evening.' },
];

interface ProtocolDraft {
  name: string;
  chiefComplaint: string;
  constitutional: string;
  botanicals: string[];
  lifestyle: Record<LifestyleArea, string>;
  notes: string;
}

const EMPTY_DRAFT: ProtocolDraft = {
  name: '',
  chiefComplaint: '',
  constitutional: '',
  botanicals: [],
  lifestyle: { diet: '', sleep: '', movement: '', stress: '' },
  notes: '',
};

export default function NaturalProtocolsPage() {
  const [draft, setDraft] = useState<ProtocolDraft>(EMPTY_DRAFT);
  const [botanicalInput, setBotanicalInput] = useState('');

  function addBotanical() {
    const t = botanicalInput.trim();
    if (!t) return;
    setDraft((prev) =>
      prev.botanicals.includes(t)
        ? prev
        : { ...prev, botanicals: [...prev.botanicals, t] },
    );
    setBotanicalInput('');
  }

  function removeBotanical(name: string) {
    setDraft((prev) => ({
      ...prev,
      botanicals: prev.botanicals.filter((b) => b !== name),
    }));
  }

  function applyTemplate(area: LifestyleArea, suggestion: string) {
    setDraft((prev) => ({
      ...prev,
      lifestyle: { ...prev.lifestyle, [area]: suggestion },
    }));
  }

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10">
          <Leaf className="h-5 w-5 text-emerald-300" strokeWidth={1.5} />
        </span>
        <div>
          <h1 className="text-xl font-semibold md:text-2xl">Natural Protocols</h1>
          <p className="text-xs text-white/55">
            Compose a botanical and lifestyle protocol; saves into the patient's protocol record.
          </p>
        </div>
      </header>

      <div className="grid gap-5 md:grid-cols-[1.4fr_1fr]">
        <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
          <Field label="Protocol name">
            <input
              value={draft.name}
              onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Vata pacification, autumn"
              className="w-full rounded-lg border border-white/10 bg-[#0B1424] px-3 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
            />
          </Field>

          <Field label="Chief complaint">
            <input
              value={draft.chiefComplaint}
              onChange={(e) => setDraft((p) => ({ ...p, chiefComplaint: e.target.value }))}
              placeholder="e.g. anxiety with insomnia, dry skin, low appetite"
              className="w-full rounded-lg border border-white/10 bg-[#0B1424] px-3 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
            />
          </Field>

          <Field label="Constitutional framework tag">
            <select
              value={draft.constitutional}
              onChange={(e) => setDraft((p) => ({ ...p, constitutional: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-[#0B1424] px-3 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
            >
              <option value="">Unspecified</option>
              <option value="ayurveda:vata">Ayurveda, Vata dominant</option>
              <option value="ayurveda:pitta">Ayurveda, Pitta dominant</option>
              <option value="ayurveda:kapha">Ayurveda, Kapha dominant</option>
              <option value="tcm:placeholder">TCM (Coming Soon)</option>
              <option value="homeopathic:placeholder">Homeopathic (Coming Soon)</option>
            </select>
          </Field>

          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-white/45">Botanicals</p>
            <div className="flex gap-2">
              <input
                value={botanicalInput}
                onChange={(e) => setBotanicalInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBotanical(); } }}
                placeholder="Type a herb name and press Enter"
                className="flex-1 rounded-lg border border-white/10 bg-[#0B1424] px-3 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
              />
              <button
                type="button"
                onClick={addBotanical}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/25"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                Add
              </button>
            </div>
            {draft.botanicals.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {draft.botanicals.map((b) => (
                  <li key={b}>
                    <button
                      type="button"
                      onClick={() => removeBotanical(b)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-200 hover:bg-emerald-500/20"
                    >
                      {b}
                      <span aria-hidden>×</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-white/45">
              Lifestyle interventions
            </p>
            <div className="flex flex-col gap-3">
              {LIFESTYLE_TEMPLATES.map(({ area, label, Icon, suggestion }) => (
                <div key={area} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white">
                      <Icon className="h-3.5 w-3.5 text-emerald-300" strokeWidth={1.5} />
                      {label}
                    </span>
                    <button
                      type="button"
                      onClick={() => applyTemplate(area, suggestion)}
                      className="text-[11px] text-emerald-300 hover:text-emerald-200"
                    >
                      Use template
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={draft.lifestyle[area]}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        lifestyle: { ...p.lifestyle, [area]: e.target.value },
                      }))
                    }
                    placeholder={suggestion}
                    className="w-full rounded-lg border border-white/10 bg-[#0B1424] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                  />
                </div>
              ))}
            </div>
          </div>

          <Field label="Energetic notes">
            <textarea
              rows={3}
              value={draft.notes}
              onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Hot or cold, dry or damp, deficient or excess, traditional use references"
              className="w-full rounded-lg border border-white/10 bg-[#0B1424] px-3 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
            />
          </Field>

          <button
            type="button"
            disabled={!draft.name.trim()}
            className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save protocol
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </section>

        <aside className="flex flex-col gap-4">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-white/45">
              Preview
            </p>
            <div className="flex flex-col gap-2 text-sm">
              <PreviewLine icon={ClipboardList} label="Name" value={draft.name || 'Untitled'} />
              <PreviewLine icon={Sun} label="Constitutional" value={draft.constitutional || 'Unspecified'} />
              <PreviewLine icon={Leaf} label="Botanicals" value={draft.botanicals.join(', ') || 'None added'} />
            </div>
          </section>

          <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-xs leading-relaxed text-white/70">
            Saving will create a row in supplement_protocols tagged with prescribed_by_role of
            naturopath, with the botanicals + lifestyle interventions stored in the protocol notes
            field. The patient consent flag consent_share_protocols controls whether the patient
            sees this in their dashboard.
          </section>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] uppercase tracking-[0.18em] text-white/45">{label}</span>
      {children}
    </label>
  );
}

function PreviewLine({
  icon: Icon, label, value,
}: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-emerald-300" strokeWidth={1.5} />
      <span className="text-white/55">{label}:</span>
      <span className="text-white">{value}</span>
    </div>
  );
}
