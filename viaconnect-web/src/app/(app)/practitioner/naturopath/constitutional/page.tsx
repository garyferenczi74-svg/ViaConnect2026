'use client';

// Constitutional assessment. Three frameworks per spec:
//   Ayurveda     fully functional with a 12 question dosha quiz
//   TCM          Coming Soon
//   Homeopathic  Coming Soon
// The Ayurveda quiz is intentionally short (12 questions, three options each)
// for the foundation phase; the full 50 to 80 question canonical assessment
// expands post launch.

import { useMemo, useState } from 'react';
import {
  Activity,
  Flame,
  Wind,
  Droplets,
  ArrowRight,
  RefreshCw,
  Lock,
} from 'lucide-react';

type Framework = 'ayurveda' | 'tcm' | 'homeopathic';
type Dosha = 'vata' | 'pitta' | 'kapha';

const QUESTIONS: { id: number; prompt: string; options: { dosha: Dosha; label: string }[] }[] = [
  { id: 1, prompt: 'Body frame', options: [
    { dosha: 'vata',  label: 'Slim, light, prominent joints' },
    { dosha: 'pitta', label: 'Medium, moderate musculature' },
    { dosha: 'kapha', label: 'Solid, broad, well developed' },
  ]},
  { id: 2, prompt: 'Skin tendency', options: [
    { dosha: 'vata',  label: 'Dry, cool, rough' },
    { dosha: 'pitta', label: 'Warm, oily, freckled' },
    { dosha: 'kapha', label: 'Cool, smooth, thick' },
  ]},
  { id: 3, prompt: 'Hair quality', options: [
    { dosha: 'vata',  label: 'Thin, dry, frizzy' },
    { dosha: 'pitta', label: 'Fine, soft, early greying' },
    { dosha: 'kapha', label: 'Thick, lustrous, oily' },
  ]},
  { id: 4, prompt: 'Appetite', options: [
    { dosha: 'vata',  label: 'Variable, easily skips meals' },
    { dosha: 'pitta', label: 'Strong, irritable when hungry' },
    { dosha: 'kapha', label: 'Steady, can fast comfortably' },
  ]},
  { id: 5, prompt: 'Digestion', options: [
    { dosha: 'vata',  label: 'Irregular, gas, bloating' },
    { dosha: 'pitta', label: 'Strong, sharp, acid reflux' },
    { dosha: 'kapha', label: 'Slow, heavy after meals' },
  ]},
  { id: 6, prompt: 'Sleep pattern', options: [
    { dosha: 'vata',  label: 'Light, interrupted, vivid dreams' },
    { dosha: 'pitta', label: 'Moderate, intense dreams' },
    { dosha: 'kapha', label: 'Heavy, deep, hard to wake' },
  ]},
  { id: 7, prompt: 'Energy pattern', options: [
    { dosha: 'vata',  label: 'Bursts of energy, then crash' },
    { dosha: 'pitta', label: 'Intense, focused, driven' },
    { dosha: 'kapha', label: 'Steady, slow to start' },
  ]},
  { id: 8, prompt: 'Stress response', options: [
    { dosha: 'vata',  label: 'Anxious, scattered' },
    { dosha: 'pitta', label: 'Irritable, critical' },
    { dosha: 'kapha', label: 'Withdrawn, attached' },
  ]},
  { id: 9, prompt: 'Cold tolerance', options: [
    { dosha: 'vata',  label: 'Dislike cold, hands and feet cold' },
    { dosha: 'pitta', label: 'Prefer cool weather' },
    { dosha: 'kapha', label: 'Tolerate cold and damp well' },
  ]},
  { id: 10, prompt: 'Decision making', options: [
    { dosha: 'vata',  label: 'Quick to consider, slow to act' },
    { dosha: 'pitta', label: 'Decisive, opinionated' },
    { dosha: 'kapha', label: 'Steady, methodical' },
  ]},
  { id: 11, prompt: 'Memory', options: [
    { dosha: 'vata',  label: 'Quick to learn, quick to forget' },
    { dosha: 'pitta', label: 'Sharp, organized recall' },
    { dosha: 'kapha', label: 'Slow to learn, slow to forget' },
  ]},
  { id: 12, prompt: 'Movement style', options: [
    { dosha: 'vata',  label: 'Quick, restless, light' },
    { dosha: 'pitta', label: 'Purposeful, sharp' },
    { dosha: 'kapha', label: 'Graceful, slow, sustained' },
  ]},
];

