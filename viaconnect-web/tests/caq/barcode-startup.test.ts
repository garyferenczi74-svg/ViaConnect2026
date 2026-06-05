// Prompt 175e (2026-06-05): barcode scanner startup error classifier.
//
// The full getUserMedia retry path runs against html5-qrcode + a live
// camera and cannot be exercised in vitest. The pure helper that
// decides whether a startup failure is worth retrying with minimal
// constraints (Section 2.2 environment-to-any fallback) IS pure and
// is pinned here so a regression on the classifier does not silently
// strand the user.

import { describe, it, expect } from 'vitest';
import { isOverconstrainedError } from '@/components/barcode/hooks/useBarcodeScan';

describe('isOverconstrainedError', () => {
  it('matches a DOMException with name OverconstrainedError', () => {
    const err = new Error('whatever');
    err.name = 'OverconstrainedError';
    expect(isOverconstrainedError(err)).toBe(true);
  });

  it('matches an html5-qrcode string wrapper that mentions overconstrained', () => {
    expect(isOverconstrainedError('OverconstrainedError: width')).toBe(true);
    expect(isOverconstrainedError(new Error('overconstrained on facingMode'))).toBe(true);
  });

  it('matches an iOS-style "could not satisfy constraint" message', () => {
    expect(isOverconstrainedError(new Error('Constraint not satisfied'))).toBe(true);
  });

  it('does NOT match a NotAllowedError (permission denied bubbles up)', () => {
    const err = new Error('Permission denied');
    err.name = 'NotAllowedError';
    expect(isOverconstrainedError(err)).toBe(false);
  });

  it('does NOT match a NotFoundError (no camera bubbles up)', () => {
    const err = new Error('Requested device not found');
    err.name = 'NotFoundError';
    expect(isOverconstrainedError(err)).toBe(false);
  });

  it('does NOT match a NotReadableError (camera in use bubbles up)', () => {
    const err = new Error('Could not start video source');
    err.name = 'NotReadableError';
    expect(isOverconstrainedError(err)).toBe(false);
  });

  it('does NOT match a generic unknown error', () => {
    expect(isOverconstrainedError(new Error('something else'))).toBe(false);
    expect(isOverconstrainedError('plain string with no signal')).toBe(false);
    expect(isOverconstrainedError(null)).toBe(false);
    expect(isOverconstrainedError(undefined)).toBe(false);
  });
});
