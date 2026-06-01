// Prompt 170n Phase C: useVoiceNativeParser hook.
//
// Orchestrates the parse + clarify cycle for the voice-native capture overlay.
// Mirrors the 170m useQuickLogParser pattern with voice-specific additions
// (STT provider + STT confidence flow through into the parser request).
//
// Up to 2 clarification rounds per spec; third unresolved transitions to
// error state.

'use client';

import { useCallback, useRef, useState } from 'react';
import { parseVoiceNative, clarifyVoiceNative } from '@/lib/nutrition/voice-native/parse-client';
import type {
  ParseVoiceNativeError,
} from '@/lib/nutrition/voice-native/parse-client';
import type {
  VoiceNativeParseResult,
  VoiceNativeClarificationQuestion,
  SttProvider,
} from '@/lib/nutrition/voice-native/types';

export type VoiceNativeParserStage = 'idle' | 'loading' | 'clarifying' | 'error' | 'done';

const MAX_CLARIFICATION_ROUNDS = 2;

interface UseVoiceNativeParserState {
  stage: VoiceNativeParserStage;
  result: VoiceNativeParseResult | null;
  error: ParseVoiceNativeError | null;
  clarificationRounds: number;
  originalTranscript: string;
  sttProvider: SttProvider | null;
  sttConfidenceAvg: number;
  appliedClarifications: Array<{
    question_text: string;
    answer: string;
    linked_meal_item_index: number;
  }>;
}

const INITIAL_STATE: UseVoiceNativeParserState = {
  stage: 'idle',
  result: null,
  error: null,
  clarificationRounds: 0,
  originalTranscript: '',
  sttProvider: null,
  sttConfidenceAvg: 0,
  appliedClarifications: [],
};

export function useVoiceNativeParser() {
  const abortRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<UseVoiceNativeParserState>(INITIAL_STATE);

  const parse = useCallback(async (
    transcript: string,
    sttProvider: SttProvider,
    sttConfidenceAvg: number,
    opts?: { locale?: string; safetyMode?: boolean },
  ) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setState({
      stage: 'loading',
      result: null,
      error: null,
      clarificationRounds: 0,
      originalTranscript: transcript,
      sttProvider,
      sttConfidenceAvg,
      appliedClarifications: [],
    });

    const res = await parseVoiceNative({
      transcript,
      stt_provider: sttProvider,
      stt_confidence_avg: sttConfidenceAvg,
      locale: opts?.locale,
      safety_mode: opts?.safetyMode,
      signal: abortRef.current.signal,
    });

    if ('kind' in res) {
      setState((prev) => ({ ...prev, stage: 'error', error: res }));
      return;
    }
    if (res.needs_clarification && res.clarification_questions.length > 0) {
      setState((prev) => ({ ...prev, stage: 'clarifying', result: res }));
      return;
    }
    setState((prev) => ({ ...prev, stage: 'done', result: res }));
  }, []);

  const resolveClarification = useCallback(async (
    question: VoiceNativeClarificationQuestion,
    answer: string,
    opts?: { locale?: string; safetyMode?: boolean; additionalTranscript?: string },
  ) => {
    const snapshot = {
      originalTranscript: '',
      sttProvider: null as SttProvider | null,
      sttConfidenceAvg: 0,
      appliedClarifications: [] as Array<{ question_text: string; answer: string; linked_meal_item_index: number; }>,
      clarificationRounds: 0,
    };
    setState((prev) => {
      snapshot.originalTranscript = prev.originalTranscript;
      snapshot.sttProvider = prev.sttProvider;
      snapshot.sttConfidenceAvg = prev.sttConfidenceAvg;
      snapshot.appliedClarifications = prev.appliedClarifications;
      snapshot.clarificationRounds = prev.clarificationRounds;
      return {
        ...prev,
        stage: 'loading',
        appliedClarifications: [
          ...prev.appliedClarifications,
          {
            question_text: question.question_text,
            answer,
            linked_meal_item_index: question.linked_meal_item_index,
          },
        ],
        clarificationRounds: prev.clarificationRounds + 1,
      };
    });

    if (!snapshot.sttProvider) {
      setState((prev) => ({
        ...prev,
        stage: 'error',
        error: { kind: 'invalid_input', message: 'No STT provider in flight' },
      }));
      return;
    }

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

    const res = await clarifyVoiceNative({
      original_transcript: snapshot.originalTranscript,
      stt_provider: snapshot.sttProvider,
      stt_confidence_avg: snapshot.sttConfidenceAvg,
      clarifications: newClarifications,
      additional_transcript: opts?.additionalTranscript,
      locale: opts?.locale,
      safety_mode: opts?.safetyMode,
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
    setState(INITIAL_STATE);
  }, []);

  return { state, parse, resolveClarification, reset };
}
