/**
 * Prompt 231b: render smoke test for the "Body photo shares" section using
 * react-dom/server renderToStaticMarkup (node-safe, no jsdom), matching the
 * src/components/scan/__tests__/*.bare.test.tsx convention. PhotoSharesView
 * is prop-driven (the Supabase fetch lives in PhotoSharesSection) so the
 * list states are testable here without mocking effects or auth.
 *
 * DOM interactions (clicking Retry, opening the grant modal, submitting a
 * grant/revoke against Supabase) are deferred to Playwright / the device
 * matrix, not covered by these bare tests.
 */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PhotoSharesView } from '../PhotoSharesView';
import type { ActivePhotoShare } from '@/lib/photo-shares/types';

const NOOP = () => {};

function share(overrides: Partial<ActivePhotoShare> = {}): ActivePhotoShare {
  return {
    practitionerId: 'prac-1',
    displayName: 'Dr. Jane Smith',
    practiceName: 'Wellness Clinic',
    grantedAt: '2026-08-01T00:00:00.000Z',
    expiresAt: '2026-08-31T00:00:00.000Z',
    rowIds: ['row-1'],
    ...overrides,
  };
}

describe('PhotoSharesView - empty state', () => {
  it('renders the honest empty-state copy when there are no active shares', () => {
    const html = renderToStaticMarkup(
      React.createElement(PhotoSharesView, {
        shares: [],
        loadError: false,
        onRetryLoad: NOOP,
        onOpenGrant: NOOP,
        onOpenRevoke: NOOP,
      }),
    );
    expect(html).toContain('You have not shared your body photos with any practitioner.');
  });

  it('never renders the empty state while shares are loading (shares: null)', () => {
    const html = renderToStaticMarkup(
      React.createElement(PhotoSharesView, {
        shares: null,
        loadError: false,
        onRetryLoad: NOOP,
        onOpenGrant: NOOP,
        onOpenRevoke: NOOP,
      }),
    );
    expect(html).not.toContain('You have not shared your body photos');
    expect(html).toContain('photo-shares-loading');
  });
});

describe('PhotoSharesView - an active share', () => {
  it('renders the practitioner name and expiry for a provided active share', () => {
    const html = renderToStaticMarkup(
      React.createElement(PhotoSharesView, {
        shares: [share()],
        loadError: false,
        onRetryLoad: NOOP,
        onOpenGrant: NOOP,
        onOpenRevoke: NOOP,
      }),
    );
    expect(html).toContain('Dr. Jane Smith');
    expect(html).toContain('Wellness Clinic');
    expect(html).toMatch(/Access expires/);
    expect(html).toContain('photo-share-item-prac-1');
    expect(html).toContain('photo-share-revoke-prac-1');
  });
});

describe('PhotoSharesView - the share button', () => {
  it('renders the "Share your body photos" action', () => {
    const html = renderToStaticMarkup(
      React.createElement(PhotoSharesView, {
        shares: [],
        loadError: false,
        onRetryLoad: NOOP,
        onOpenGrant: NOOP,
        onOpenRevoke: NOOP,
      }),
    );
    expect(html).toContain('photo-shares-grant-open');
    expect(html).toMatch(/Share your body photos/);
  });
});

describe('PhotoSharesView - load error', () => {
  it('renders a named Retry action on load failure, not the empty state', () => {
    const html = renderToStaticMarkup(
      React.createElement(PhotoSharesView, {
        shares: null,
        loadError: true,
        onRetryLoad: NOOP,
        onOpenGrant: NOOP,
        onOpenRevoke: NOOP,
      }),
    );
    expect(html).toContain('photo-shares-retry');
    expect(html).toMatch(/retry/i);
    expect(html).not.toContain('You have not shared your body photos');
  });

  // Prompt 231b fix: a load failure must not enable a Share flow whose
  // practitioner list never loaded (228 no-transitional-dead-end).
  it('disables the Share your body photos button after a load failure', () => {
    const html = renderToStaticMarkup(
      React.createElement(PhotoSharesView, {
        shares: null,
        loadError: true,
        onRetryLoad: NOOP,
        onOpenGrant: NOOP,
        onOpenRevoke: NOOP,
      }),
    );
    // exact attribute match, not a substring match: the button's className
    // includes the Tailwind variant "disabled:opacity-50", which would give
    // a false positive against a loose "disabled" substring search.
    expect(html).toContain('data-testid="photo-shares-grant-open" disabled=""');
  });

  it('re-enables the Share your body photos button once the retried load succeeds', () => {
    const html = renderToStaticMarkup(
      React.createElement(PhotoSharesView, {
        shares: [],
        loadError: false,
        onRetryLoad: NOOP,
        onOpenGrant: NOOP,
        onOpenRevoke: NOOP,
      }),
    );
    expect(html).toContain('data-testid="photo-shares-grant-open"');
    expect(html).not.toContain('data-testid="photo-shares-grant-open" disabled=""');
  });
});
