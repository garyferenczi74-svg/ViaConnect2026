'use client';

import { useState, useRef, useEffect } from 'react';
import { SendHorizonal, ChevronDown } from 'lucide-react';
import { getDisplayName } from '@/lib/getDisplayName';
import { DSHEADisclaimer } from '@/components/compliance/DSHEADisclaimer';
import { EmergingBadge } from './EmergingBadge';
import { BEGINNER_QA_DOMAINS, type BeginnerQADomainId } from './beginnerQADomains';

// ── Types ────────────────────────────────────────────────────────────────────

interface HannahAskResponse {
  answer: string;
  emerging: boolean;
  coverage?: string;
  citedAtomIds?: string[];
}

interface QAEntry {
  id: string;
  question: string;
  answer: string;
  emerging: boolean;
  coverage?: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

// Domain list lives in beginnerQADomains.ts so tests can import it
// without triggering the JSX transform (BeginnerQA.tsx uses JSX).
const DOMAINS = BEGINNER_QA_DOMAINS;

type DomainId = BeginnerQADomainId;

const HANNAH_NAME = getDisplayName('hannah');

// ── Thinking Dots (reused from /ai page visual language) ─────────────────────

function ThinkingDots() {
  return (
    <div className="flex items-start">
      <div className="glass-v2 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-1.5" aria-label="Hannah is thinking" role="status">
          <span
            className="w-2 h-2 rounded-full animate-bounce [animation-delay:0ms]"
            style={{ background: 'rgba(45,165,160,0.6)' }}
          />
          <span
            className="w-2 h-2 rounded-full animate-bounce [animation-delay:150ms]"
            style={{ background: 'rgba(45,165,160,0.6)' }}
          />
          <span
            className="w-2 h-2 rounded-full animate-bounce [animation-delay:300ms]"
            style={{ background: 'rgba(45,165,160,0.6)' }}
          />
        </div>
      </div>
    </div>
  );
}

// ── BeginnerQA ────────────────────────────────────────────────────────────────

export function BeginnerQA(): JSX.Element {
  const [domain, setDomain]       = useState<DomainId>('nutraceuticals');
  const [question, setQuestion]   = useState('');
  const [entries, setEntries]     = useState<QAEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const bottomRef                 = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new entries or thinking state
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries, isLoading]);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const q = question.trim();
    if (!q || isLoading) return;

    setQuestion('');
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/hannah/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: q, domain }),
      });

      if (!res.ok) {
        throw new Error(`Server error ${res.status}`);
      }

      const data: HannahAskResponse = await res.json();

      setEntries((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          question: q,
          answer: data.answer,
          emerging: data.emerging,
          coverage: data.coverage,
        },
      ]);
    } catch {
      setError('Something went wrong. Please try again in a moment.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  }

  const selectedDomainLabel = DOMAINS.find((d) => d.id === domain)?.label ?? domain;

  return (
    <div className="flex flex-col w-full h-full">
      {/* ── Domain selector ─────────────────────────────────────── */}
      <div className="px-3 md:px-5 pt-4 pb-3">
        <p className="text-xs text-gray-400 mb-2">Topic area</p>
        {/* Mobile: native select with chevron */}
        <div className="relative md:hidden">
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value as DomainId)}
            className="w-full appearance-none glass-v2 rounded-xl px-3 py-2 text-sm pr-8 outline-none cursor-pointer"
            style={{ color: '#2DA5A0', background: 'transparent' }}
            aria-label="Select domain"
          >
            {DOMAINS.map((d) => (
              <option key={d.id} value={d.id} style={{ background: '#0D1730', color: '#e2e8f0' }}>
                {d.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4"
            strokeWidth={1.5}
            style={{ color: '#2DA5A0' }}
          />
        </div>
        {/* Desktop: pill row */}
        <div className="hidden md:flex flex-wrap gap-2" role="group" aria-label="Domain filter">
          {DOMAINS.map((d) => {
            const active = d.id === domain;
            return (
              <button
                key={d.id}
                onClick={() => setDomain(d.id)}
                className="text-xs px-3 py-1.5 rounded-full transition-all"
                style={
                  active
                    ? {
                        background: 'rgba(45,165,160,0.18)',
                        color: '#2DA5A0',
                        border: '1px solid rgba(45,165,160,0.40)',
                      }
                    : {
                        background: 'rgba(255,255,255,0.05)',
                        color: 'rgba(255,255,255,0.55)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }
                }
                aria-pressed={active}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Q&A history ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 md:px-5 space-y-5 min-h-0">
        {entries.length === 0 && !isLoading && (
          <div className="py-6 text-center">
            <p className="text-sm text-gray-400">
              Ask {HANNAH_NAME} anything about {selectedDomainLabel.toLowerCase()}.
            </p>
          </div>
        )}

        {entries.map((entry) => (
          <div key={entry.id} className="space-y-2">
            {/* User question */}
            <div className="flex justify-end">
              <div
                className="max-w-[90%] md:max-w-[80%] rounded-2xl px-4 py-2.5"
                style={{ background: 'rgba(30, 58, 95, 0.9)' }}
              >
                <p className="text-sm text-white leading-relaxed">{entry.question}</p>
              </div>
            </div>

            {/* Hannah answer */}
            <div className="flex justify-start">
              <div className="glass-v2 rounded-2xl px-4 py-3 max-w-[90%] md:max-w-[80%]">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-xs font-bold" style={{ color: '#2DA5A0' }}>
                    {HANNAH_NAME}
                  </span>
                  {entry.emerging && <EmergingBadge />}
                </div>
                <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">
                  {entry.answer}
                </p>
                {entry.coverage && entry.coverage !== 'full' && (
                  <p className="mt-2 text-xs text-gray-400">
                    Coverage: {entry.coverage}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && <ThinkingDots />}

        {error && (
          <div
            className="rounded-xl px-4 py-3 text-sm text-center"
            role="alert"
            style={{ background: 'rgba(255,80,80,0.08)', color: '#f87171', border: '1px solid rgba(255,80,80,0.2)' }}
          >
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input area ──────────────────────────────────────────── */}
      <form
        onSubmit={(e) => { void handleSubmit(e); }}
        className="px-3 md:px-5 pt-3 pb-2"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div
          className="flex items-end gap-2 glass-v2 rounded-2xl px-3 py-2"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask ${HANNAH_NAME} about ${selectedDomainLabel.toLowerCase()}...`}
            rows={1}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-500 outline-none resize-none py-1 leading-relaxed"
            aria-label="Ask a question"
          />
          <button
            type="submit"
            disabled={!question.trim() || isLoading}
            className="flex-shrink-0 flex items-center justify-center rounded-full transition-all disabled:opacity-40 min-h-[44px] min-w-[44px] w-10 h-10"
            style={{ background: 'linear-gradient(135deg, #2DA5A0, #1F8A85)' }}
            aria-label="Send question"
          >
            <SendHorizonal className="w-4 h-4 text-white" strokeWidth={1.5} />
          </button>
        </div>
      </form>

      {/* ── DSHEA educational disclaimer ────────────────────────── */}
      <DSHEADisclaimer surface="beginner-qa" surfaceId="hannah-ask" />
    </div>
  );
}
