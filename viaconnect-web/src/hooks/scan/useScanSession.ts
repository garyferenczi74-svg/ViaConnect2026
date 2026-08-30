// Prompt 231 FormaVision 4-pose scan: capture-flow state machine (spec Section 7).
// Pure reducer plus a thin useReducer wrapper. No timers here; countdown ticks
// and camera watchdogs are driven externally (useCountdown, Task 6+) and
// dispatched in as plain actions.

import { useReducer, type Dispatch } from 'react';
import type { PoseId } from '@/lib/scan/poses';
import { POSE_ORDER } from '@/lib/scan/poses';
import type { QaCode, ScanFrame } from '@/lib/scan/types';
import { CAMERA_LOST_MESSAGE } from '@/lib/scan/scanCopy';

export type Phase =
  | 'SETUP'
  | 'WALK_IN'
  | 'PROMPT'
  | 'ARMED'
  | 'COUNT'
  | 'CAPTURE'
  | 'QA'
  | 'CHOICE'
  | 'REVIEW'
  | 'UPLOADING'
  | 'DONE'
  | 'CAMERA_LOST';

export type ScanState = {
  phase: Phase;
  poseIndex: number;
  count: number;
  retryCount: number;
  retakeMode: boolean;
  frames: (ScanFrame | null)[];
  scanId?: string;
  error?: string;
};

export type ScanAction =
  | { type: 'START' }
  | { type: 'WALK_IN_DONE' }
  | { type: 'PROMPT_DONE' }
  | { type: 'PRECHECK_PASS' }
  | { type: 'COUNT_SET'; display: number }
  | { type: 'COUNT_DONE' }
  | { type: 'PRECHECK_FAIL' }
  | { type: 'CAPTURED'; frame: ScanFrame }
  | { type: 'QA_PASS' }
  | { type: 'QA_FAIL'; code: QaCode }
  | { type: 'CHOOSE_RETRY' }
  | { type: 'CHOOSE_SKIP' }
  | { type: 'RETAKE'; poseIndex: number }
  | { type: 'SUBMIT' }
  | { type: 'SUBMIT_OK'; scanId: string }
  | { type: 'SUBMIT_FAIL'; error: string }
  | { type: 'DISCARD' }
  | { type: 'CAMERA_LOST' }
  | { type: 'RESET' };

export function initialScanState(): ScanState {
  return {
    phase: 'SETUP',
    poseIndex: 0,
    count: 0,
    retryCount: 0,
    retakeMode: false,
    frames: POSE_ORDER.map(() => null),
    scanId: undefined,
    error: undefined,
  };
}

// A minimal ScanFrame standing in for a pose the subject chose to skip. The
// reducer has no camera access, so the blob/objectUrl are empty placeholders;
// the UI layer never reads pixel data off a skipped frame, only `skipped`.
function skippedFrame(pose: PoseId, retryCount: number): ScanFrame {
  return {
    pose,
    blob: new Blob([], { type: 'image/jpeg' }),
    objectUrl: '',
    capturedAt: new Date().toISOString(),
    qa: { pass: false, code: 'NO_BODY', message: 'Skipped by user', mode: 'weak' },
    skipped: true,
    retryCount,
    capturedWidth: 0,
    capturedHeight: 0,
  };
}

// Shared by QA_PASS and CHOOSE_SKIP: move to REVIEW once the last pose is
// done (or a retake is in flight), otherwise step to the next pose's PROMPT.
function advance(state: ScanState): Pick<ScanState, 'phase' | 'poseIndex' | 'retryCount' | 'retakeMode'> {
  if (state.retakeMode || state.poseIndex === POSE_ORDER.length - 1) {
    return { phase: 'REVIEW', poseIndex: state.poseIndex, retryCount: state.retryCount, retakeMode: false };
  }
  return { phase: 'PROMPT', poseIndex: state.poseIndex + 1, retryCount: 0, retakeMode: state.retakeMode };
}

