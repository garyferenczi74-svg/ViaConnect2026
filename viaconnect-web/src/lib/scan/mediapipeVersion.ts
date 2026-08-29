/**
 * Prompt 231: single source of truth for the versioned self-hosted
 * MediaPipe asset path (see public/mediapipe/<version>/ and
 * src/hooks/scan/usePoseLandmarker.ts). A model or package version bump
 * lands its assets at a NEW /mediapipe/<version>/ path, so it never
 * collides with a browser's long-cached copy of the old one; bump this
 * constant, VERSION file, and package.json pin together.
 */
export const MEDIAPIPE_ASSET_VERSION = '1.0.1';
