/**
 * Prompt 231: render smoke test for ScanHistory using
 * react-dom/server renderToStaticMarkup (node-safe, no jsdom), matching the
 * other scan/__tests__/*.bare.test.tsx convention. ScanHistory is
 * prop-driven for its scan list (the fetch lives in a future loader, per
 * ScanExperienceLoader/ScanExperience) so the list states are testable
 * without mocking effects.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ScanHistory } from '../ScanHistory';
import { scanHistoryShowsFrblGrid, type ScanSummary } from '@/lib/scan/scanSummary';

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

describe('ScanHistory - client/server boundary', () => {
  it('does not value-import scanReadsShared (next/headers must stay off the client graph)', () => {
    const history = readFileSync(join(process.cwd(), 'src/components/scan/ScanHistory.tsx'), 'utf8');
    const section = readFileSync(join(process.cwd(), 'src/components/scan/ScanHistorySection.tsx'), 'utf8');
    expect(history).not.toMatch(/from '@\/lib\/scan\/scanReadsShared'/);
    expect(section).not.toMatch(/from '@\/lib\/scan\/scanReadsShared'/);
    expect(history).not.toMatch(/listScans/);
    expect(section).not.toMatch(/listScans/);
    expect(section).toMatch(/\/api\/scan\/history/);
    expect(history).toMatch(/from '@\/lib\/scan\/scanProtocols'/);
    expect(history).toMatch(/from '@\/lib\/scan\/scanSummary'/);
    expect(history).toMatch(/from '@\/lib\/formavision\/twoProtocolCopy'/);
  });

  it('always hides the FRBL grid for formavision_photo', () => {
    const history = readFileSync(join(process.cwd(), 'src/components/scan/ScanHistory.tsx'), 'utf8');
    expect(history).toMatch(/scanHistoryShowsFrblGrid/);
    expect(history).toMatch(/SCAN_HISTORY_PHOTOS_DISCARDED/);
    expect(history).toMatch(/SCAN_HISTORY_PHOTOS_RETAINED/);
    expect(history).toMatch(/scanHistoryPhotoCaption/);
    expect(scanHistoryShowsFrblGrid({ protocol: 'formavision_photo' })).toBe(false);
    expect(scanHistoryShowsFrblGrid({ protocol: '4pose_v1' })).toBe(true);
  });
});

describe('ScanHistory - empty state', () => {
  it('renders the honest empty-state copy when there are no scans', () => {
    const html = renderToStaticMarkup(
      React.createElement(ScanHistory, { scans: [], onDeleted: NOOP }),
    );
    expect(html).toContain('No scans yet. Your first scan takes about a minute.');
    expect(html).not.toContain('scan-history-upload-escape');
  });

  it('never renders the empty state while scans are loading (scans: null)', () => {
    const html = renderToStaticMarkup(
      React.createElement(ScanHistory, { scans: null, onDeleted: NOOP }),
    );
    expect(html).not.toContain('No scans yet');
  });
});

describe('ScanHistory - rendering a scan', () => {
  it('labels a FormaVision photo scan without a 4-pose delete control', () => {
    const html = renderToStaticMarkup(
      React.createElement(ScanHistory, {
        scans: [scan({
          id: 'photo-1',
          protocol: 'formavision_photo',
          poses: { front: false, right: false, back: false, left: false },
        })],
        onDeleted: NOOP,
      }),
    );
    expect(html).toContain('scan-history-item-photo-1');
    expect(html).toContain('Photo estimate');
    expect(html).not.toContain('4pose_v1');
    expect(html).not.toContain('formavision_photo');
    expect(html).not.toContain('scan-history-delete-photo-1');
  });

  it('shows the Ready photo BF range when the estimate is present', () => {
    const html = renderToStaticMarkup(
      React.createElement(ScanHistory, {
        scans: [scan({
          id: 'photo-bf',
          protocol: 'formavision_photo',
          poses: { front: false, right: false, back: false, left: false },
          estimatedBodyFatMin: 29,
          estimatedBodyFatMax: 33,
        })],
        onDeleted: NOOP,
      }),
    );
    expect(html).toContain('scan-history-bf-photo-bf');
    expect(html).toContain('Body fat 29.0–33.0%');
    expect(html).toMatch(/Ready/);
  });

  it('hides the FRBL grid for formavision_photo even if poses are marked present', () => {
    const html = renderToStaticMarkup(
      React.createElement(ScanHistory, {
        scans: [scan({
          id: 'photo-stored',
          protocol: 'formavision_photo',
          poses: { front: true, right: false, back: true, left: false },
        })],
        onDeleted: NOOP,
      }),
    );
    expect(html).toContain('scan-history-photos-discarded-photo-stored');
    expect(html).not.toContain('scan-history-pose-loading-front');
    expect(html).not.toContain('scan-history-pose-placeholder-right');
  });

  it('hides the FRBL grid for formavision_photo instead of ImageOff placeholders', () => {
    const html = renderToStaticMarkup(
      React.createElement(ScanHistory, {
        scans: [scan({
          id: 'photo-1',
          protocol: 'formavision_photo',
          poses: { front: false, right: false, back: false, left: false },
        })],
        onDeleted: NOOP,
      }),
    );
    expect(html).toContain('scan-history-photos-discarded-photo-1');
    expect(html).toContain('Photos are not stored after analysis.');
    expect(html).not.toContain('scan-history-pose-placeholder-front');
    expect(html).not.toContain('scan-history-pose-placeholder-right');
    expect(html).not.toContain('scan-history-pose-placeholder-back');
    expect(html).not.toContain('scan-history-pose-placeholder-left');
    expect(html).not.toContain('scan-history-pose-loading-front');
  });

  it('renders the date, protocol, and status of a scan', () => {
    const html = renderToStaticMarkup(
      React.createElement(ScanHistory, { scans: [scan()], onDeleted: NOOP }),
    );
    expect(html).toContain('scan-history-item-session-1');
    expect(html).toContain('Guided 4-pose');
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
