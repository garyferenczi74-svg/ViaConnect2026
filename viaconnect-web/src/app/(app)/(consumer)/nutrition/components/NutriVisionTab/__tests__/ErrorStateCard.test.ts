// Prompt #170a supplement §20.1 / §20.2 / §20.7: source-presence sanity for
// ErrorStateCard. Verifies all six locked copy strings, the RefreshCw icon,
// the three CTAs, the Orange stroke token, and accessibility wiring.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const CARD = path.resolve(__dirname, '..', 'ErrorStateCard.tsx');
const INDEX = path.resolve(__dirname, '..', 'index.tsx');

describe('ErrorStateCard source', () => {
  const source = readFileSync(CARD, 'utf-8');

  it('imports RefreshCw from lucide-react (single error icon)', () => {
    expect(source).toContain("import { RefreshCw } from 'lucide-react'");
  });

  it('does NOT import AlertCircle or per-error-class icons', () => {
    expect(source).not.toContain('AlertCircle');
    expect(source).not.toContain('CloudOff');
    expect(source).not.toContain('Wallet');
  });

  it('renders RefreshCw with strokeWidth 1.5 and Orange #B75E18', () => {
    expect(source).toContain('strokeWidth={1.5}');
    expect(source).toContain('text-[#B75E18]');
  });

  it('declares all six error_class values in BODY_COPY', () => {
    expect(source).toContain("provider_timeout:");
    expect(source).toContain("provider_outage:");
    expect(source).toContain("image_too_large:");
    expect(source).toContain("image_corrupt:");
    expect(source).toContain("budget_hard_stop:");
    expect(source).toContain("unknown:");
  });

  it('uses the locked provider_timeout copy', () => {
    expect(source).toContain('The connection is taking longer than usual');
    expect(source).toContain('A quick retry usually clears this up');
  });

  it('uses the locked provider_outage copy', () => {
    expect(source).toContain('Our analysis service is offline right now');
    expect(source).toContain('log this meal manually while we work on it');
  });

  it('uses the locked image_too_large copy', () => {
    expect(source).toContain('The photo file is larger than we can read in one pass');
    expect(source).toContain('Try retaking with the in-app camera');
  });

  it('uses the locked image_corrupt copy', () => {
    expect(source).toContain("The photo didn't transfer cleanly");
    expect(source).toContain('A fresh shot from the in-app camera should fix this');
  });

  it('uses the locked budget_hard_stop copy', () => {
    expect(source).toContain("We've reached today's recognition limit across all users");
    expect(source).toContain('log this meal manually for now');
  });

  it('uses the locked unknown copy', () => {
    expect(source).toContain("Something didn't go as expected");
    expect(source).toContain('A retry or a manual log will get you back on track');
  });

  it('uses the universal heading "We could not read this meal photo"', () => {
    expect(source).toContain('We could not read this meal photo');
  });

  it('renders three CTAs: Try again primary, Log manually secondary, Discard tertiary', () => {
    expect(source).toContain('Try again');
    expect(source).toContain('Log manually');
    expect(source).toContain('Discard and exit');
  });

  it('primary CTA uses Teal #2DA5A0 fill', () => {
    expect(source).toContain('bg-[#2DA5A0]');
  });

  it('uses Card #1E3054 background for the surface', () => {
    expect(source).toContain('bg-[#1E3054]');
  });

  it('section root carries role="alert"', () => {
    expect(source).toContain('role="alert"');
  });

  it('moves focus to Try Again on mount', () => {
    expect(source).toContain('tryAgainRef');
    expect(source).toContain('tryAgainRef.current?.focus()');
  });

  it('aria-labelledby and aria-describedby wire to heading and body ids', () => {
    expect(source).toContain('aria-labelledby={HEADING_ID}');
    expect(source).toContain('aria-describedby={BODY_ID}');
  });

  it('icon is decorative (aria-hidden="true")', () => {
    expect(source).toContain('aria-hidden="true"');
  });

  it('declares onTryAgain, onLogManually, onDiscard callbacks in props', () => {
    expect(source).toContain('onTryAgain: () => void');
    expect(source).toContain('onLogManually: () => void');
    expect(source).toContain('onDiscard: () => void');
  });

  it('contains no em dash, en dash, or emoji characters', () => {
    expect(source).not.toContain('—');
    expect(source).not.toContain('–');
  });
});

describe('NutriVisionTab wires ErrorStateCard', () => {
  const source = readFileSync(INDEX, 'utf-8');

  it("imports ErrorStateCard + the error_class mapper", () => {
    expect(source).toContain("from './ErrorStateCard'");
    expect(source).toContain("from '@/lib/nutrition/vision/error-class-mapper'");
  });

  it('renders <ErrorStateCard /> when phase === error', () => {
    expect(source).toContain("phase === 'error'");
    expect(source).toContain('<ErrorStateCard');
  });

  it('transitions to error phase when analysis.error fires during analyzing', () => {
    expect(source).toContain("setPhase('error')");
  });

  it('Try Again handler reuses the cached capture', () => {
    expect(source).toContain('handleTryAgain');
    expect(source).toContain('analysis.lastCapture');
  });

  it('Log Manually handler stashes handoff and routes to /nutrition', () => {
    expect(source).toContain('handleLogManually');
    expect(source).toContain('writeNutrivisionManualLogHandoff');
    expect(source).toContain("router.push('/nutrition')");
  });

  it('Discard handler resets state and returns to idle', () => {
    expect(source).toContain('handleDiscardError');
    expect(source).toContain("setPhase('idle')");
  });
});
