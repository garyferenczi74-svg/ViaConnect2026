/**
 * Turbopack-compatible stub for @mediapipe/selfie_segmentation.
 * Body-segmentation loads the TFJS runtime path at runtime; the package still
 * static-imports SelfieSegmentation which has no ESM exports under Turbopack.
 */
export class SelfieSegmentation {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setOptions(_options: unknown) {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onResults(_cb: unknown) {}
  async initialize() {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async send(_inputs: unknown) {}
  close() {}
  reset() {}
}

export default SelfieSegmentation;
