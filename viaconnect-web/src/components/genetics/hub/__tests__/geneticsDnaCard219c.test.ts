/**
 * Prompt 219c: Upload Your DNA Test card shows full Mouth Swab subject.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

describe('Prompt 219c genetics DNA card media framing', () => {
  it('uploadDna uses a card-aspect transform crop so cover no longer over-zooms', () => {
    const media = readFileSync(
      join(root, 'src/components/genetics/hub/geneticsHubMedia.ts'),
      'utf8',
    );
    // Same original object; render/image with width+height+resize=cover
    expect(media).toMatch(/Mouth%20Swab%201\.png/);
    expect(media).toMatch(/width=900/);
    expect(media).toMatch(/height=600/);
    expect(media).toMatch(/resize=cover/);
    expect(media).toMatch(
      /uploadDna:\s*\{\s*kind:\s*["']image["']/,
    );
    // Framed like sibling video cards (full-bleed cover + center)
    expect(media).toMatch(
      /uploadDna:\s*\{[\s\S]*?objectFit:\s*["']cover["']/,
    );
  });

  it('CardMedia ImageMedia honors objectFit and objectPosition', () => {
    const src = readFileSync(
      join(root, 'src/components/body-tracker/hub/CardMedia.tsx'),
      'utf8',
    );
    expect(src).toMatch(/objectFit/);
    expect(src).toMatch(/objectPosition/);
    // No hard-coded object-cover only on the image path
    expect(src).not.toMatch(
      /className="absolute inset-0 z-0 h-full w-full rounded-\[inherit\] object-cover"/,
    );
  });

  it('SurfaceMedia type includes objectFit', () => {
    const cfg = readFileSync(
      join(root, 'src/components/body-tracker/hub/hubConfig.ts'),
      'utf8',
    );
    expect(cfg).toMatch(/objectFit\?:\s*'cover'\s*\|\s*'contain'/);
  });

  it('sibling action cards keep explicit cover + center framing', () => {
    const media = readFileSync(
      join(root, 'src/components/genetics/hub/geneticsHubMedia.ts'),
      'utf8',
    );
    expect(media).toMatch(/uploadLab:[\s\S]*?objectFit:\s*["']cover["']/);
    expect(media).toMatch(/snpFormulations:[\s\S]*?objectFit:\s*["']cover["']/);
    expect(media).toMatch(/orderPanels:[\s\S]*?objectFit:\s*["']cover["']/);
  });
});
