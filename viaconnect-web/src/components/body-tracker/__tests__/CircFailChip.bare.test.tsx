import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CircFailChip } from '../CircFailChip';
import { CIRC_FAIL_COPY, CIRC_FAIL_REASONS } from '@/lib/arnold/scanning/circFailReason';

describe('CircFailChip', () => {
  it('renders every honest surface reason without inventing cm', () => {
    for (const reason of CIRC_FAIL_REASONS) {
      const html = renderToStaticMarkup(React.createElement(CircFailChip, { reason }));
      expect(html).toContain('scan-circ-fail-chip');
      expect(html).toContain(`data-reason="${reason}"`);
      expect(html).toContain(CIRC_FAIL_COPY[reason]);
      expect(html).not.toMatch(/\d+\s*cm/i);
    }
  });
});
