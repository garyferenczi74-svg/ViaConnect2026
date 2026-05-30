/**
 * NLU parse hook per Prompt 170j §11.4 preview state.
 *
 * Wraps parseTranscript with state for the OperationPreview component.
 * Handles abort on re-parse so stale results never overwrite fresh ones.
 */

'use client';

import { useCallback, useRef, useState } from 'react';
import type { MealDraft } from '@/app/(app)/(consumer)/nutrition/components/NutriVisionTab/types';
import type { NLUParseResult } from '../types';
import { parseTranscript } from '../nlu/parse-client';

export type NLUStatus = 'idle' | 'parsing' | 'completed' | 'needs_clarification' | 'error';

export interface VoiceNLUState {
  status: NLUStatus;
  result: NLUParseResult | null;
  error_message: string | null;
}

export interface UseVoiceNLUReturn {
  state: VoiceNLUState;
  parse: (args: {
    transcript: string;
    meal_draft: MealDraft;
    stt_confidence: number | null;
    transcript_locale?: string;
  }) => Promise<void>;
  reset: () => void;
}

const INITIAL_STATE: VoiceNLUState = {
  status: 'idle',
  result: null,
  error_message: null,
};

export function useVoiceNLU(): UseVoiceNLUReturn {
  const [state, setState] = useState<VoiceNLUState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);

  const parse = useCallback(
    async (args: {
      transcript: string;
      meal_draft: MealDraft;
      stt_confidence: number | null;
      transcript_locale?: string;
    }): Promise<void> => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      setState({ status: 'parsing', result: null, error_message: null });

      const result = await parseTranscript({
        transcript: args.transcript,
        meal_draft: args.meal_draft,
        stt_confidence: args.stt_confidence,
        transcript_locale: args.transcript_locale,
        signal: ac.signal,
      });

      if (ac.signal.aborted) return;
      abortRef.current = null;

      if ('kind' in result) {
        setState({
          status: 'error',
          result: null,
          error_message: result.message,
        });
        return;
      }

      if (result.needs_clarification) {
        setState({ status: 'needs_clarification', result, error_message: null });
        return;
      }

      setState({ status: 'completed', result, error_message: null });
    },
    []
  );

  const reset = useCallback((): void => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState(INITIAL_STATE);
  }, []);

  return { state, parse, reset };
}
