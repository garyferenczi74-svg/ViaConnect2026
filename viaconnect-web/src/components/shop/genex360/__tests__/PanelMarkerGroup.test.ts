// Prompt 193 Task T2 (2026-06-12): contract tests for PanelMarkerGroup.
//
// Source-as-text assertions per the repo convention (environment: 'node', no
// jsdom). These lock the Teal symbol color, the rendered fields (groupTitle,
// symbol, fullName, description), the responsive two column grid, the Lucide
// icon at strokeWidth 1.5, and the no dash rule.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const COMPONENT = path.resolve(__dirname, '..', 'PanelMarkerGroup.tsx');

describe('PanelMarkerGroup source', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('colors the marker symbol Teal #2DA5A0', () => {
    expect(source).toContain('text-[#2DA5A0]');
  });

  it('renders the group title', () => {
    expect(source).toContain('group.groupTitle');
  });

  it('renders the marker symbol, fullName, and description', () => {
    expect(source).toContain('marker.symbol');
    expect(source).toContain('marker.fullName');
    expect(source).toContain('marker.description');
  });

  it('mutes the fullName tone', () => {
    expect(source).toContain('text-white/45');
  });

  it('renders the description in body text', () => {
    expect(source).toContain('text-white/75');
  });

  it('flows markers into a responsive two column grid on desktop', () => {
    expect(source).toContain('md:grid-cols-2');
  });

  it('types the group prop from the data layer PanelMarkerGroup', () => {
    expect(source).toContain('@/data/genex360/types');
  });

  it('uses a Lucide icon at strokeWidth 1.5 (no checkmark glyphs)', () => {
    expect(source).toContain('strokeWidth={1.5}');
    expect(source).not.toContain('✅'); // white heavy check mark
    expect(source).not.toContain('✔'); // heavy check mark
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
