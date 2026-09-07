/**
 * Prompt 217: My Biology action row + pill row contracts.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { CompositionSectionToggle } from '../CompositionSectionToggle';
import {
  BIOLOGY_ACTION_BTN_BASE,
  BIOLOGY_ACTION_BTN_PRIMARY,
  BIOLOGY_ACTION_BTN_NEUTRAL,
} from '../BiologyActionRow';

const root = process.cwd();

describe('Prompt 217 BiologyActionRow', () => {
  it('exports uniform 48px (h-12) button variants with Card surface', () => {
    expect(BIOLOGY_ACTION_BTN_BASE).toMatch(/h-12/);
    expect(BIOLOGY_ACTION_BTN_BASE).toMatch(/whitespace-nowrap/);
    expect(BIOLOGY_ACTION_BTN_NEUTRAL).toMatch(/30,48,84|1E3054/i);
    expect(BIOLOGY_ACTION_BTN_PRIMARY).toMatch(/45,165,160|2DA5A0/i);
  });

  it('composition page uses BiologyActionRow without a second FormaVision CTA', () => {
    const page = readFileSync(
      join(root, 'src/app/(app)/(consumer)/body-tracker/composition/page.tsx'),
      'utf8',
    );
    expect(page).toMatch(/BiologyActionRow/);
    // Action UI no longer hardcodes the old Scan My Body button label
    expect(page).not.toMatch(/>\s*Scan My Body\s*</);
    expect(page).not.toMatch(/formavisionScanEntryHref/);
    expect(page).not.toMatch(/biology-action-formavision/);
    expect(page).not.toMatch(/onToggleScan/);
    const row = readFileSync(
      join(root, 'src/components/body-tracker/BiologyActionRow.tsx'),
      'utf8',
    );
    expect(row).not.toMatch(/>FormaVision</);
    expect(row).not.toMatch(/biology-action-formavision/);
    expect(row).not.toMatch(/onToggleScan/);
    expect(row).toMatch(/>Log Data</);
    expect(row).toMatch(/variant="biology"/);
    expect(row).toMatch(/overflow-x-auto/);
    expect(row).toMatch(/snap-x/);
    expect(row).toMatch(/onToggleLog/);
    expect(row).not.toMatch(/Scan My Body/);
  });

  it("Doctor's Report label lives on biology variant of DownloadReportButton", () => {
    const src = readFileSync(
      join(root, 'src/components/formavision/DownloadReportButton.tsx'),
      'utf8',
    );
    expect(src).toMatch(/Doctor's Report/);
    expect(src).toMatch(/variant\?: 'default' \| 'biology'/);
  });
});

describe('Prompt 217 CompositionSectionToggle (superseded by Brief 61)', () => {
  it('is a 2×2 mobile grid without overflow-x snap chips', () => {
    const src = readFileSync(
      join(root, 'src/components/body-tracker/CompositionSectionToggle.tsx'),
      'utf8',
    );
    expect(src).toMatch(/grid-cols-2/);
    expect(src).toMatch(/min-h-\[52px\]/);
    expect(src).not.toMatch(/overflow-x-auto/);
    expect(src).not.toMatch(/snap-x/);
    expect(src).not.toMatch(/flex-wrap/);
    expect(src).toMatch(/#B75E18/);
  });

  it('still renders four tabs including FormaVision two-tone', () => {
    const html = renderToStaticMarkup(
      React.createElement(CompositionSectionToggle, {
        active: 'fat',
        onChange: () => {},
      }),
    );
    expect(html).toContain('composition-tab-fat');
    expect(html).toContain('composition-tab-formavision');
    expect(html).toContain('Forma');
    expect(html).toContain('Vision');
    expect(html).not.toContain('overflow-x-auto');
  });
});
