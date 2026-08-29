/**
 * Prompt 231b: render smoke test for PhotoShareGrantModal using
 * react-dom/server renderToStaticMarkup, matching the
 * src/components/scan/__tests__/*.bare.test.tsx convention. onConfirm is
 * never invoked by a static render, so only the render-time states are
 * covered here; the actual grantPhotoShare submission, timeout, and error
 * mapping paths are deferred to Playwright / the device matrix.
 */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PhotoShareGrantModal } from '../PhotoShareGrantModal';
import type { ShareablePractitioner } from '@/lib/photo-shares/types';

const NOOP = () => {};
const NEVER_CONFIRM = () => new Promise<never>(() => {});

function practitioner(overrides: Partial<ShareablePractitioner> = {}): ShareablePractitioner {
  return {
    practitionerId: 'prac-1',
    displayName: 'Dr. Jane Smith',
    practiceName: 'Wellness Clinic',
    ...overrides,
  };
}

describe('PhotoShareGrantModal - honest warning copy', () => {
  it('renders the exact R5 warning wording verbatim', () => {
    const html = renderToStaticMarkup(
      React.createElement(PhotoShareGrantModal, {
        open: true,
        practitioners: [practitioner()],
        onClose: NOOP,
        onConfirm: NEVER_CONFIRM,
        onGranted: NOOP,
      }),
    );
    expect(html).toContain(
      'Sharing gives your practitioner access to all of your body photos, past and future, until you revoke it.',
    );
    expect(html).toContain('Access expires in 30 days unless you renew or revoke it.');
  });

  it('lists the linked practitioner as a selectable option, not free text', () => {
    const html = renderToStaticMarkup(
      React.createElement(PhotoShareGrantModal, {
        open: true,
        practitioners: [practitioner()],
        onClose: NOOP,
        onConfirm: NEVER_CONFIRM,
        onGranted: NOOP,
      }),
    );
    expect(html).toContain('photo-share-grant-radio-prac-1');
    expect(html).toContain('Dr. Jane Smith');
  });
});

describe('PhotoShareGrantModal - no linked practitioners', () => {
  it('renders the honest no-linked-practitioners message when the list is empty', () => {
    const html = renderToStaticMarkup(
      React.createElement(PhotoShareGrantModal, {
        open: true,
        practitioners: [],
        onClose: NOOP,
        onConfirm: NEVER_CONFIRM,
        onGranted: NOOP,
      }),
    );
    expect(html).toContain(
      'You have no linked practitioners yet. A practitioner must add you to their care team before you can share.',
    );
    expect(html).not.toContain('photo-share-grant-list');
  });
});

describe('PhotoShareGrantModal - closed', () => {
  it('renders nothing when not open', () => {
    const html = renderToStaticMarkup(
      React.createElement(PhotoShareGrantModal, {
        open: false,
        practitioners: [practitioner()],
        onClose: NOOP,
        onConfirm: NEVER_CONFIRM,
        onGranted: NOOP,
      }),
    );
    expect(html).toBe('');
  });
});
