// Prompt 211a W4-2 - Node-safe render tests for the cadence UI surfaces.
//
// These use react-dom/server renderToStaticMarkup (no DOM, no
// @testing-library), matching the repo's other *.bare.test.tsx files, and test
// the exported pure Content renderers (which take plain props, no hooks). They
// cover: streak display formatting into markup, the fingerprint flag show/hide,
// the consistency tip show/hide, the opt-in content states, and a dash sweep
// across every rendered surface.
//
// Registered by exact name in vitest.config.ts (the .tsx glob is name-gated
// because @testing-library/dom is not installed and package.json is locked).

import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { ScanStreakDisplayContent } from '../ScanStreakDisplay';
import { FingerprintFlag } from '../FingerprintFlag';
import { ConsistencyTip } from '../ConsistencyTip';
import { CadenceReminderOptInContent } from '../CadenceReminderOptIn';
import { formatStreakDisplay } from '@/lib/formavision/cadence/streakDisplay';
import type { FingerprintFlagDecision } from '@/lib/formavision/cadence/fingerprintFlag';

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

function noop() {
  /* intentional no-op for onToggle in a static render */
}

describe('ScanStreakDisplayContent', () => {
  it('renders nothing for a null display (no fabricated "0 day streak")', () => {
    const html = renderToStaticMarkup(
      React.createElement(ScanStreakDisplayContent, { display: null }),
    );
    expect(html).toBe('');
  });

  it('renders the formatted label and milestone for a real streak', () => {
    const display = formatStreakDisplay(4, 4); // fortnight milestone
    const html = renderToStaticMarkup(
      React.createElement(ScanStreakDisplayContent, { display }),
    );
    expect(html).toContain('scan-streak-display');
    expect(html).toContain('4 scan streak');
    expect(html).toContain('Four in a row');
  });

  it('renders the singular label for a single scan', () => {
    const display = formatStreakDisplay(1, 1);
    const html = renderToStaticMarkup(
      React.createElement(ScanStreakDisplayContent, { display }),
    );
    expect(html).toContain('1 scan');
    expect(html).toContain('First scan logged');
  });
});

describe('FingerprintFlag', () => {
  const flagged: FingerprintFlagDecision = {
    showFlag: true,
    reason: 'This scan was taken in different conditions than usual, so I want to flag it.',
    consistencyScore: 0.3,
  };
  const notFlagged: FingerprintFlagDecision = {
    showFlag: false,
    reason: 'This scan matches your usual setup nicely.',
    consistencyScore: 0.9,
  };

  it('renders nothing when the scan is not flagged', () => {
    const html = renderToStaticMarkup(
      React.createElement(FingerprintFlag, { decision: notFlagged }),
    );
    expect(html).toBe('');
  });

  it('renders the honest reason when the scan is an outlier', () => {
    const html = renderToStaticMarkup(
      React.createElement(FingerprintFlag, { decision: flagged }),
    );
    expect(html).toContain('fingerprint-flag');
    expect(html).toContain('different conditions');
  });
});

describe('ConsistencyTip', () => {
  it('renders nothing when the tip is null (thin history, never generic)', () => {
    const html = renderToStaticMarkup(React.createElement(ConsistencyTip, { tip: null }));
    expect(html).toBe('');
  });

  it('renders the personalised tip text when present', () => {
    const tip = 'Your clearest scans are mornings by the window in natural light.';
    const html = renderToStaticMarkup(React.createElement(ConsistencyTip, { tip }));
    expect(html).toContain('consistency-tip');
    expect(html).toContain('mornings by the window');
  });
});

describe('CadenceReminderOptInContent', () => {
  it('renders the thin-history note (no toggle) when there is no honest cadence', () => {
    const html = renderToStaticMarkup(
      React.createElement(CadenceReminderOptInContent, {
        reminderTimeOfDay: null,
        reason: null,
        optedIn: false,
        saving: false,
        onToggle: noop,
      }),
    );
    expect(html).toContain('cadence-optin-thin');
    expect(html).not.toContain('cadence-optin-toggle');
  });

  it('renders an OFF toggle (opt-in, defaults off) with an accessible switch role', () => {
    const html = renderToStaticMarkup(
      React.createElement(CadenceReminderOptInContent, {
        reminderTimeOfDay: 'morning',
        reason: 'You tend to scan about once a week in the morning.',
        optedIn: false,
        saving: false,
        onToggle: noop,
      }),
    );
    expect(html).toContain('cadence-optin-toggle');
    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-checked="false"');
    expect(html).toContain('Remind me');
  });

  it('renders an ON toggle when opted in (revocable state)', () => {
    const html = renderToStaticMarkup(
      React.createElement(CadenceReminderOptInContent, {
        reminderTimeOfDay: 'evening',
        reason: 'You tend to scan about once a week in the evening.',
        optedIn: true,
        saving: false,
        onToggle: noop,
      }),
    );
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('Reminders on');
  });

  it('has a 44px minimum touch target on the toggle', () => {
    const html = renderToStaticMarkup(
      React.createElement(CadenceReminderOptInContent, {
        reminderTimeOfDay: 'morning',
        reason: 'reason',
        optedIn: false,
        saving: false,
        onToggle: noop,
      }),
    );
    expect(html).toContain('min-h-[44px]');
  });
});

describe('no em or en dashes in any rendered cadence surface', () => {
  it('sweeps every surface for dashes', () => {
    const surfaces: string[] = [
      renderToStaticMarkup(
        React.createElement(ScanStreakDisplayContent, { display: formatStreakDisplay(12, 12) }),
      ),
      renderToStaticMarkup(
        React.createElement(FingerprintFlag, {
          decision: { showFlag: true, reason: 'flagged reason', consistencyScore: 0.3 },
        }),
      ),
      renderToStaticMarkup(
        React.createElement(ConsistencyTip, { tip: 'Your clearest scans are mornings.' }),
      ),
      renderToStaticMarkup(
        React.createElement(CadenceReminderOptInContent, {
          reminderTimeOfDay: 'morning',
          reason: 'reason',
          optedIn: true,
          saving: false,
          onToggle: noop,
        }),
      ),
      renderToStaticMarkup(
        React.createElement(CadenceReminderOptInContent, {
          reminderTimeOfDay: null,
          reason: null,
          optedIn: false,
          saving: false,
          onToggle: noop,
        }),
      ),
    ];
    for (const html of surfaces) {
      expect(html.includes(EM_DASH)).toBe(false);
      expect(html.includes(EN_DASH)).toBe(false);
    }
  });
});
