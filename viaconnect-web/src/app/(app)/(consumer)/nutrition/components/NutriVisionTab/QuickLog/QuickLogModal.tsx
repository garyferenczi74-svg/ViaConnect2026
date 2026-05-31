// Prompt 170m Phase C: Quick Log text input modal.
//
// Hannah 9.2 wireframe. Manages internal states: typing, parse loading,
// clarification card, error. On parse completion (no more clarifications)
// fires onParseComplete with the QuickLogParseResult so the parent can
// transition to the result review screen.
//
// No backdrop click dismiss (spec 9.2 push-back: typed text must survive).
// Help link in header opens an inline tutorial overlay; first-time tutorial
// triggers on the first-ever modal open and is deferred to a Phase D
// follow-up. v1 ships without the tutorial; users discover via the
// placeholder + cycling examples.
//
// Cycling examples halt once the user types non-whitespace. 500 char cap
// is hard-enforced. Cmd-Enter / Ctrl-Enter submits.

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { HelpCircle, Loader2, X } from 'lucide-react';
import { useQuickLogParser } from './useQuickLogParser';
import type { QuickLogParseResult } from '@/lib/nutrition/quick-log/types';

const PLACEHOLDER = 'What did you eat? For example: two scrambled eggs and toast';
const CHAR_CAP = 500;
const ORANGE_AT = 480;
const ORANGE_MEDIUM_AT = 495;
const EXAMPLES = [
  'Try: a Chipotle bowl with chicken and brown rice',
  'Try: Greek yogurt with berries and granola',
  'Try: two scrambled eggs, toast, and coffee',
  'Try: a Chobani vanilla yogurt',
  'Try: lunch, turkey sandwich with chips and a Coke',
];
const EXAMPLE_CYCLE_MS = 5000;

export interface QuickLogModalProps {
  open: boolean;
  locale?: string;
  onClose: () => void;
  onParseComplete: (result: QuickLogParseResult, originalText: string) => void;
}

export function QuickLogModal({
  open,
  locale,
  onClose,
  onParseComplete,
}: QuickLogModalProps): JSX.Element | null {
  const [text, setText] = useState('');
  const [exampleIndex, setExampleIndex] = useState(0);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { state, parse, resolveClarification, reset } = useQuickLogParser();

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => {
      if (text.trim().length === 0) {
        setExampleIndex((i) => (i + 1) % EXAMPLES.length);
      }
    }, EXAMPLE_CYCLE_MS);
    return () => window.clearInterval(id);
  }, [open, text]);

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => textareaRef.current?.focus(), 100);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (state.stage === 'done' && state.result) {
      onParseComplete(state.result, state.originalText);
      setText('');
      reset();
    }
  }, [state, onParseComplete, reset]);

  const handleParse = useCallback(() => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    void parse(trimmed, locale);
  }, [text, locale, parse]);

  const requestClose = useCallback(() => {
    if (text.trim().length > 0 && state.stage === 'typing') {
      setShowDiscardConfirm(true);
      return;
    }
    setText('');
    reset();
    onClose();
  }, [text, state.stage, reset, onClose]);

  const confirmDiscard = useCallback(() => {
    setText('');
    reset();
    setShowDiscardConfirm(false);
    onClose();
  }, [reset, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        requestClose();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleParse();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, requestClose, handleParse]);

  if (!open) return null;

  const charCount = text.length;
  const counterColor = charCount >= ORANGE_AT ? '#B75E18' : 'rgba(255,255,255,0.7)';
  const counterWeight = charCount >= ORANGE_MEDIUM_AT ? 600 : 500;
  const parseDisabled = text.trim().length === 0 || state.stage === 'loading';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-log-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#1A2744]/92 backdrop-blur-sm md:items-center"
    >
      <div className="relative flex w-full max-w-2xl flex-col rounded-t-2xl bg-[#1E3054] text-white md:max-h-[90vh] md:rounded-2xl">
        <header className="flex h-14 items-center justify-between border-b border-white/[0.06] px-4">
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close Quick Log"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-white/85 hover:bg-white/5"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <h2 id="quick-log-title" className="text-lg font-medium text-white">
            Quick log
          </h2>
          <button
            type="button"
            aria-label="Quick Log help"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-white/70 hover:bg-white/5"
          >
            <HelpCircle className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-3 px-4 py-5">
          <label htmlFor="quick-log-textarea" className="sr-only">
            Quick log meal description
          </label>
          <textarea
            id="quick-log-textarea"
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, CHAR_CAP))}
            placeholder={PLACEHOLDER}
            disabled={state.stage === 'loading' || state.stage === 'clarifying'}
            aria-readonly={state.stage === 'loading' ? 'true' : 'false'}
            aria-busy={state.stage === 'loading' ? 'true' : 'false'}
            rows={6}
            className="min-h-[144px] w-full resize-y rounded-xl border border-white/[0.06] bg-[#1A2744]/55 px-4 py-3 text-sm leading-relaxed text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#2DA5A0] disabled:opacity-70"
          />

          {state.stage === 'typing' || state.stage === 'loading' ? (
            <div className="flex items-center justify-between text-[12px]">
              <span
                aria-live="off"
                className="italic text-white/60 transition-opacity"
              >
                {text.trim().length === 0 ? EXAMPLES[exampleIndex] : ''}
              </span>
              <span style={{ color: counterColor, fontWeight: counterWeight }}>
                {charCount} / {CHAR_CAP}
              </span>
            </div>
          ) : null}

          {state.stage === 'loading' ? (
            <div className="flex items-center justify-center gap-3 rounded-xl bg-white/[0.04] px-4 py-3 text-sm text-white/80">
              <Loader2 className="h-5 w-5 animate-spin text-[#2DA5A0]" strokeWidth={1.5} aria-hidden="true" />
              <span aria-live="polite">Reading what you wrote...</span>
            </div>
          ) : null}

          {state.stage === 'clarifying' && state.result && state.result.clarification_questions.length > 0 ? (
            <ClarificationCard
              question={state.result.clarification_questions[0]}
              onResolve={(answer) => {
                if (state.result) {
                  void resolveClarification(state.result.clarification_questions[0], answer, locale);
                }
              }}
            />
          ) : null}

          {state.stage === 'error' && state.error ? (
            <div role="alert" className="rounded-xl border border-[#FCA5A5]/40 bg-[#FCA5A5]/[0.06] px-4 py-3 text-sm text-[#FCA5A5]">
              {state.error.message ?? 'Something went wrong. Try again.'}
            </div>
          ) : null}
        </div>

        {state.stage === 'typing' || state.stage === 'error' ? (
          <footer className="flex flex-col gap-3 border-t border-white/[0.06] px-4 py-4">
            <button
              type="button"
              onClick={handleParse}
              disabled={parseDisabled}
              className="inline-flex h-12 items-center justify-center rounded-xl bg-[#2DA5A0] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#2DA5A0]/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Parse
            </button>
            <button
              type="button"
              onClick={requestClose}
              className="text-center text-sm text-white/80 underline hover:text-white"
            >
              Cancel
            </button>
          </footer>
        ) : null}
      </div>

      {showDiscardConfirm ? (
        <DiscardConfirmation
          onConfirm={confirmDiscard}
          onCancel={() => setShowDiscardConfirm(false)}
        />
      ) : null}
    </div>
  );
}

