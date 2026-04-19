'use client';

// AI Holistic Advisor for nd, dc, lac credentialed practitioners.
// Phase 6 ships the chat shell + the naturopathic system prompt as the
// canonical text the backend Anthropic call will use. The actual chat
// transport reuses the existing Hannah AI infrastructure in a follow up.

import { useState } from 'react';
import { Leaf, Send, Sparkles, ShieldCheck } from 'lucide-react';

// Canonical system prompt for the naturopathic clinical assistant. Backend
// route imports from this module so the prompt is version controlled in one
// place; the route file should `import { HOLISTIC_ADVISOR_SYSTEM_PROMPT } ...`
export const HOLISTIC_ADVISOR_SYSTEM_PROMPT = `
You are the AI Holistic Advisor for ViaCura, assisting naturopathic and integrative
practitioners. Your role is to provide clinical guidance grounded in both traditional
naturopathic principles and modern evidence based medicine.

Core principles:
  vitalism and the healing power of nature, vis medicatrix naturae;
  treating the cause rather than the symptom;
  addressing the whole person;
  prevention focused medicine;
  education as therapy.

When responding:
  integrate traditional naturopathic assessment frameworks (constitutional, energetic,
  functional);
  reference both classical materia medica and modern clinical research;
  consider botanical, nutritional, and lifestyle interventions;
  respect the practitioner's clinical judgment;
  never replace the practitioner patient relationship.

When asked about supplements or protocols, reference ViaCura, FarmCeutica products
where appropriate, but do not exclude consideration of traditional botanical medicines,
lifestyle interventions, or constitutional approaches.

Always include the line: This information supports clinical decision making but does
not replace the practitioner's clinical judgment. Patient specific factors must be
considered.
`.trim();

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  ts: string;
}

const SAMPLE_PROMPTS = [
  'Open a Vata pacifying protocol for autumn dryness',
  'Compare adaptogenic options for HPA axis dysregulation',
  'Suggest botanical synergies for biliary stagnation',
  'Methylation support without aggressive remethylation',
];

export default function HolisticAdvisorPage() {
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  function handleSend() {
    const t = draft.trim();
    if (!t) return;
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: t,
      ts: new Date().toISOString(),
    };
    const placeholderReply: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content:
        'The naturopathic clinical assistant transport will land in a follow up phase. ' +
        'When wired, every reply ends with: This information supports clinical decision making ' +
        "but does not replace the practitioner's clinical judgment. Patient specific factors " +
        'must be considered.',
      ts: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg, placeholderReply]);
    setDraft('');
  }

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10">
          <Leaf className="h-5 w-5 text-emerald-300" strokeWidth={1.5} />
        </span>
        <div>
          <h1 className="text-xl font-semibold md:text-2xl">AI Holistic Advisor</h1>
          <p className="text-xs text-white/55">
            Naturopathic clinical guidance, grounded in both traditional principles and modern
            evidence.
          </p>
        </div>
      </header>

      <div className="grid gap-5 md:grid-cols-[1.6fr_1fr]">
        <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex min-h-[280px] flex-col gap-3">
            {messages.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-sm text-white/55">
                <Sparkles className="h-5 w-5 text-emerald-300" strokeWidth={1.5} />
                <p>Ask anything from constitutional assessment to botanical protocol design.</p>
              </div>
            ) : (
              messages.map((m) => (
                <article
                  key={m.id}
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'self-end bg-emerald-500/15 text-emerald-100'
                      : 'self-start bg-white/[0.04] text-white/80'
                  }`}
                >
                  {m.content}
                </article>
              ))
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="mt-auto flex items-center gap-2 rounded-xl border border-white/10 bg-[#0B1424] px-3 py-2"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type your clinical question"
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
            >
              <Send className="h-3.5 w-3.5" strokeWidth={1.5} />
              Send
            </button>
          </form>
        </section>

        <aside className="flex flex-col gap-4">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-white/45">
              Sample prompts
            </p>
            <ul className="flex flex-col gap-2 text-sm">
              {SAMPLE_PROMPTS.map((p) => (
                <li key={p}>
                  <button
                    type="button"
                    onClick={() => setDraft(p)}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-white/75 transition-colors hover:border-emerald-500/30 hover:bg-emerald-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                  >
                    {p}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
              Clinical disclaimer
            </div>
            <p className="text-xs leading-relaxed text-white/65">
              This information supports clinical decision making but does not replace the
              practitioner's clinical judgment. Patient specific factors must be considered.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
