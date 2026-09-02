/**
 * Node-safe render of FormaVision FRBL upload slots.
 * Registered by exact name in vitest.config.ts (no @testing-library/dom).
 */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BodyScanUploader } from '../BodyScanUploader';
import { FORMAVISION_SLOT_ORDER } from '@/lib/body-tracker/composition/formaVisionScanSlots';

function renderEmptySlots(): string {
  return renderToStaticMarkup(
    React.createElement(BodyScanUploader, {
      onComplete: () => undefined,
      onCancel: () => undefined,
    }),
  );
}

describe('BodyScanUploader slot picker markup', () => {
  const html = renderEmptySlots();

  it('renders one file input per FRBL slot without capture or display:none', () => {
    const fileInputs = html.match(/<input[^>]*type="file"[^>]*>/g) ?? [];
    expect(fileInputs).toHaveLength(FORMAVISION_SLOT_ORDER.length);
    for (const pos of FORMAVISION_SLOT_ORDER) {
      expect(html).toContain(`data-testid="scan-slot-frame-${pos.key}"`);
      expect(html).toContain(`data-testid="scan-slot-input-${pos.key}"`);
      expect(html).toContain(`id="scan-${pos.key}"`);
      expect(html).toContain(`aria-label="Upload ${pos.label} photo"`);
    }
    expect(html).not.toMatch(/capture=/);
    expect(html).not.toMatch(/htmlFor=/);
    expect(html).not.toMatch(/class="hidden"/);
    expect(html).toContain('accept="image/*"');
    expect(html).toContain('Camera or gallery');
    expect(html).toContain('Upload');
  });

  it('keeps portrait slot frames and the analyze CTA', () => {
    expect(html).toContain('aspect-[3/4]');
    expect(html).toContain('Analyze My Composition');
    expect(html).toContain('Upload saved images');
  });
});
