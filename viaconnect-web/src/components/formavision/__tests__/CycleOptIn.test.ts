/**
 * Task 211b-W4b: TDD tests for the cycle opt-in content renderer.
 *
 * TDD contract (from the task brief):
 *   1. Default OFF: opt-out shows the toggle only, no details form, no writes.
 *   2. Opt-in shows the phase select + cycle length + last period fields.
 *   3. The Save button is disabled until the draft differs from the confirmed
 *      state (detailsDirty), so JourneyTimeline never receives a mid-edit draft.
 *   4. Privacy copy: mentions private, practitioner-share opt-out, and deletion.
 *   5. No em/en dashes anywhere (standing rule); 44px touch targets.
 *
 * Uses renderToStaticMarkup (no DOM, no @testing-library) against the exported
 * PURE content renderer, matching CadenceReminderOptInContent's test pattern.
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CycleOptInContent, type CycleOptInContentProps } from '../CycleOptIn';

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

function noop() {
  /* intentional no-op for a static render */
}

function baseProps(over: Partial<CycleOptInContentProps> = {}): CycleOptInContentProps {
  return {
    optedIn: false,
    saving: false,
    draftPhase: 'unknown',
    draftCycleLengthDays: '',
    draftLastPeriodStart: '',
    detailsDirty: false,
    onToggle: noop,
    onDraftPhaseChange: noop,
    onDraftCycleLengthChange: noop,
    onDraftLastPeriodChange: noop,
    onSaveDetails: noop,
    ...over,
  };
}

function render(props: CycleOptInContentProps): string {
  return renderToStaticMarkup(React.createElement(CycleOptInContent, props));
}

describe('CycleOptInContent: default OFF', () => {
  it('opt-out (default): shows the toggle, no details form', () => {
    const html = render(baseProps({ optedIn: false }));
    expect(html).toContain('cycle-optin-toggle');
    expect(html).toContain('aria-checked="false"');
    expect(html).not.toContain('cycle-optin-details');
    expect(html).not.toContain('cycle-phase-select');
  });

  it('opt-out: explains WHY (water retention framing) without fabricating a claim about the current user', () => {
    const html = render(baseProps({ optedIn: false }));
    expect(html).toContain('cycle-optin-why');
    expect(html.toLowerCase()).toContain('water retention');
  });

  it('opt-out: privacy copy mentions private, practitioner opt-out, and deletion', () => {
    const html = render(baseProps({ optedIn: false }));
    expect(html).toContain('cycle-optin-privacy');
    const lower = html.toLowerCase();
    expect(lower).toContain('private');
    expect(lower).toContain('practitioner');
    expect(lower).toContain('deletion');
  });

  it('toggle has a 44px minimum touch target', () => {
    const html = render(baseProps({ optedIn: false }));
    expect(html).toContain('min-h-[44px]');
  });
});

describe('CycleOptInContent: opted in', () => {
  it('shows the details form (phase select, cycle length, last period)', () => {
    const html = render(baseProps({ optedIn: true }));
    expect(html).toContain('cycle-optin-details');
    expect(html).toContain('cycle-phase-select');
    expect(html).toContain('cycle-length-input');
    expect(html).toContain('last-period-input');
  });

  it('toggle reflects the ON state (aria-checked=true, revocable copy)', () => {
    const html = render(baseProps({ optedIn: true }));
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('Cycle context on');
  });

  it('phase select includes all five phase options', () => {
    const html = render(baseProps({ optedIn: true }));
    for (const value of ['menstrual', 'follicular', 'ovulatory', 'luteal', 'unknown']) {
      expect(html).toContain(`value="${value}"`);
    }
  });

  // NOTE: the button's className includes the Tailwind variant
  // "disabled:opacity-60", so a bare `toContain('disabled')` check on the tag
  // would false-positive from the class name alone. React's static renderer
  // emits the real boolean HTML attribute as the literal `disabled=""`
  // (present only when the prop is true), so that exact substring is the
  // precise signal to assert on.
  it('Save button is disabled when the draft matches the confirmed state (detailsDirty: false)', () => {
    const html = render(baseProps({ optedIn: true, detailsDirty: false }));
    const saveButtonMatch = html.match(/<button[^>]*data-testid="cycle-optin-save"[^>]*>/);
    expect(saveButtonMatch).not.toBeNull();
    expect(saveButtonMatch![0]).toContain('disabled=""');
  });

  it('Save button is enabled when the draft differs from the confirmed state (detailsDirty: true)', () => {
    const html = render(baseProps({ optedIn: true, detailsDirty: true, saving: false }));
    const saveButtonMatch = html.match(/<button[^>]*data-testid="cycle-optin-save"[^>]*>/);
    expect(saveButtonMatch).not.toBeNull();
    expect(saveButtonMatch![0]).not.toContain('disabled=""');
  });

  it('Save button stays disabled while saving, even if dirty', () => {
    const html = render(baseProps({ optedIn: true, detailsDirty: true, saving: true }));
    const saveButtonMatch = html.match(/<button[^>]*data-testid="cycle-optin-save"[^>]*>/);
    expect(saveButtonMatch![0]).toContain('disabled=""');
  });

  it('draft field values are reflected in the rendered inputs', () => {
    const html = render(
      baseProps({
        optedIn: true,
        draftPhase: 'luteal',
        draftCycleLengthDays: '28',
        draftLastPeriodStart: '2026-07-01',
      }),
    );
    expect(html).toContain('value="luteal"');
    expect(html).toContain('value="28"');
    expect(html).toContain('value="2026-07-01"');
  });
});

describe('CycleOptInContent: no em/en dashes anywhere (standing rule)', () => {
  it('sweeps opt-out and opted-in states', () => {
    const surfaces = [
      render(baseProps({ optedIn: false })),
      render(baseProps({ optedIn: true })),
      render(baseProps({ optedIn: true, detailsDirty: true })),
    ];
    for (const html of surfaces) {
      expect(html.includes(EM_DASH)).toBe(false);
      expect(html.includes(EN_DASH)).toBe(false);
    }
  });
});
