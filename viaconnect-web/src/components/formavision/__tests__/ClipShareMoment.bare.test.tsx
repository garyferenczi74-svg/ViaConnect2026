// Prompt 211a W1: node-safe render test for the consumer-only Helix first-share
// moment. Confirms celebrate-only rendering and that the toast never renders when
// there is nothing to celebrate (honest: no empty celebration).

import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ClipShareMoment } from '../ClipShareMoment';

describe('ClipShareMoment: celebrate-only', () => {
  it('renders the celebratory toast when show is true', () => {
    const html = renderToStaticMarkup(
      createElement(ClipShareMoment, { show: true, onDismiss: () => {} }),
    );
    expect(html).toContain('clip-share-moment-toast');
    expect(html).toContain('clip-share-moment-heading');
    expect(html).toContain('First share');
    // A dismiss control with a real touch target exists.
    expect(html).toContain('clip-share-moment-dismiss');
  });

  it('renders NOTHING when show is false (no empty celebration)', () => {
    const html = renderToStaticMarkup(
      createElement(ClipShareMoment, { show: false, onDismiss: () => {} }),
    );
    expect(html).toBe('');
  });

  it('carries no economy language and no raw photo', () => {
    const html = renderToStaticMarkup(
      createElement(ClipShareMoment, { show: true, onDismiss: () => {} }),
    );
    // Celebrate-only copy: it does not claim any token / helix / credit was granted.
    expect(html.toLowerCase()).not.toContain('helix');
    expect(html.toLowerCase()).not.toContain('token');
    expect(html.toLowerCase()).not.toContain('credit');
    expect(html).not.toMatch(/<img\b/i);
  });
});
