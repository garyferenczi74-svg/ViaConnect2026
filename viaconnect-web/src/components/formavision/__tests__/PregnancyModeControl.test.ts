/**
 * Task 211b-W4b: TDD tests for the pregnancy-mode indication control.
 *
 * TDD contract:
 *   1. Default OFF ('none'): no active-note copy, first radio option selected.
 *   2. Choosing 'pregnant' or 'lactating' shows the active supportive note.
 *   3. All three options render as accessible radios with 44px touch targets.
 *   4. No em/en dashes anywhere (standing rule).
 *   5. An error message, when present, renders alongside the control.
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  PregnancyModeControl,
  PregnancyModeControlContent,
} from '../PregnancyModeControl';

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

function noop() {
  /* intentional no-op for a static render */
}

describe('PregnancyModeControlContent: default OFF', () => {
  it('"none" indication: no active-suppression note, "Not applicable" is checked', () => {
    const html = renderToStaticMarkup(
      React.createElement(PregnancyModeControlContent, {
        indication: 'none',
        saving: false,
        onChange: noop,
      }),
    );
    expect(html).not.toContain('pregnancy-mode-active-note');
    expect(html).toContain('pregnancy-mode-option-none');
    // The "none" option is the checked radio.
    const noneMatch = html.match(/<button[^>]*data-testid="pregnancy-mode-option-none"[^>]*>/)?.[0] ?? '';
    expect(noneMatch).toContain('aria-checked="true"');
  });

  it('renders all three options as accessible radios', () => {
    const html = renderToStaticMarkup(
      React.createElement(PregnancyModeControlContent, {
        indication: 'none',
        saving: false,
        onChange: noop,
      }),
    );
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('pregnancy-mode-option-none');
    expect(html).toContain('pregnancy-mode-option-pregnant');
    expect(html).toContain('pregnancy-mode-option-lactating');
  });

  it('44px minimum touch target on every option', () => {
    const html = renderToStaticMarkup(
      React.createElement(PregnancyModeControlContent, {
        indication: 'none',
        saving: false,
        onChange: noop,
      }),
    );
    expect(html).toContain('min-h-[44px]');
  });
});

describe('PregnancyModeControlContent: active indication', () => {
  it('"pregnant": shows the active supportive note, pregnant option checked', () => {
    const html = renderToStaticMarkup(
      React.createElement(PregnancyModeControlContent, {
        indication: 'pregnant',
        saving: false,
        onChange: noop,
      }),
    );
    expect(html).toContain('pregnancy-mode-active-note');
    const match = html.match(/<button[^>]*data-testid="pregnancy-mode-option-pregnant"[^>]*>/)?.[0] ?? '';
    expect(match).toContain('aria-checked="true"');
  });

  it('"lactating": shows the active supportive note, lactating option checked', () => {
    const html = renderToStaticMarkup(
      React.createElement(PregnancyModeControlContent, {
        indication: 'lactating',
        saving: false,
        onChange: noop,
      }),
    );
    expect(html).toContain('pregnancy-mode-active-note');
    const match = html.match(/<button[^>]*data-testid="pregnancy-mode-option-lactating"[^>]*>/)?.[0] ?? '';
    expect(match).toContain('aria-checked="true"');
  });

  it('active-note copy mentions girth measurements staying available', () => {
    const html = renderToStaticMarkup(
      React.createElement(PregnancyModeControlContent, {
        indication: 'pregnant',
        saving: false,
        onChange: noop,
      }),
    );
    expect(html.toLowerCase()).toContain('girth measurements stay available');
  });
});

describe('PregnancyModeControl (wrapper): error line', () => {
  it('renders the error message when present', () => {
    const html = renderToStaticMarkup(
      React.createElement(PregnancyModeControl, {
        indication: 'none',
        saving: false,
        onChange: noop,
        error: 'Could not save that just now. Please try again.',
      }),
    );
    expect(html).toContain('pregnancy-mode-error');
    expect(html).toContain('Could not save that just now');
  });

  it('omits the error line when absent', () => {
    const html = renderToStaticMarkup(
      React.createElement(PregnancyModeControl, {
        indication: 'none',
        saving: false,
        onChange: noop,
        error: null,
      }),
    );
    expect(html).not.toContain('pregnancy-mode-error');
  });
});

describe('PregnancyModeControlContent: no em/en dashes anywhere (standing rule)', () => {
  it('sweeps every indication state', () => {
    const surfaces = (['none', 'pregnant', 'lactating'] as const).map((indication) =>
      renderToStaticMarkup(
        React.createElement(PregnancyModeControlContent, { indication, saving: false, onChange: noop }),
      ),
    );
    for (const html of surfaces) {
      expect(html.includes(EM_DASH)).toBe(false);
      expect(html.includes(EN_DASH)).toBe(false);
    }
  });
});