export default function ConstitutionalPage() {
  const [framework, setFramework] = useState<Framework>('ayurveda');

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10">
          <Activity className="h-5 w-5 text-emerald-300" strokeWidth={1.5} />
        </span>
        <div>
          <h1 className="text-xl font-semibold md:text-2xl">Constitutional Assessment</h1>
          <p className="text-xs text-white/55">
            Ayurveda is functional; TCM and Homeopathic frameworks land in a follow up phase.
          </p>
        </div>
      </header>

      <nav className="mb-6 flex flex-wrap gap-2">
        <FrameworkTab id="ayurveda"    label="Ayurveda"    active={framework === 'ayurveda'}    onClick={() => setFramework('ayurveda')} />
        <FrameworkTab id="tcm"         label="TCM"         active={framework === 'tcm'}         onClick={() => setFramework('tcm')} disabled />
        <FrameworkTab id="homeopathic" label="Homeopathic" active={framework === 'homeopathic'} onClick={() => setFramework('homeopathic')} disabled />
      </nav>

      {framework === 'ayurveda' ? (
        <AyurvedaPanel />
      ) : framework === 'tcm' ? (
        <ComingSoon name="TCM (Five Elements, Yin Yang balance)" />
      ) : (
        <ComingSoon name="Homeopathic constitutional types" />
      )}
    </div>
  );
}

function FrameworkTab({
  id, label, active, onClick, disabled,
}: { id: Framework; label: string; active: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
        active
          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
          : 'border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50'
      }`}
    >
      {disabled && <Lock className="h-3 w-3" strokeWidth={1.5} />}
      {label}
    </button>
  );
}

function ComingSoon({ name }: { name: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
      <Lock className="mx-auto h-6 w-6 text-white/40" strokeWidth={1.5} />
      <p className="mt-3 text-base font-semibold text-white">{name}</p>
      <p className="mt-2 text-sm text-white/55">
        Coming soon. The Ayurveda framework on the previous tab is fully functional today.
      </p>
    </div>
  );
}

function AyurvedaPanel() {
  const [answers, setAnswers] = useState<Record<number, Dosha>>({});

  const totals = useMemo(() => {
    const t = { vata: 0, pitta: 0, kapha: 0 };
    for (const dosha of Object.values(answers)) t[dosha]++;
    return t;
  }, [answers]);

  const answered = Object.keys(answers).length;
  const all = QUESTIONS.length;
  const complete = answered === all;

  function reset() { setAnswers({}); }

  const sorted = (['vata', 'pitta', 'kapha'] as Dosha[]).sort(
    (a, b) => totals[b] - totals[a],
  );
  const primary = sorted[0];
  const secondary = sorted[1];

  return (
    <div className="grid gap-5 md:grid-cols-[1.4fr_1fr]">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-300">
            Dosha questionnaire
          </p>
          <p className="text-xs text-white/55">{answered} of {all} answered</p>
        </div>
        <div className="flex flex-col gap-4">
          {QUESTIONS.map((q) => (
            <fieldset key={q.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <legend className="px-2 text-xs font-semibold text-white/85">
                {q.id}. {q.prompt}
              </legend>
              <div className="mt-2 grid gap-2 md:grid-cols-3">
                {q.options.map((opt) => {
                  const selected = answers[q.id] === opt.dosha;
                  return (
                    <button
                      key={opt.dosha}
                      type="button"
                      onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.dosha }))}
                      className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
                        selected
                          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-100'
                          : 'border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06]'
                      }`}
                    >
                      <DoshaTag dosha={opt.dosha} />
                      <span className="mt-1 block">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/70 hover:bg-white/[0.08]"
          >
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
            Reset
          </button>
          <button
            disabled={!complete}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save to patient record
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </section>

      <aside className="flex flex-col gap-4">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-white/45">Tally</p>
          <ul className="flex flex-col gap-2">
            {(['vata','pitta','kapha'] as Dosha[]).map((d) => (
              <li key={d} className="flex items-center justify-between text-sm">
                <DoshaTag dosha={d} />
                <span className="font-semibold text-white">{totals[d]}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-emerald-300">Result</p>
          {complete ? (
            <>
              <p className="text-base font-semibold text-white">
                Primary: <DoshaTag dosha={primary} />
              </p>
              {totals[secondary] > 0 && (
                <p className="mt-1 text-sm text-white/65">
                  Secondary: <DoshaTag dosha={secondary} />
                </p>
              )}
              <p className="mt-3 text-xs leading-relaxed text-white/60">
                Tailor diet, daily rhythm, and botanical selection to balance the dominant dosha.
              </p>
            </>
          ) : (
            <p className="text-sm text-white/55">
              Answer every question to view the primary and secondary dosha.
            </p>
          )}
        </section>
      </aside>
    </div>
  );
}

function DoshaTag({ dosha }: { dosha: Dosha }) {
  const cfg = {
    vata:  { label: 'Vata',  Icon: Wind,     tone: 'bg-sky-500/15 text-sky-300 border border-sky-500/30' },
    pitta: { label: 'Pitta', Icon: Flame,    tone: 'bg-orange-500/15 text-orange-300 border border-orange-500/30' },
    kapha: { label: 'Kapha', Icon: Droplets, tone: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' },
  }[dosha];
  const Icon = cfg.Icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.tone}`}>
      <Icon className="h-3 w-3" strokeWidth={1.5} />
      {cfg.label}
    </span>
  );
}
