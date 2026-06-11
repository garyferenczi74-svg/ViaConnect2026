// Prompt 189 (2026-06-11): source as text contract tests for the shared
// CardMedia layer's additive instrumentation, same convention as the other hub
// tests (readFileSync + assert on the source). These lock that logKey is
// OPTIONAL and default preserving (the My Biology BentoCard passes none and
// must render exactly as before), the safeLog wiring, the onStalled dead
// stream guard, and the no dash rule.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const COMPONENT = path.resolve(__dirname, '..', 'CardMedia.tsx');
const BENTO = path.resolve(__dirname, '..', 'BentoCard.tsx');

describe('CardMedia source', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('takes logKey as an OPTIONAL prop', () => {
    expect(source).toContain('logKey?: string');
  });

  it('imports safeLog and emits the structured failure warn', () => {
    expect(source).toContain("import { safeLog } from '@/lib/utils/safe-log'");
    expect(source).toContain("safeLog.warn('hub.card-media', 'media failed'");
    expect(source).toContain('cardKey: logKey');
  });

  it('guards every logging path on logKey so an uninstrumented consumer logs nothing', () => {
    // The single helper is the only safeLog call site, and it returns before
    // emitting anything when no logKey was provided.
    expect(source).toContain('if (!logKey) return;');
    const warnCalls = source.match(/safeLog\.warn\(/g) ?? [];
    expect(warnCalls.length).toBe(1);
  });

  it('covers the four failure surfaces: image, video, poster, video-stalled', () => {
    expect(source).toContain("logMediaFailure(logKey, 'image', media.src)");
    expect(source).toContain("logMediaFailure(logKey, 'video', media.src)");
    expect(source).toContain("logMediaFailure(logKey, 'poster', media.poster)");
    expect(source).toContain("logMediaFailure(logKey, 'video-stalled', media.src)");
  });

  it('onStalled falls open only when no current frame data exists (readyState < 2)', () => {
    expect(source).toContain('onStalled=');
    expect(source).toContain('readyState < 2');
    // The dead stream branch reuses the existing error path state, so the
    // poster / gradient shows instead of a black rectangle.
    expect(source).toContain('setVideoErrored(true)');
  });

  it('preserves the existing defaults the My Biology hub depends on', () => {
    // objectPosition still defaults to top, the Dashboard hero framing.
    expect(source).toContain("media.objectPosition ?? 'top'");
    // The three fail open layers are untouched.
    expect(source).toContain("media.kind === 'gradient' || !media.src");
    expect(source).toContain('setPosterErrored(true)');
    expect(source).toContain('preload="metadata"');
  });

  it('the My Biology consumer stays uninstrumented (BentoCard passes no logKey)', () => {
    const bento = readFileSync(BENTO, 'utf-8');
    expect(bento).not.toContain('logKey');
    expect(bento).toContain('<CardMedia media={surface.media} />');
  });

  it('icon removal (Gary 2026-06-11): BentoCard renders no icon chip, keeping the metric chip and Open chevron', () => {
    // hubConfig SURFACES keep their icon fields; BentoCard simply no longer
    // reads surface.icon. The functional Open chevron stays.
    const bento = readFileSync(BENTO, 'utf-8');
    expect(bento).not.toContain('surface.icon');
    expect(bento).toContain('ChevronRight');
    expect(bento).toContain('{metricValue}');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