function ClarificationCard({
  question,
  onResolve,
}: {
  question: import('@/lib/nutrition/quick-log/types').ClarificationQuestion;
  onResolve: (answer: string) => void;
}): JSX.Element {
  const [selected, setSelected] = useState<string | null>(null);
  const [freeText, setFreeText] = useState('');

  const continueEnabled = (selected !== null) || (freeText.trim().length > 0);
  const handleContinue = () => {
    const answer = freeText.trim().length > 0 ? freeText.trim() : (selected ?? '');
    if (answer.length > 0) onResolve(answer);
  };

  return (
    <section
      role="group"
      aria-labelledby="qlog-clarification-q"
      className="rounded-xl border border-white/[0.06] bg-[#1A2744]/40 p-4"
    >
      <p id="qlog-clarification-q" className="text-sm font-medium text-white">
        {question.question_text}
      </p>
      <div role="radiogroup" aria-labelledby="qlog-clarification-q" className="mt-4 flex flex-wrap gap-2">
        {question.option_chips.map((chip) => {
          const isSelected = selected === chip;
          return (
            <button
              key={chip}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => { setSelected(chip); setFreeText(''); }}
              className={`inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm transition-colors ${
                isSelected
                  ? 'border-2 border-[#2DA5A0] bg-[#2DA5A0]/15 text-[#2DA5A0]'
                  : 'border border-white/[0.06] bg-[#1E3054]/55 text-white/90 hover:bg-[#1E3054]/80'
              }`}
            >
              {chip}
            </button>
          );
        })}
      </div>
      <label className="mt-4 flex flex-col gap-1 text-[12px] text-white/70">
        Or describe in more detail
        <input
          type="text"
          value={freeText}
          onChange={(e) => { setFreeText(e.target.value); if (e.target.value.length > 0) setSelected(null); }}
          placeholder="Type a quantity or detail"
          className="h-10 rounded-lg border border-white/[0.06] bg-[#1E3054]/55 px-3 text-sm text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-[#2DA5A0]"
        />
      </label>
      <button
        type="button"
        onClick={handleContinue}
        disabled={!continueEnabled}
        className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#2DA5A0] text-sm font-semibold text-white transition-colors hover:bg-[#2DA5A0]/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Continue
      </button>
    </section>
  );
}

function DiscardConfirmation({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}): JSX.Element {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="discard-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#1E3054] p-5 text-white">
        <h3 id="discard-title" className="text-base font-semibold">
          Discard what you typed?
        </h3>
        <p className="mt-2 text-sm text-white/70">
          We will not save the description.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[#2DA5A0] text-sm font-semibold text-white"
          >
            Keep typing
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-transparent text-sm font-medium text-[#B75E18] hover:bg-white/5"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}
