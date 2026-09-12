'use client';

// Client chunk for Ready Wireframe + in-browser scan silhouette.
// Must stay inside the bundler graph so www actually ships
// @tensorflow/tfjs + body-segmentation. MediaPipe ESM is shimmed
// in next.config.mjs.
//
// @tensorflow/tfjs-backend-webgl is a transitive of @tensorflow/tfjs
// (not a direct package.json dep — do not add one). Static import so
// the www client chunk exists; CPU remains if WebGL cannot start.

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import * as bodySeg from '@tensorflow-models/body-segmentation';
import { safeLog } from '@/lib/utils/safe-log';

const LOG_SCOPE = 'arnold.scanning.selfieSegmenterRuntime';

export async function createSelfieSegmenter(): Promise<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tf: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bodySeg: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  segmenter: any;
}> {
  try {
    await tf.setBackend('webgl');
  } catch (error) {
    safeLog.warn(LOG_SCOPE, 'WebGL backend unavailable — continuing with default', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  await tf.ready();
  const segmenter = await bodySeg.createSegmenter(
    bodySeg.SupportedModels.MediaPipeSelfieSegmentation,
    { runtime: 'tfjs', modelType: 'general' } as never,
  );
  return { tf, bodySeg, segmenter };
}
