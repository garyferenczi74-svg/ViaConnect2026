/**
 * Voice session orchestration hook per Prompt 170j §11.4.
 *
 * Composes useVoiceCapture + useVoiceNLU + useVoiceApply into a single
 * session lifecycle the AnalysisResult component consumes. Owns the phase
 * state machine: closed -> tutorial -> capturing -> processing -> preview
 * -> applied (or clarifying / error along the way).
 *
 * Phase 1c-3 additions:
 *   - 'tutorial' phase shown before first capture (hasSeenTutorial check)
 *   - applyAll handles add_item async via /api/nutrition/foods/search
 *   - helpSheetOpen state for VoiceHelpSheet integration
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  MealDraft,
  MealItemDraft,
} from '@/app/(app)/(consumer)/nutrition/components/NutriVisionTab/types';
import type { AddItemOperation, VoiceOperation, VoiceErrorClass } from '../types';
import type { VoiceMutatorHandles } from '../apply/operation-applicator';
import { searchAndBuildAddItem } from '../apply/add-item-handler';
import { hasSeenTutorial, markTutorialSeen } from '../components/VoiceTutorial';
import { useVoiceCapture, type VoiceCaptureState } from './useVoiceCapture';
import { useVoiceNLU, type VoiceNLUState } from './useVoiceNLU';
import { useVoiceApply, type VoiceApplyState } from './useVoiceApply';

export type VoiceSessionPhase =
  | 'closed'
  | 'tutorial'
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
  appendItem: (item: MealItemDraft) => void;
}

export interface UseVoiceSessionReturn {
  phase: VoiceSessionPhase;
  capture: { state: VoiceCaptureState };
  nlu: { state: VoiceNLUState };
  apply: { state: VoiceApplyState };
  errorKind: VoiceErrorClass | null;
  errorMessage: string | null;
  helpSheetOpen: boolean;
  open: () => Promise<void>;
  close: () => void;
  stopCapture: () => void;
  applyAll: (operations: VoiceOperation[]) => Promise<void>;
  answerClarification: (selectedTarget: string) => void;
  tryAgain: () => Promise<void>;
  undoLast: () => boolean;
  dismissToast: () => void;
  onTutorialComplete: () => Promise<void>;
  showHelp: () => void;
  hideHelp: () => void;
}

export function useVoiceSession({
  draft,
  mutators,
  restoreSnapshot,
  appendItem,
}: UseVoiceSessionArgs): UseVoiceSessionReturn {
  const [phase, setPhase] = useState<VoiceSessionPhase>('closed');
  const [helpSheetOpen, setHelpSheetOpen] = useState(false);
  const capture = useVoiceCapture();
  const nlu = useVoiceNLU();
  const apply = useVoiceApply({ mutators, restoreSnapshot });
  const addItemAbortRef = useRef<AbortController | null>(null);

  const startCaptureRaw = useCallback(async (): Promise<void> => {
    setPhase('capturing');
    await capture.startCapture();
  }, [capture]);

  const open = useCallback(async (): Promise<void> => {
    if (!hasSeenTutorial()) {
      setPhase('tutorial');
      return;
    }
    await startCaptureRaw();
  }, [startCaptureRaw]);

  const onTutorialComplete = useCallback(async (): Promise<void> => {
    markTutorialSeen();
    await startCaptureRaw();
  }, [startCaptureRaw]);

  const close = useCallback((): void => {
    addItemAbortRef.current?.abort();
    addItemAbortRef.current = null;
    capture.reset();
    nlu.reset();
    apply.reset();
    setHelpSheetOpen(false);
    setPhase('closed');
  }, [capture, nlu, apply]);

  const stopCapture = useCallback((): void => {
    capture.stopCapture();
  }, [capture]);

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

  useEffect(() => {
    if (capture.state.status === 'error') {
      setPhase('error');
    }
  }, [capture.state.status]);

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
    async (operations: VoiceOperation[]): Promise<void> => {
      // Phase 1c-3: split add_item (async food search) from sync ops.
      const syncOps = operations.filter((op) => op.op_kind !== 'add_item');
      const addItemOps = operations.filter(
        (op): op is AddItemOperation => op.op_kind === 'add_item'
      );

      apply.applyOperations(syncOps, draft);

      if (addItemOps.length > 0) {
        addItemAbortRef.current?.abort();
        const ac = new AbortController();
        addItemAbortRef.current = ac;
        for (const addOp of addItemOps) {
          if (ac.signal.aborted) break;
          const result = await searchAndBuildAddItem(addOp, ac.signal);
          if (result.success && result.item) {
            appendItem(result.item);
          }
        }
        addItemAbortRef.current = null;
      }

      setPhase('applied');
    },
    [apply, appendItem, draft]
  );

  const tryAgain = useCallback(async (): Promise<void> => {
    capture.reset();
    nlu.reset();
    await startCaptureRaw();
  }, [capture, nlu, startCaptureRaw]);

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

  const showHelp = useCallback((): void => {
    setHelpSheetOpen(true);
  }, []);

  const hideHelp = useCallback((): void => {
    setHelpSheetOpen(false);
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
    helpSheetOpen,
    open,
    close,
    stopCapture,
    applyAll,
    answerClarification,
    tryAgain,
    undoLast,
    dismissToast,
    onTutorialComplete,
    showHelp,
    hideHelp,
  };
}