export function scanReducer(state: ScanState, action: ScanAction): ScanState {
  // CAMERA_LOST can interrupt any phase, so it is checked before the
  // phase-gated switch below.
  if (action.type === 'CAMERA_LOST') {
    return { ...state, phase: 'CAMERA_LOST' };
  }

  switch (action.type) {
    case 'START': {
      // SETUP -> WALK_IN: subject taps Start scan.
      if (state.phase !== 'SETUP') return state;
      return { ...state, phase: 'WALK_IN' };
    }

    case 'WALK_IN_DONE': {
      // WALK_IN -> PROMPT: walk-in animation finished, poseIndex unchanged.
      if (state.phase !== 'WALK_IN') return state;
      return { ...state, phase: 'PROMPT' };
    }

    case 'PROMPT_DONE': {
      // PROMPT -> ARMED: pose instructions shown, camera armed for precheck.
      if (state.phase !== 'PROMPT') return state;
      return { ...state, phase: 'ARMED' };
    }

    case 'PRECHECK_PASS': {
      // ARMED -> COUNT: precheck passed, start the 5 second countdown.
      if (state.phase !== 'ARMED') return state;
      return { ...state, phase: 'COUNT', count: 5 };
    }

    case 'COUNT_SET': {
      // Prompt 231: COUNT display tracks real elapsed seconds (useCountdown
      // onTick), not a decrement-per-event counter. Idempotent by
      // construction: setting the same display twice is a no-op change, so
      // over-firing ticks (weak-mode re-render pressure) cannot burn the
      // count down early. Clamped defensively; never drives the phase.
      if (state.phase !== 'COUNT') return state;
      const count = Math.min(5, Math.max(0, action.display));
      return { ...state, count };
    }

    case 'COUNT_DONE': {
      // Prompt 231: the only path from COUNT to CAPTURE. Fired once by
      // useCountdown's onComplete at the real 5 second mark (time-based),
      // matching how WALK_IN_DONE already drives WALK_IN -> PROMPT.
      if (state.phase !== 'COUNT') return state;
      return { ...state, phase: 'CAPTURE', count: 0 };
    }

    case 'PRECHECK_FAIL': {
      // COUNT -> ARMED: subject left frame mid-count, restart the arm/count cycle.
      if (state.phase !== 'COUNT') return state;
      return { ...state, phase: 'ARMED', count: 5, error: 'Hold still.' };
    }

    case 'CAPTURED': {
      // CAPTURE -> QA: store the frame provisionally at its pose slot for QA review.
      if (state.phase !== 'CAPTURE') return state;
      const frames = state.frames.slice();
      frames[state.poseIndex] = action.frame;
      return { ...state, phase: 'QA', frames };
    }

    case 'QA_PASS': {
      // QA -> REVIEW (final pose or mid-retake) or PROMPT (next pose): accept
      // the frame, clear any stale error, and advance.
      if (state.phase !== 'QA') return state;
      const next = advance(state);
      return { ...state, ...next, error: undefined };
    }

    case 'QA_FAIL': {
      // QA -> PROMPT (re-arm) or CHOICE (3rd failure): discard the failed
      // frame and increment retryCount. Error copy for the QaCode is left to
      // the UI, not fabricated here.
      if (state.phase !== 'QA') return state;
      const frames = state.frames.slice();
      frames[state.poseIndex] = null;
      const retryCount = state.retryCount + 1;
      if (retryCount >= 3) {
        return { ...state, phase: 'CHOICE', frames, retryCount };
      }
      return { ...state, phase: 'PROMPT', frames, retryCount };
    }

    case 'CHOOSE_RETRY': {
      // CHOICE -> PROMPT: subject opts to retry the pose, reset retryCount.
      if (state.phase !== 'CHOICE') return state;
      return { ...state, phase: 'PROMPT', retryCount: 0 };
    }

    case 'CHOOSE_SKIP': {
      // CHOICE -> REVIEW or PROMPT: subject opts to skip; mark the pose's
      // frame as skipped and advance the same way QA_PASS does.
      if (state.phase !== 'CHOICE') return state;
      const frames = state.frames.slice();
      frames[state.poseIndex] = skippedFrame(POSE_ORDER[state.poseIndex], state.retryCount);
      const next = advance(state);
      return { ...state, ...next, frames };
    }

    case 'RETAKE': {
      // REVIEW -> WALK_IN: rerun the walk-in for the chosen pose before
      // returning to REVIEW (retakeMode forces the advance helper to REVIEW).
      if (state.phase !== 'REVIEW') return state;
      return { ...state, phase: 'WALK_IN', poseIndex: action.poseIndex, retakeMode: true };
    }

    case 'SUBMIT': {
      // REVIEW -> UPLOADING: subject confirms and submits the scan.
      if (state.phase !== 'REVIEW') return state;
      return { ...state, phase: 'UPLOADING' };
    }

    case 'SUBMIT_OK': {
      // UPLOADING -> DONE: upload succeeded, store the returned scan id.
      if (state.phase !== 'UPLOADING') return state;
      return { ...state, phase: 'DONE', scanId: action.scanId };
    }

    case 'SUBMIT_FAIL': {
      // UPLOADING -> REVIEW: upload failed, return to review with the error.
      if (state.phase !== 'UPLOADING') return state;
      return { ...state, phase: 'REVIEW', error: action.error };
    }

    case 'DISCARD': {
      // REVIEW -> SETUP: subject discards the whole session. Object URL
      // revocation for any captured frames is a side effect owned by the
      // hook consumer, not this pure reducer.
      if (state.phase !== 'REVIEW') return state;
      return initialScanState();
    }

    case 'RESET': {
      // CAMERA_LOST -> SETUP: camera reconnected, restart the session and
      // surface the disconnect notice.
      if (state.phase !== 'CAMERA_LOST') return state;
      return { ...initialScanState(), error: CAMERA_LOST_MESSAGE };
    }

    default:
      return state;
  }
}

export function useScanSession(): { state: ScanState; dispatch: Dispatch<ScanAction> } {
  const [state, dispatch] = useReducer(scanReducer, undefined, initialScanState);
  return { state, dispatch };
}
