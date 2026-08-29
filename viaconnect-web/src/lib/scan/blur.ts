import { BLUR_VARIANCE_MIN } from './qaThresholds';

export function varianceOfLaplacian(gray: Float32Array, width: number, height: number): number {
  const responses: number[] = [];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const center = gray[idx];
      const up = gray[(y - 1) * width + x];
      const down = gray[(y + 1) * width + x];
      const left = gray[y * width + (x - 1)];
      const right = gray[y * width + (x + 1)];

      const response = 4 * center - up - down - left - right;
      responses.push(response);
    }
  }

  if (responses.length === 0) return 0;

  const mean = responses.reduce((a, b) => a + b, 0) / responses.length;
  const variance = responses.reduce((a, r) => a + (r - mean) ** 2, 0) / responses.length;

  return variance;
}

export function isBlurred(score: number, threshold: number = BLUR_VARIANCE_MIN): boolean {
  return score < threshold;
}
