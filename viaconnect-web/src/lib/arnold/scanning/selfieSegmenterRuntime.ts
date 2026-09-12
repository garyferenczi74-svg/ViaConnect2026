'use client';

// Client chunk for Ready Wireframe + in-browser scan silhouette.
// Must stay inside the bundler graph so www actually ships
// @tensorflow/tfjs + body-segmentation. MediaPipe ESM is shimmed
// in next.config.mjs.

import * as tf from '@tensorflow/tfjs';
import * as bodySeg from '@tensorflow-models/body-segmentation';

export async function createSelfieSegmenter(): Promise<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tf: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bodySeg: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  segmenter: any;
}> {
  await import('@tensorflow/tfjs-backend-webgl').catch(() => undefined);
  await tf.ready();
  const segmenter = await bodySeg.createSegmenter(
    bodySeg.SupportedModels.MediaPipeSelfieSegmentation,
    { runtime: 'tfjs', modelType: 'general' } as never,
  );
  return { tf, bodySeg, segmenter };
}
