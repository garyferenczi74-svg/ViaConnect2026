// Prompt 204b (2026-06-17): contract tests for the real-data YourVariantsCard.
//
// Source-as-text assertions per the repo convention (environment: 'node', no
// jsdom). These lock the new contract: the card is driven by real member data
// (useGeneticsVariants), the six pills render from PANEL_ORDER with labels
// resolved through resolvePanelLabel (generic by default, branded only for an
// owned panel, never hardcoded), the tabpanel wiring, the GeneX360 link, the
// honest empty / locked state, and the no dash rule. The retired Prompt 191
// sample-data internals must be gone.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const COMPONENT = path.resolve(__dirname, '..', 'YourVariantsCard.tsx');

describe('YourVariantsCard source', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('reads the ?test= deep link via useSearchParams', () => {
    expect(source).toContain('useSearchParams');
    expect(source).toContain("searchParams.get('test')");
  });

  it('is driven by real data through the useGeneticsVariants hook', () => {
    expect(source).toContain("import { useGeneticsVariants");
    expect(source).toContain('useGeneticsVariants()');
  });

  it('renders the six panels from PANEL_ORDER, not a sample set', () => {
    expect(source).toContain('PANEL_ORDER.map');
    expect(source).not.toContain('geneticsVariantSamples');
    expect(source).not.toContain('getTestById');
    expect(source).not.toContain('totalSampleVariantCount');
  });

  it('resolves every pill label through resolvePanelLabel (never hardcoded)', () => {
    expect(source).toContain('resolvePanelLabel(panelKey, brandedPanels.includes(panelKey))');
    // The branded labels must not appear as literal strings in the markup.
    expect(source).not.toContain('>GeneXM<');
    expect(source).not.toContain("'NutrigenDX'");
  });

  it('renders the active panel as a tabpanel labelled by the active tab', () => {
    expect(source).toContain('role="tabpanel"');
    expect(source).toContain('aria-labelledby={activeTabId}');
    expect(source).toContain('id={PANEL_ID}');
  });

  it('builds the pill tablist with roving tabindex and arrow key navigation', () => {
    expect(source).toContain('role="tablist"');
    expect(source).toContain('tabIndex={active ? 0 : -1}');
    expect(source).toContain("case 'ArrowRight'");
  });

  it('shows genotype status as +/+, +/-, and -/-', () => {
    expect(source).toContain('zygosityFromStatus');
    expect(source).toContain("'+/+'");
    expect(source).toContain("'-/-'");
  });

  it('shows an honest empty / locked state using the generic label, not an error', () => {
    expect(source).toContain('No {activeGenericLabel} {activeEmptyNoun} yet.');
    expect(source).not.toContain('overflow-y-auto');
  });

  it('renders observed badges with units and never uses marketing markerCount', () => {
    expect(source).toContain('formatObservedBadge');
    expect(source).toContain('observedByPanel');
    expect(source).not.toContain('markerCount');
    expect(source).not.toContain("from './blueprintBentoData'");
    expect(source).not.toContain("from '@/data/genex360/panels'");
    expect(source).toContain('n/a instead of 0');
  });

  it('imports GENEX360_SHOP_HREF and links to it with a Next Link', () => {
    expect(source).toContain("import { GENEX360_SHOP_HREF } from './geneticsHubLinks'");
    expect(source).toContain("import Link from 'next/link'");
    expect(source).toContain('href={GENEX360_SHOP_HREF}');
  });

  it('has a persistent upgrade / add-a-test CTA in the header and an add-this-test empty state (Prompt 204)', () => {
    // A persistent header CTA to the shop, plus the relabeled per-panel empty-state
    // button. The old "Order GeneX360" label is gone.
    expect(source).toContain('Upgrade or add a test');
    expect(source).toContain('Add this test');
    expect(source).not.toContain('Order GeneX360');
  });

  it('uses the yourVariants media seam from GENETICS_CARD_MEDIA', () => {
    expect(source).toContain('GENETICS_CARD_MEDIA.yourVariants');
  });

  it('reconnects the 193c deep link via VariantReportPill and resolveVariantReport (204e)', () => {
    expect(source).toContain("import { VariantReportPill }");
    expect(source).toContain("import { resolveVariantReport }");
    // The panel slug is derived from PANEL_LABELS, never hardcoded, and fed to
    // the resolver per row; the pill is gated on a real matching report.
    expect(source).toContain('PANEL_LABELS[activePanel].slug');
    expect(source).toContain('resolveVariantReport(row.rsid, activePanelSlug, row.gene ?? undefined)');
    expect(source).toContain('<VariantReportPill');
    expect(source).toContain('report?.exists');
  });

  it('shows the consult-your-practitioner warning on the SNP data via the approved PanelDisclaimer', () => {
    expect(source).toContain(
      "import { PanelDisclaimer } from '@/components/shop/genex360/PanelDisclaimer'",
    );
    // Keyed to the active panel so PeptideIQ / CannabisIQ get their extra
    // caveats, and persistent (the warning is outside the loading / rows /
    // empty branches, so it shows on every state).
    expect(source).toContain('<PanelDisclaimer slug={activePanelSlug} />');
  });

  it('renders the severity tier as the score via SeverityPill, not zygosity (204g)', () => {
    expect(source).toContain(
      "import { SeverityPill } from '@/components/genetics/SeverityPill'",
    );
    expect(source).toContain('<SeverityPill tier={row.severity} />');
    // Zygosity is demoted to a neutral chip; the old brand-token colored status
    // badge (statusBadgeClasses) that was the score is gone.
    expect(source).not.toContain('statusBadgeClasses');
  });

  it('restores the All / High / Moderate / Low filter with live counts (204g)', () => {
    expect(source).toContain("import { VariantImpactFilter, type ImpactFilterValue }");
    expect(source).toContain('<VariantImpactFilter');
    expect(source).toContain('counts={counts}');
    expect(source).toContain('value={impactFilter}');
    expect(source).toContain('filteredRows.map');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
