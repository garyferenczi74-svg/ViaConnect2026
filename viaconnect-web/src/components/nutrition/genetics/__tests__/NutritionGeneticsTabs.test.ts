// Prompt 187 Task 4 (2026-06-11): source as text contract tests for the
// Nutrition by Genetics tabs container, the NutritionTabs paramKey
// generalization (additive, default preserving), and the Tab 1 scaffold.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const CONTAINER = path.resolve(__dirname, '..', 'NutritionGeneticsTabs.tsx');
const TABS = path.resolve(__dirname, '..', '..', 'NutritionTabs.tsx');
const TAB1 = path.resolve(__dirname, '..', 'NutrigenDxResultsTab.tsx');

describe('NutritionGeneticsTabs source', () => {
  const source = readFileSync(CONTAINER, 'utf-8');

  it('is a client component reusing the shared NutritionTabs shell', () => {
    expect(source.startsWith("'use client';")).toBe(true);
    expect(source).toContain("from '@/components/nutrition/NutritionTabs'");
    expect(source).toContain('<NutritionTabs');
  });

  it('declares the three primary tabs with the locked ids and labels', () => {
    expect(source).toContain("{ id: 'nutrigendx', label: 'NutrigenDX Results' }");
    expect(source).toContain("{ id: 'upload', label: 'Upload Your Nutrition Testing' }");
    expect(source).toContain("{ id: 'recommendations', label: 'Nutrition Recommendations' }");
  });

  it('defaults to recommendations when either source has findings, else upload', () => {
    expect(source).toContain(
      "const defaultTab = hasNutrigenDx || hasUploaded ? 'recommendations' : 'upload';",
    );
  });

  it('labels each tabpanel by its tab button id, never a duplicate aria-label', () => {
    expect(source).toContain('aria-labelledby="ntab-tab-nutrigendx"');
    expect(source).toContain('aria-labelledby="ntab-tab-upload"');
    expect(source).toContain('aria-labelledby="ntab-tab-recommendations"');
    // No panel carries its own aria-label attribute (aria-labelledby only).
    expect(source).not.toMatch(/aria-label=/);
    // The primary tablist gets a label distinct from the shared default.
    expect(source).toContain('ariaLabel="Nutrition by Genetics sections"');
  });

  it('mounts each tab on first activation and keeps it alive hidden (no refetch on toggle)', () => {
    const hiddenPanels = source.match(/hidden=\{active !== /g) ?? [];
    expect(hiddenPanels.length).toBe(3);
    expect(source).toContain('visited');
    expect(source).toContain('<NutrigenDxResultsTab');
    expect(source).toContain('<UploadNutritionTestTab');
    expect(source).toContain('<NutritionRecommendationsTab');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});

describe('NutritionTabs paramKey generalization', () => {
  const source = readFileSync(TABS, 'utf-8');

  it('adds an optional paramKey prop defaulting to tab (default preserving)', () => {
    expect(source).toContain('paramKey?: string');
    expect(source).toContain("paramKey = 'tab'");
    // Both hooks take the key with the same default so existing callers that
    // pass nothing keep the ?tab= behavior byte for byte.
    expect(source).toContain("paramKey: string = 'tab'");
  });

  it('reads and writes the URL through the paramKey, not a hardcoded tab', () => {
    expect(source).toContain('params?.get(paramKey)');
    expect(source).toContain('next.set(paramKey, tabId)');
    expect(source).not.toContain("params?.get('tab')");
    expect(source).not.toContain("next.set('tab'");
  });

  it('adds an optional ariaLabel prop defaulting to Nutrition view (default preserving)', () => {
    expect(source).toContain('ariaLabel?: string');
    expect(source).toContain("ariaLabel = 'Nutrition view'");
    expect(source).toContain('aria-label={ariaLabel}');
    expect(source).not.toContain('aria-label="Nutrition view"');
  });

  it('gives every tab button a stable id derived from paramKey and tab id', () => {
    expect(source).toContain('id={`ntab-${paramKey}-${t.id}`}');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});

describe('NutrigenDxResultsTab wired source', () => {
  const source = readFileSync(TAB1, 'utf-8');

  it('keeps pending and empty states and loads live NutrigenDX cross-ref', () => {
    expect(source).toContain('nutrigenDxPending');
    expect(source).toContain('Your NutrigenDX results are processing');
    expect(source).toContain('No NutrigenDX results yet');
    expect(source).toContain('/api/nutrition/genetics/nutrigendx');
    expect(source).toContain('resultSet.markers');
  });

  it('references the Prompt 188 NutrigenDxResultSet contract', () => {
    expect(source).toContain('NutrigenDxResultSet');
  });

  it('hands off to the Upload tab and keeps the two quiet legacy links', () => {
    expect(source).toContain("setTab('upload')");
    expect(source).toContain('Have results from another company? Upload them here.');
    expect(source).toContain('href="/genetics"');
    expect(source).toContain('See NutrigenDX panels');
    expect(source).toContain('href="/nutrition/guide"');
    expect(source).toContain('Review Nutrition Results');
  });

  it('uses Lucide strokeWidth 1.5 and the card surface token', () => {
    expect(source).toContain('strokeWidth={1.5}');
    expect(source).toContain('bg-[#1E3054]');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
