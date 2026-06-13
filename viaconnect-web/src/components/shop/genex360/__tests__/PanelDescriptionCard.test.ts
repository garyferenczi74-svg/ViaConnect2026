// Prompt 193 Task T2 (2026-06-12): contract tests for PanelDescriptionCard.
// Prompt 193a Task T3 (2026-06-12): plus the openSnpSlug + onToggleSnp threading.
//
// Source-as-text assertions per the repo convention (environment: 'node', no
// jsdom). These lock the shared id and aria convention (id={panel.slug},
// role="tabpanel", aria-labelledby genex360-tab pattern, scroll-mt), the
// rendered data fields, the mounted child components, the six slug icon map,
// the Back to panels anchor and 44px tap target, the Lucide strokeWidth, and
// the no dash rule. The 193a assertions confirm the single open SNP slug and
// toggle are passed to every PanelMarkerGroup the card renders.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const COMPONENT = path.resolve(__dirname, '..', 'PanelDescriptionCard.tsx');

describe('PanelDescriptionCard source', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('uses the panel slug as the card id for native hash deep links', () => {
    expect(source).toContain('id={panel.slug}');
  });

  it('marks the card as a tabpanel', () => {
    expect(source).toContain('role="tabpanel"');
  });

  it('labels the card by the matching pill tab via the genex360-tab pattern', () => {
    expect(source).toContain('`genex360-tab-${panel.slug}`');
    expect(source).toContain('aria-labelledby={tabId}');
  });

  it('makes the card focusable for hash deep links', () => {
    expect(source).toContain('tabIndex={0}');
  });

  it('sets scroll margin top so a hash link clears the sticky header', () => {
    expect(source).toContain('scroll-mt-');
  });

  it('uses the Card surface token', () => {
    expect(source).toContain('bg-[#1E3054]');
  });

  it('renders the overview and the marker count label chip', () => {
    expect(source).toContain('panel.overview');
    expect(source).toContain('panel.markerCountLabel');
  });

  it('renders the displayName, subtitle, and tagline', () => {
    expect(source).toContain('panel.displayName');
    expect(source).toContain('panel.subtitle');
    expect(source).toContain('panel.tagline');
  });

  it('renders the what you will learn, collection, and protocol tie in copy', () => {
    expect(source).toContain('panel.whatYoullLearn');
    expect(source).toContain('panel.collection');
    expect(source).toContain('panel.protocolTieIn');
  });

  it('labels the protocol tie in section', () => {
    expect(source).toContain('How this feeds your protocol');
  });

  it('maps the panel groups onto PanelMarkerGroup', () => {
    expect(source).toContain('<PanelMarkerGroup');
    expect(source).toContain('group={group}');
    expect(source).toContain('key={group.groupTitle}');
  });

  it('threads the single open SNP slug and toggle down to every marker group (193a)', () => {
    expect(source).toContain('openSnpSlug?: string | null');
    expect(source).toContain('onToggleSnp?: (snpSlug: string) => void');
    expect(source).toContain('openSnpSlug={openSnpSlug}');
    expect(source).toContain('onToggleSnp={onToggleSnp}');
  });

  it('threads the highlightRsid down to every marker group (193c)', () => {
    expect(source).toContain('highlightRsid?: string | null');
    expect(source).toContain('highlightRsid={highlightRsid}');
  });

  it('mounts PanelMarkerGroup and PanelDisclaimer', () => {
    expect(source).toContain("import { PanelDisclaimer } from \"./PanelDisclaimer\"");
    expect(source).toContain("import { PanelMarkerGroup } from \"./PanelMarkerGroup\"");
    expect(source).toContain('<PanelDisclaimer slug={panel.slug} />');
  });

  it('defines the per panel icon map for all six slugs', () => {
    expect(source).toContain('Record<PanelSlug, LucideIcon>');
    expect(source).toContain('"genex-m": Dna');
    expect(source).toContain('"nutrigen-dx": Apple');
    expect(source).toContain('"hormone-iq": Activity');
    expect(source).toContain('"epigen-hq": Hourglass');
    expect(source).toContain('"peptide-iq": HeartPulse');
    expect(source).toContain('"cannabis-iq": Leaf');
  });

  it('provides a Back to panels anchor pointing at the pill row', () => {
    expect(source).toContain('href="#genex360-panels"');
    expect(source).toContain('Back to panels');
  });

  it('honors an optional onBackToPanels callback with preventDefault', () => {
    expect(source).toContain('onBackToPanels?: () => void');
    expect(source).toContain('event.preventDefault()');
    expect(source).toContain('onBackToPanels()');
  });

  it('gives the back control a 44px minimum tap target', () => {
    expect(source).toContain('min-h-[44px]');
  });

  it('uses Lucide icons at strokeWidth 1.5', () => {
    expect(source).toContain('strokeWidth={1.5}');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
