import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface PackageJsonShape {
  dependencies?: Record<string, string>;
}

const repoRoot = join(__dirname, '..', '..', '..', '..');
const versionFilePath = join(repoRoot, 'public', 'mediapipe', 'VERSION');
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
  it('matches the pinned @mediapipe/tasks-vision version in package.json', () => {
    const versionFileContents = readFileSync(versionFilePath, 'utf8').trim();
    const pinnedDependencyVersion = readPinnedDependencyVersion();
    expect(versionFileContents).toBe(pinnedDependencyVersion);
  });

  it('is an exact version with no caret or tilde range operator', () => {
    const versionFileContents = readFileSync(versionFilePath, 'utf8').trim();
    expect(versionFileContents.startsWith('^')).toBe(false);
    expect(versionFileContents.startsWith('~')).toBe(false);
    expect(versionFileContents).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('the pinned package.json dependency itself has no caret or tilde range operator', () => {
    const pinnedDependencyVersion = readPinnedDependencyVersion();
    expect(pinnedDependencyVersion.startsWith('^')).toBe(false);
    expect(pinnedDependencyVersion.startsWith('~')).toBe(false);
  });
});
