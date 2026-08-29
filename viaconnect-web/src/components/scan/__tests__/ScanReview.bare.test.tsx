/**
 * Render smoke test for ScanReview using react-dom/server renderToStaticMarkup
 * (node-safe, no jsdom), matching the other scan/__tests__/*.bare.test.tsx
 * convention. Focused on the one thing the reducer-driver test in
 * ScanExperience.flow.test.ts cannot see: that a skipped frame's empty
 * objectUrl never reaches an <img src>.
 */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ScanReview } from '../ScanReview';
import type { ScanFrame } from '@/lib/scan/types';

function passedFrame(pose: ScanFrame['pose'], objectUrl: string): ScanFrame {
  return {
    pose,
    blob: new Blob(['x'], { type: 'image/jpeg' }),
    objectUrl,
    capturedAt: new Date('2026-08-29T00:00:00Z').toISOString(),
    qa: { pass: true, code: 'PASS', message: '', mode: 'weak' },
    retryCount: 0,
    capturedWidth: 1080,
    capturedHeight: 1920,
  };
}

function skippedFrame(pose: ScanFrame['pose']): ScanFrame {
  return {
    pose,
    blob: new Blob([], { type: 'image/jpeg' }),
    objectUrl: '',
    capturedAt: new Date('2026-08-29T00:00:00Z').toISOString(),
    qa: { pass: false, code: 'NO_BODY', message: 'Skipped by user', mode: 'weak' },
    skipped: true,
    retryCount: 3,
    capturedWidth: 0,
    capturedHeight: 0,
  };
}

const NOOP = () => {};

describe('ScanReview - skipped tile never renders the empty objectUrl', () => {
  const frames = [
    passedFrame('front', 'blob:front-real'),
    skippedFrame('right'),
    passedFrame('back', 'blob:back-real'),
    passedFrame('left', 'blob:left-real'),
  ];

  const html = renderToStaticMarkup(
    React.createElement(ScanReview, {
      frames,
      voiceEnabled: true,
      voiceAvailable: true,
      onToggleVoice: NOOP,
      onRetake: NOOP,
      onDiscard: NOOP,
      onSubmit: NOOP,
      submitDisabled: true,
      submitDisabledReason: 'Saving is not available yet.',
    }),
  );

  it('renders a Skipped tile for the skipped pose', () => {
    expect(html).toContain('scan-review-tile-right-skipped');
    expect(html).toContain('Skipped');
  });

  it('never renders an img with an empty src for the skipped pose', () => {
    expect(html).not.toMatch(/src=""/);
  });

  it('renders real img tiles for the passed poses with their object URLs', () => {
    expect(html).toContain('src="blob:front-real"');
    expect(html).toContain('src="blob:back-real"');
    expect(html).toContain('src="blob:left-real"');
  });

  it('shows the submit disabled note when submit is disabled', () => {
    expect(html).toContain('scan-review-submit-note');
    expect(html).toContain('Saving is not available yet.');
  });

  it('the submit button carries the disabled attribute', () => {
    expect(html).toMatch(/data-testid="scan-review-submit"[^>]*disabled=""/);
  });
});

describe('ScanReview - missing frame (defensive, should not occur at REVIEW)', () => {
  it('renders a Missing placeholder rather than crashing on a null frame', () => {
    const frames = [null, passedFrame('right', 'blob:right'), passedFrame('back', 'blob:back'), passedFrame('left', 'blob:left')];
    const html = renderToStaticMarkup(
      React.createElement(ScanReview, {
        frames,
        voiceEnabled: false,
        voiceAvailable: false,
        onToggleVoice: NOOP,
        onRetake: NOOP,
        onDiscard: NOOP,
        onSubmit: NOOP,
        submitDisabled: true,
      }),
    );
    expect(html).toContain('scan-review-tile-front-missing');
  });

  it('hides the voice toggle entirely when voice is unavailable', () => {
    const frames = [
      passedFrame('front', 'blob:front'),
      passedFrame('right', 'blob:right'),
      passedFrame('back', 'blob:back'),
      passedFrame('left', 'blob:left'),
    ];
    const html = renderToStaticMarkup(
      React.createElement(ScanReview, {
        frames,
        voiceEnabled: false,
        voiceAvailable: false,
        onToggleVoice: NOOP,
        onRetake: NOOP,
        onDiscard: NOOP,
        onSubmit: NOOP,
        submitDisabled: true,
      }),
    );
    expect(html).not.toContain('scan-review-voice-toggle');
  });
});
