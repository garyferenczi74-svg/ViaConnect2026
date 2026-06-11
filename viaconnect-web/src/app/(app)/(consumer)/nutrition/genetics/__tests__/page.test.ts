// Prompt 187 Task 4 (2026-06-11): source as text contract test for the
// /nutrition/genetics server shell. Same convention as the other nutrition
// page tests (readFileSync + assert on the source). Locks the server
// component posture, the back link, the header copy, the active-source pill
// labels, the three fail open status reads (timeout wrapped, safeLog, treated
// as absent on error), the booleans handed to the client container, and the
// no dash rule.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const PAGE = path.resolve(__dirname, '..', 'page.tsx');

describe('nutrition/genetics/page.tsx', () => {
  const source = readFileSync(PAGE, 'utf-8');

  it('is a server component using the server supabase client', () => {
    expect(source.startsWith("'use client'")).toBe(false);
    expect(source).toContain("import { createClient } from '@/lib/supabase/server'");
    expect(source).toContain('supabase.auth.getUser()');
    expect(source).toContain("redirect('/login')");
  });

  it('renders the back link above the header', () => {
    expect(source).toContain(
      "import { BackToNutritionLink } from '@/components/nutrition/hub/BackToNutritionLink'",
    );
    expect(source).toContain('<BackToNutritionLink />');
  });

  it('renders the header copy and the active-source status pill', () => {
    expect(source).toContain('Nutrition by Genetics');
    expect(source).toContain(
      'Your genetic blueprint, translated into what to eat and what to limit.',
    );
    // Pill precedence: NutrigenDX, then Uploaded Test, then No Results Yet.
    expect(source).toContain(
      "hasNutrigenDx ? 'NutrigenDX' : hasUploaded ? 'Uploaded Test' : 'No Results Yet'",
    );
    // Teal accent when results exist, white/10 chip otherwise.
    expect(source).toContain("'border-[#2DA5A0]/40 bg-[#2DA5A0]/10");
    expect(source).toContain("'border-white/10 bg-white/[0.04]");
  });

  it('preloads the three source-status booleans with fail open reads', () => {
    // Findings head counts per source, active rows only.
    expect(source).toContain("from('nutrition_genetic_findings')");
    expect(source).toContain("{ count: 'exact', head: true }");
    expect(source).toContain(".eq('source', source)");
    expect(source).toContain("'nutrigendx'");
    expect(source).toContain("'uploaded_test'");
    expect(source).toContain(".is('superseded_at', null)");
    // Pending NutrigenDX: undelivered purchase in a paid-ish state, read
    // defensively over the payment_status values.
    expect(source).toContain("from('genex360_purchases')");
    expect(source).toContain(".is('test_results_delivered_at', null)");
    expect(source).toContain("['paid', 'succeeded', 'completed']");
    expect(source).toContain('.toLowerCase()');
  });

  it('every read is timeout wrapped, try/caught, and safeLogged, failing to absent', () => {
    expect(source).toContain("import { withTimeout } from '@/lib/utils/with-timeout'");
    expect(source).toContain("import { safeLog } from '@/lib/utils/safe-log'");
    expect(source).toContain('4_000');
    expect(source).toContain('catch');
    expect(source).toContain('return false;');
    // No empty catch swallows anything silently.
    expect(source).not.toMatch(/catch\s*(\([^)]*\))?\s*\{\s*\}/);
    const catches = source.match(/\} catch/g) ?? [];
    const warns = source.match(/safeLog\.warn\(/g) ?? [];
    expect(warns.length).toBeGreaterThanOrEqual(catches.length);
  });

  it('passes userId and the three booleans to the client tabs container', () => {
    expect(source).toContain(
      "import { NutritionGeneticsTabs } from '@/components/nutrition/genetics/NutritionGeneticsTabs'",
    );
    expect(source).toContain('userId={user.id}');
    expect(source).toContain('hasNutrigenDx={hasNutrigenDx}');
    expect(source).toContain('hasUploaded={hasUploaded}');
    expect(source).toContain('nutrigenDxPending={nutrigenDxPending}');
    // The container reads useSearchParams, so it sits under Suspense.
    expect(source).toContain('<Suspense');
  });

  it('uses the standard page container on the Deep Navy page', () => {
    expect(source).toContain('mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
