/**
 * Node-safe render of FormaVision FRBL upload slots.
 * Registered by exact name in vitest.config.ts (no @testing-library/dom).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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

  it('renders one overlay file input and one label per FRBL slot', () => {
    const fileInputs = html.match(/<input[^>]*type="file"[^>]*>/g) ?? [];
    const labels = html.match(/<label\b/g) ?? [];
    expect(fileInputs).toHaveLength(FORMAVISION_SLOT_ORDER.length);
    expect(labels).toHaveLength(FORMAVISION_SLOT_ORDER.length);
    for (const pos of FORMAVISION_SLOT_ORDER) {
      expect(html).toContain(`data-testid="scan-slot-frame-${pos.key}"`);
      expect(html).toContain(`data-testid="scan-slot-upload-${pos.key}"`);
      expect(html).toContain(`data-testid="scan-slot-input-${pos.key}"`);
      expect(html).toContain(`id="scan-${pos.key}-upload"`);
      const forHits = html.split(`for="scan-${pos.key}-upload"`).length - 1;
      expect(forHits).toBeLessThanOrEqual(1);
    }
    expect(html).not.toMatch(/capture=/);
    expect(html).not.toMatch(/class="hidden"/);
    expect(html).not.toMatch(/class="sr-only"/);
    expect(html).not.toMatch(/h-px w-px/);
    expect(html).toMatch(/absolute inset-0 z-20/);
    expect(html).toMatch(/opacity-0/);
    expect(html).toContain('accept="image/*"');
    expect(html).toContain('Camera or gallery');
    expect(html).toContain('Upload');
  });

  it('keeps portrait slot frames and the analyze CTA', () => {
    expect(html).toContain('aspect-[3/4]');
    expect(html).toContain('Analyze My Composition');
    expect(html).toContain('Upload saved images');
    expect(html).toContain('photo-estimate-explainer');
    expect(html).toContain('What you get:');
    expect(html).toContain('What you do not get:');
    expect(html).toContain('body-fat range estimate');
    expect(html).not.toContain('Navy body fat from photos');
  });
});

describe('BodyScanUploader preview bake contract', () => {
  it('does not settle slot preview on a raw file ObjectURL', () => {
    const src = readFileSync(join(process.cwd(), 'src/components/body-tracker/BodyScanUploader.tsx'), 'utf8');
    expect(src).toMatch(/URL\.createObjectURL\(stored\)/);
    expect(src).not.toMatch(/URL\.createObjectURL\(file\)/);
    expect(src).toMatch(/return \{ \.\.\.s, \[key\]: \{ file, base64: null, previewUrl: null \} \}/);
    expect(src).toMatch(/previewUrl: shownUrl/);
    expect(src).toMatch(/normalizeScanPhotoUpright\(stored, 'upload'\)/);
  });
});
