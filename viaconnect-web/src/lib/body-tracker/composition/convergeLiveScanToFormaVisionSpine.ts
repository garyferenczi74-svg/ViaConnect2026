// Live 4-pose post-submit MUST land on the same analyzer as upload.
// ScanExperience calls this helper after session persist ok — it does not
// call runFormaVisionAnalyzeSpine inline (that path is too easy to drop).
// Prompt 231: SUBMIT_OK stays on session persist ok:true. Vision/persistScan
// is a second step and never delays or replaces SUBMIT_OK.

import {
  liveFramesToFormaVisionPhotos,
  runFormaVisionAnalyzeSpine,
  type FormaVisionAnalyzeSpine,
  type PersistScanFn,
} from './runFormaVisionAnalyze';
import type { PersistScanResult } from '@/lib/scan/persist';
import type { ScanFrame } from '@/lib/scan/types';

export type LiveScanSubmitResult = Pick<PersistScanResult, 'ok' | 'sessionId' | 'error'>;

export type LiveScanFrame = Pick<ScanFrame, 'pose' | 'blob'> & { skipped?: boolean };

export type LiveScanConvergeResult = {
  submitOk: boolean;
  sessionId: string | null;
  composition: FormaVisionAnalyzeSpine | null;
  error: string | null;
};

export type ConvergeLiveScanDeps = {
  framesToPhotos?: typeof liveFramesToFormaVisionPhotos;
  analyzeSpine?: typeof runFormaVisionAnalyzeSpine;
};

export async function analyzeLiveFramesOnFormaVisionSpine(args: {
  frames: ReadonlyArray<LiveScanFrame | null>;
  persistScanFn: PersistScanFn;
  heightCm?: number | null;
  analyzeTimeoutMs?: number;
  photoSessionId?: string | null;
  deps?: ConvergeLiveScanDeps;
}): Promise<FormaVisionAnalyzeSpine> {
  const framesToPhotos = args.deps?.framesToPhotos ?? liveFramesToFormaVisionPhotos;
  const analyzeSpine = args.deps?.analyzeSpine ?? runFormaVisionAnalyzeSpine;
  const photos = await framesToPhotos(args.frames);
  return analyzeSpine({
    photos,
    source: 'live',
    persistScanFn: args.persistScanFn,
    heightCm: args.heightCm,
    analyzeTimeoutMs: args.analyzeTimeoutMs,
    alreadyNormalized: false,
    photoSessionId: args.photoSessionId,
  });
}

export async function convergeLiveScanToFormaVisionSpine(args: {
  submitResult: LiveScanSubmitResult;
  frames: ReadonlyArray<LiveScanFrame | null>;
  persistScanFn: PersistScanFn;
  heightCm?: number | null;
  analyzeTimeoutMs?: number;
  deps?: ConvergeLiveScanDeps;
}): Promise<LiveScanConvergeResult> {
  if (!args.submitResult.ok) {
    return {
      submitOk: false,
      sessionId: args.submitResult.sessionId ?? null,
      composition: null,
      error: args.submitResult.error ?? 'Session persist failed',
    };
  }

  const sessionId = args.submitResult.sessionId ?? null;
  const composition = await analyzeLiveFramesOnFormaVisionSpine({
    frames: args.frames,
    persistScanFn: args.persistScanFn,
    heightCm: args.heightCm,
    analyzeTimeoutMs: args.analyzeTimeoutMs,
    photoSessionId: sessionId,
    deps: args.deps,
  });

  return {
    submitOk: true,
    sessionId,
    composition,
    error: composition.ok ? null : (composition.error ?? 'Composition analysis failed'),
  };
}
