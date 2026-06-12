// Prompt 192 Task 4: source as text contract tests for the Nutrition
// Insights hub tile. Locks the navigation tile posture (Link to the
// standalone page, right chevron), the HubTile chrome replication (CardMedia
// seam, scrim, hub-card-frame ring), the four states' copy, the Gordon
// attribution through getDisplayName, the 191 glass recipe on the state
// body, the fail open fetch posture, the count chip helper, the shared icon
// map, and the attention-only orange accent.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const TILE = path.resolve(__dirname, '..', 'NutritionInsightsTile.tsx');

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

describe('NutritionInsightsTile source', () => {
  const source = readFileSync(TILE, 'utf-8');

  it('is a client component', () => {
    expect(source.startsWith("'use client';")).toBe(true);
  });

  it('is a navigation tile: bottom anchored Open Links to /nutrition/insights', () => {
    expect(source).toContain("import Link from 'next/link'");
    expect(source).toContain('href="/nutrition/insights"');
    expect(source).toContain('<span>Open</span>');
    expect(source).toContain('ChevronRight');
    expect(source).toContain('mt-auto flex pt-4');
    // A navigation tile, not an expander.
    expect(source).not.toContain('aria-expanded');
    expect(source).not.toContain('onToggle');
  });

  it('keeps the hub card chrome: CardMedia seam, scrim, hub-card-frame ring', () => {
    expect(source).toContain("import { CardMedia } from '@/components/body-tracker/hub/CardMedia'");
    expect(source).toContain("import '@/components/body-tracker/hub/hub-card-frame.css'");
    expect(source).toContain('hub-card-frame relative isolate flex min-h-[200px]');
    expect(source).toContain('<CardMedia media={media} logKey={mediaLogKey} />');
    expect(source).toContain("<CardMedia media={{ kind: 'gradient', gradientClass }} />");
    expect(source).toContain('from-[#1A2744]/85 via-[#1A2744]/30 to-transparent');
    // The media descriptor arrives as props from the hub; no URL or media
    // kind beyond the gradient fallback is inlined here.
    expect(source).toContain('media?: SurfaceMedia');
    expect(source).toContain('mediaLogKey?: string');
    expect(source).not.toContain('https://');
  });

  it('renders the four states: getting started, populated, empty, degraded', () => {
    // 1. Getting Started (cold start wins, failing toward it).
    expect(source).toContain('coldStart?: boolean');
    expect(source).toContain(
      "Log a few meals and {getDisplayName('gordon')} will start finding patterns",
    );
    // 2. populated: top insight title + one line body clamp + count chip.
    expect(source).toContain('topInsight');
    expect(source).toContain('line-clamp-1');
    expect(source).toContain('activeCountChip');
    // 3. empty.
    expect(source).toContain("You're on track, nothing needs attention");
    // 4. degraded / error, never blocking the hub.
    expect(source).toContain('Insights are taking a moment, check back soon');
    expect(source).toContain('degraded');
  });

  it('attributes Gordon only through getDisplayName, never a hardcoded name', () => {
    expect(source).toContain("import { getDisplayName } from '@/lib/getDisplayName'");
    expect(source).toContain("getDisplayName('gordon')");
    // The display name is never hardcoded and the slug never renders as copy.
    expect(source).not.toMatch(/Gordon/);
  });

  it('sits the state body on the 191 glass recipe', () => {
    expect(source).toContain("import { GLASS_TIER2_BODY } from './glass'");
    expect(source).toContain('${GLASS_TIER2_BODY}');
  });

  it('fetches once with the fail open posture: withTimeout 4000 + try/catch + one warn', () => {
    expect(source).toContain("import { withTimeout } from '@/lib/utils/with-timeout'");
    expect(source).toContain("import { safeLog } from '@/lib/utils/safe-log'");
    expect(source).toContain('4_000');
    const fetches = source.match(/fetch\(/g) ?? [];
    expect(fetches.length).toBe(1);
    // The single fetch sits inside the withTimeout race; no unguarded fetch.
    expect(source).toMatch(/withTimeout\(\s*fetch\(/);
    expect(source).toContain("'/api/nutrition/insights?limit=3&status=active'");
    expect(source).toContain('} catch');
    const warns = source.match(/safeLog\.warn\(/g) ?? [];
    expect(warns.length).toBe(1);
  });

  it('opens no write path', () => {
    expect(source).not.toMatch(/method:\s*['"](POST|PATCH|DELETE|PUT)['"]/i);
    expect(source).not.toContain('.insert(');
    expect(source).not.toContain('.update(');
    expect(source).not.toContain('.delete(');
  });

  it('severity accent: Orange for attention ONLY, teal otherwise', () => {
    expect(source).toContain(
      "top.severity === 'attention' ? 'text-[#B75E18]' : 'text-[#2DA5A0]'",
    );
    // Orange appears exactly once: the attention branch.
    const orange = source.match(/#B75E18/g) ?? [];
    expect(orange.length).toBe(1);
  });

  it('reuses the shared icon map and pure view helpers', () => {
    expect(source).toContain(
      "import { INSIGHT_TYPE_ICONS } from '@/components/nutrition/insights/insightIcons'",
    );
    expect(source).toContain("from '@/components/nutrition/insights/insightsView'");
  });

  it('uses Lucide strokeWidth 1.5 only', () => {
    expect(source).toContain('strokeWidth={1.5}');
    expect(source).not.toContain('strokeWidth={2}');
    expect(source).not.toContain('strokeWidth={1}');
  });

  it('contains no em or en dashes and no emojis', () => {
    expect(source.includes(EM_DASH)).toBe(false);
    expect(source.includes(EN_DASH)).toBe(false);
    expect(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(source)).toBe(false);
  });
});
