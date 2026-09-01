/**
 * Prompt 231: render smoke test for ScanHistory using
 * react-dom/server renderToStaticMarkup (node-safe, no jsdom), matching the
 * other scan/__tests__/*.bare.test.tsx convention. ScanHistory is
 * prop-driven for its scan list (the fetch lives in a future loader, per
 * ScanExperienceLoader/ScanExperience) so the list states are testable
 * without mocking effects.
 */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ScanHistory } from '../ScanHistory';
import type { ScanSummary } from '@/lib/scan/scanReadsShared';

const NOOP = () => {};

function scan(overrides: Partial<ScanSummary> = {}): ScanSummary {
  return {
    id: 'session-1',
    date: '2026-08-20',
    protocol: '4pose_v1',
    captureStatus: 'ready',
    poses: { front: true, right: true, back: true, left: true },
    ...overrides,
  };
}

describe('ScanHistory - empty state', () => {
  it('renders the honest empty-state copy when there are no scans', () => {
    const html = renderToStaticMarkup(
      React.createElement(ScanHistory, { scans: [], onDeleted: NOOP }),
    );
    expect(html).toContain('No scans yet. Your first scan takes about a minute.');
    expect(html).toContain('scan-history-upload-escape');
    expect(html).toContain('Upload saved images');
    expect(html).toContain('/body-tracker/formavision?mode=upload');
  });

  it('never renders the empty state while scans are loading (scans: null)', () => {
    const html = renderToStaticMarkup(
      React.createElement(ScanHistory, { scans: null, onDeleted: NOOP }),
    );
    expect(html).not.toContain('No scans yet');
  });
});

describe('ScanHistory - rendering a scan', () => {
  it('renders the date, protocol, and status of a scan', () => {
    const html = renderToStaticMarkup(
      React.createElement(ScanHistory, { scans: [scan()], onDeleted: NOOP }),
    );
    expect(html).toContain('scan-history-item-session-1');
    expect(html).toContain('Body scan');
    expect(html).not.toContain('4pose_v1');
    expect(html).toMatch(/ready/i);
  });

  it('renders a placeholder, never a broken image, for a pose with no path', () => {
    const html = renderToStaticMarkup(
      React.createElement(ScanHistory, {
        scans: [scan({ poses: { front: true, right: false, back: true, left: true } })],
        onDeleted: NOOP,
      }),
    );
    expect(html).toContain('scan-history-pose-placeholder-right');
    expect(html).not.toMatch(/<img[^>]*src=""/);
  });

  it('renders a Delete action for a visible scan', () => {
    const html = renderToStaticMarkup(
      React.createElement(ScanHistory, { scans: [scan()], onDeleted: NOOP }),
    );
    expect(html).toContain('scan-history-delete-session-1');
    expect(html).toMatch(/delete/i);
  });

  it('shows partial status distinctly from ready', () => {
    const html = renderToStaticMarkup(
      React.createElement(ScanHistory, {
        scans: [scan({ captureStatus: 'partial' })],
        onDeleted: NOOP,
      }),
    );
    expect(html).toMatch(/partial/i);
  });
});

describe('ScanHistory - tombstoned rows never render as a normal scan', () => {
  it('does not render a delete_pending row as a normal, deletable scan', () => {
    const html = renderToStaticMarkup(
      React.createElement(ScanHistory, {
        scans: [scan({ id: 'session-pending', captureStatus: 'delete_pending' })],
        onDeleted: NOOP,
      }),
    );
    expect(html).not.toContain('scan-history-delete-session-pending');
  });

  it('does not render a deleted row at all', () => {
    const html = renderToStaticMarkup(
      React.createElement(ScanHistory, {
        scans: [scan({ id: 'session-gone', captureStatus: 'deleted' })],
        onDeleted: NOOP,
      }),
    );
    expect(html).not.toContain('session-gone');
  });

  it('falls back to the empty state when every passed scan is tombstoned', () => {
    const html = renderToStaticMarkup(
      React.createElement(ScanHistory, {
        scans: [scan({ captureStatus: 'delete_pending' })],
        onDeleted: NOOP,
      }),
    );
    expect(html).toContain('No scans yet. Your first scan takes about a minute.');
  });
});

describe('ScanHistory - multiple scans', () => {
  it('renders every visible scan in the list', () => {
    const html = renderToStaticMarkup(
      React.createElement(ScanHistory, {
        scans: [scan({ id: 'session-1' }), scan({ id: 'session-2', date: '2026-08-01' })],
        onDeleted: NOOP,
      }),
    );
    expect(html).toContain('scan-history-item-session-1');
    expect(html).toContain('scan-history-item-session-2');
  });
});
