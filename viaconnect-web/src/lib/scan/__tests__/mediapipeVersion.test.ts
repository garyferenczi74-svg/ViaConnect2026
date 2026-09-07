import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  MEDIAPIPE_ASSET_VERSION,
  MEDIAPIPE_MODEL_ASSET_PATH,
  MEDIAPIPE_WASM_BASE_PATH,
} from '@/lib/scan/mediapipeVersion';
import { detectWasmSimd } from '@/hooks/scan/usePoseLandmarker';

interface PackageJsonShape {
  dependencies?: Record<string, string>;
}

const repoRoot = join(__dirname, '..', '..', '..', '..');
const versionFilePath = join(
  repoRoot,
  'public',
  'mediapipe',
  MEDIAPIPE_ASSET_VERSION,
  'VERSION',
);
const modelFilePath = join(
  repoRoot,
  'public',
  'mediapipe',
  MEDIAPIPE_ASSET_VERSION,
  'pose_landmarker_lite.task',
);
const packageJsonPath = join(repoRoot, 'package.json');

function readPinnedDependencyVersion(): string {
  const raw = readFileSync(packageJsonPath, 'utf8');
  const parsed = JSON.parse(raw) as PackageJsonShape;
  const version = parsed.dependencies?.['@mediapipe/tasks-vision'];
  if (!version) {
    throw new Error('@mediapipe/tasks-vision is not listed in package.json dependencies');
  }
  return version;
}

describe('mediapipe VERSION contract', () => {
  it('MEDIAPIPE_ASSET_VERSION, the VERSION file, and the pinned package.json version all match', () => {
    const versionFileContents = readFileSync(versionFilePath, 'utf8').trim();
    const pinnedDependencyVersion = readPinnedDependencyVersion();
    expect(versionFileContents).toBe(MEDIAPIPE_ASSET_VERSION);
    expect(pinnedDependencyVersion).toBe(MEDIAPIPE_ASSET_VERSION);
  });

  it('is an exact version with no caret or tilde range operator', () => {
    expect(MEDIAPIPE_ASSET_VERSION.startsWith('^')).toBe(false);
    expect(MEDIAPIPE_ASSET_VERSION.startsWith('~')).toBe(false);
    expect(MEDIAPIPE_ASSET_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('the pinned package.json dependency itself has no caret or tilde range operator', () => {
    const pinnedDependencyVersion = readPinnedDependencyVersion();
    expect(pinnedDependencyVersion.startsWith('^')).toBe(false);
    expect(pinnedDependencyVersion.startsWith('~')).toBe(false);
  });

  it('the versioned model file exists at the versioned asset path', () => {
    expect(existsSync(modelFilePath)).toBe(true);
  });

  it('exported WASM and model paths stay under /mediapipe/<version>/ with no CDN', () => {
    expect(MEDIAPIPE_WASM_BASE_PATH).toBe(`/mediapipe/${MEDIAPIPE_ASSET_VERSION}/wasm`);
    expect(MEDIAPIPE_MODEL_ASSET_PATH).toBe(
      `/mediapipe/${MEDIAPIPE_ASSET_VERSION}/pose_landmarker_lite.task`,
    );
    expect(MEDIAPIPE_WASM_BASE_PATH).not.toMatch(/https?:\/\//i);
    expect(MEDIAPIPE_MODEL_ASSET_PATH).not.toMatch(/https?:\/\//i);
    expect(`${MEDIAPIPE_WASM_BASE_PATH}${MEDIAPIPE_MODEL_ASSET_PATH}`.toLowerCase()).not.toContain('cdn');
  });
});

describe('detectWasmSimd', () => {
  // Prompt 231: Node/Vitest supports WASM SIMD, so assert true directly -
  // a malformed SIMD probe module must FAIL this test, not silently log
  // simdSupported:false and pass anyway.
  it('returns true under Node/Vitest and does not throw', () => {
    expect(() => detectWasmSimd()).not.toThrow();
    expect(detectWasmSimd()).toBe(true);
  });
});
