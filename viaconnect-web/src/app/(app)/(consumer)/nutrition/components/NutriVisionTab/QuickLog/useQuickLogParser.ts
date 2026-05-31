// Prompt 170m Phase C: useQuickLogParser hook.
//
// Orchestrates the parse + clarify cycle for the Quick Log modal. Owns the
// in-flight state (typing | loading | clarifying | error). Up to 2 rounds
// of clarification per parse per spec 9.5; a third unresolved round
// transitions to the error state.

'use client';

import { useCallback, useRef, useState } from 'react';
import { parseQuickLog, clarifyQuickLog } from '@/lib/nutrition/quick-log/parse-client';
import type {
  ParseQuickLogError,
} from '@/lib/nutrition/quick-log/parse-client';
import type {
  QuickLogParseResult,
  ClarificationQuestion,
} from '@/lib/nutrition/quick-log/types';

export type ParserStage = 'typing' | 'loading' | 'clarifying' | 'error' | 'done';

const MAX_CLARIFICATION_ROUNDS = 2;

interface UseQuickLogParserState {
  stage: ParserStage;
  result: QuickLogParseResult | null;
  error: ParseQuickLogError | null;
  clarificationRounds: number;
  originalText: string;
  appliedClarifications: Array<{
    question_text: string;
    answer: string;
    linked_meal_item_index: number;
  }>;
}

export function useQuickLogParser() {
  const abortRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<UseQuickLogParserState>({
    stage: 'typing',
    result: null,
    error: null,
    clarificationRounds: 0,
    originalText: '',
    appliedClarifications: [],
  });

  const parse = useCallback(async (text: string, locale?: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setState({
      stage: 'loading',
      result: null,
      error: null,
      clarificationRounds: 0,
      originalText: text,
      appliedClarifications: [],
    });

    const res = await parseQuickLog({ text, locale, signal: abortRef.current.signal });
    if ('kind' in res) {
      setState((prev) => ({ ...prev, stage: 'error', error: res }));
      return;
    }
    if (res.needs_clarification && res.clarification_questions.length > 0) {
      setState((prev) => ({
        ...prev,
        stage: 'clarifying',
        result: res,
      }));
      return;
    }
    setState((prev) => ({ ...prev, stage: 'done', result: res }));
  }, []);

  const resolveClarification = useCallback(async (
    question: ClarificationQuestion,
    answer: string,
    locale?: string,
  ) => {
    setState((prev) => {
      const applied = [
        ...prev.appliedClarifications,
        {
          question_text: question.question_text,
          answer,
          linked_meal_item_index: question.linked_meal_item_index,
        },
      ];
      return {
        ...prev,
        stage: 'loading',
        appliedClarifications: applied,
        clarificationRounds: prev.clarificationRounds + 1,
      };
    });

    const snapshot = {
      originalText: '',
      appliedClarifications: [] as Array<{ question_text: string; answer: string; linked_meal_item_index: number; }>,
    };
    setState((prev) => {
      snapshot.originalText = prev.originalText;
      snapshot.appliedClarifications = prev.appliedClarifications;
      return prev;
    });

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const newClarifications = [
      ...snapshot.appliedClarifications,
      {
        question_text: question.question_text,
        answer,
        linked_meal_item_index: question.linked_meal_item_index,
      },
    ];

    const res = await clarifyQuickLog({
      original_text: snapshot.originalText,
      clarifications: newClarifications,
      locale,
      signal: abortRef.current.signal,
    });
    if ('kind' in res) {
      setState((prev) => ({ ...prev, stage: 'error', error: res }));
      return;
    }
    if (res.needs_clarification && res.clarification_questions.length > 0) {
      setState((prev) => {
        if (prev.clarificationRounds >= MAX_CLARIFICATION_ROUNDS) {
          return {
            ...prev,
            stage: 'error',
            error: { kind: 'malformed_response', message: 'Could not resolve all clarifications' },
            result: res,
          };
        }
        return { ...prev, stage: 'clarifying', result: res };
      });
      return;
    }
    setState((prev) => ({ ...prev, stage: 'done', result: res }));
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState({
      stage: 'typing',
      result: null,
      error: null,
      clarificationRounds: 0,
      originalText: '',
      appliedClarifications: [],
    });
  }, []);

  return { state, parse, resolveClarification, reset };
}
