/**
 * Voice session orchestration hook per Prompt 170j §11.4.
 *
 * Composes useVoiceCapture + useVoiceNLU + useVoiceApply into a single
 * session lifecycle the AnalysisResult component consumes. Owns the phase
 * state machine: closed -> capturing -> processing -> preview -> applied
 * (or clarifying / error along the way).
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  MealDraft,
  MealItemDraft,
} from '@/app/(app)/(consumer)/nutrition/components/NutriVisionTab/types';
import type { VoiceOperation } from '../types';
import type { VoiceMutatorHandles } from '../apply/operation-applicator';
import { useVoiceCapture, type VoiceCaptureState } from './useVoiceCapture';
import { useVoiceNLU, type VoiceNLUState } from './useVoiceNLU';
import { useVoiceApply, type VoiceApplyState } from './useVoiceApply';
import type { VoiceErrorClass } from '../types';

export type VoiceSessionPhase =
  | 'closed'
  | 'capturing'
  | 'processing'
  | 'preview'
  | 'clarifying'
  | 'error'
  | 'applied';

export interface UseVoiceSessionArgs {
  draft: MealDraft;
  mutators: VoiceMutatorHandles;
  restoreSnapshot: (items: ReadonlyArray<MealItemDraft>) => void;
}

export interface UseVoiceSessionReturn {
  phase: VoiceSessionPhase;
  capture: {
    state: VoiceCaptureState;
  };
  nlu: {
    state: VoiceNLUState;
  };
  apply: {
    state: VoiceApplyState;
  };
  errorKind: VoiceErrorClass | null;
  errorMessage: string | null;
  open: () => Promise<void>;
  close: () => void;
  stopCapture: () => void;
  applyAll: (operations: VoiceOperation[]) => void;
  answerClarification: (selectedTarget: string) => void;
  tryAgain: () => Promise<void>;
  undoLast: () => boolean;
  dismissToast: () => void;
}

export function useVoiceSession({
  draft,
  mutators,
  restoreSnapshot,
}: UseVoiceSessionArgs): UseVoiceSessionReturn {
  const [phase, setPhase] = useState<VoiceSessionPhase>('closed');
  const capture = useVoiceCapture();
  const nlu = useVoiceNLU();
  const apply = useVoiceApply({ mutators, restoreSnapshot });

  const open = useCallback(async (): Promise<void> => {
    setPhase('capturing');
    await capture.startCapture();
  }, [capture]);

  const close = useCallback((): void => {
    capture.reset();
    nlu.reset();
    apply.reset();
    setPhase('closed');
  }, [capture, nlu, apply]);

  const stopCapture = useCallback((): void => {
    capture.stopCapture();
  }, [capture]);

  // Capture completed -> kick off NLU parse.
  useEffect(() => {
    if (capture.state.status === 'completed' && phase === 'capturing') {
      setPhase('processing');
      void nlu.parse({
        transcript: capture.state.transcript,
        meal_draft: draft,
        stt_confidence: capture.state.stt_confidence,
      });
    }
  }, [
    capture.state.status,
    capture.state.transcript,
    capture.state.stt_confidence,
    draft,
    nlu,
    phase,
  ]);

  // Capture errored -> error phase.
  useEffect(() => {
    if (capture.state.status === 'error') {
      setPhase('error');
    }
  }, [capture.state.status]);

  // NLU transitions.
  useEffect(() => {
    if (nlu.state.status === 'completed' && phase === 'processing') {
      setPhase('preview');
    } else if (nlu.state.status === 'needs_clarification') {
      setPhase('clarifying');
    } else if (nlu.state.status === 'error') {
      setPhase('error');
    }
  }, [nlu.state.status, phase]);

  const applyAll = useCallback(
    (operations: VoiceOperation[]): void => {
      apply.applyOperations(operations, draft);
      setPhase('applied');
    },
    [apply, draft]
  );

  const tryAgain = useCallback(async (): Promise<void> => {
    capture.reset();
    nlu.reset();
    setPhase('capturing');
    await capture.startCapture();
  }, [capture, nlu]);

  const undoLast = useCallback((): boolean => {
    const undone = apply.undoLast();
    if (undone) {
      setPhase('closed');
    }
    return undone;
  }, [apply]);

  const answerClarification = useCallback(
    (selectedTarget: string): void => {
      const augmented = `${capture.state.transcript} (about ${selectedTarget})`;
      setPhase('processing');
      void nlu.parse({
        transcript: augmented,
        meal_draft: draft,
        stt_confidence: capture.state.stt_confidence,
      });
    },
    [nlu, capture.state.transcript, capture.state.stt_confidence, draft]
  );

  const dismissToast = useCallback((): void => {
    setPhase('closed');
  }, []);

  const errorKind = useMemo<VoiceErrorClass | null>(() => {
    if (capture.state.error) {
      const k = capture.state.error.kind;
      if (k === 'no_speech_detected') return 'no_speech_detected';
      if (k === 'permission_denied') return 'microphone_permission_denied';
      if (k === 'network_error') return 'network_error';
      return 'nlu_service_unavailable';
    }
    if (nlu.state.status === 'error') return 'nlu_service_unavailable';
    return null;
  }, [capture.state.error, nlu.state.status]);

  const errorMessage = capture.state.error?.message ?? nlu.state.error_message ?? null;

  return {
    phase,
    capture: { state: capture.state },
    nlu: { state: nlu.state },
    apply: { state: apply.state },
    errorKind,
    errorMessage,
    open,
    close,
    stopCapture,
    applyAll,
    answerClarification,
    tryAgain,
    undoLast,
    dismissToast,
  };
}
