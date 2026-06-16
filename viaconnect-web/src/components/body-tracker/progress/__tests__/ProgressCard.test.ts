// Prompt 201 (2026-06-15): source-as-text contract test for the Progress bento
// card shell. Locks that it composes the SHARED primitives (CardMedia seam, the
// 183f hub-card-frame edge), resolves attribution through getDisplayName, carries
// the orange accent variant, drops the frame on the muted Safety variant, and
// uses no em or en dashes.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname, '..', 'ProgressCard.tsx');
const source = readFileSync(SRC, 'utf-8');

describe('ProgressCard shell', () => {
  it('is a client component', () => {
    expect(source.startsWith("'use client';")).toBe(true);
  });

  it('composes the shared CardMedia seam, not a fork', () => {
    expect(source).toContain("import { CardMedia } from '@/components/body-tracker/hub/CardMedia'");
    expect(source).toContain('<CardMedia media={media} logKey={mediaLogKey} />');
    expect(source).toContain("<CardMedia media={{ kind: 'gradient', gradientClass: fallbackGradient }} />");
  });

  it('reuses the 183f tapered luminous edge via hub-card-frame', () => {
    expect(source).toContain("import '@/components/body-tracker/hub/hub-card-frame.css'");
    expect(source).toContain('hub-card-frame');
    expect(source).toContain('hub-card-frame--orange');
  });

  it('reuses the hub legibility scrim recipe', () => {
    expect(source).toContain('from-[#1A2744]/85 via-[#1A2744]/30 to-transparent');
  });

  it('resolves attribution through getDisplayName, never a hardcoded name', () => {
    expect(source).toContain("import { getDisplayName } from '@/lib/getDisplayName'");
    expect(source).toContain('getDisplayName(attributionSlug)');
    expect(source).not.toContain("'Arnold'");
    expect(source).not.toContain("'Gordon'");
  });

  it('the muted Safety variant drops the luminous edge frame', () => {
    // The muted branch returns a plain bordered card with no hub-card-frame.
    expect(source).toContain('if (muted)');
  });

  it('uses Lucide strokeWidth 1.5 and only the four tokens (plus established frame rgba)', () => {
    expect(source).toContain('strokeWidth={1.5}');
    expect(source).toContain('text-[#2DA5A0]');
    expect(source).toContain('text-[#B75E18]');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
