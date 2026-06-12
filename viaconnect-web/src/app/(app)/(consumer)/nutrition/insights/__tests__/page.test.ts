// Prompt 192 Task 4: source as text contract tests for the /nutrition/insights
// page: the server shell, the client container, and the insight card. Same
// convention as the other nutrition page tests (readFileSync + assert on the
// source). Locks the auth redirect, the back link, the Gordon voiced header,
// the two filter chip rows, the refresh 429 handling, the PATCH based dismiss
// undo flow, the separated product suggestion block, the masonry classes, the
// shared icon map reuse, the fail open fetch posture, and the no dash rule.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const PAGE = path.resolve(__dirname, '..', 'page.tsx');
const COMPONENTS_DIR = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  '..',
  '..',
  'components',
  'nutrition',
  'insights',
);
const CLIENT = path.join(COMPONENTS_DIR, 'InsightsPageClient.tsx');
const CARD = path.join(COMPONENTS_DIR, 'InsightCard.tsx');

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

describe('nutrition/insights/page.tsx server shell', () => {
  const source = readFileSync(PAGE, 'utf-8');

  it('is a server component using the server supabase client with the auth redirect', () => {
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

  it('renders the title and the Gordon voiced subhead through getDisplayName', () => {
    expect(source).toContain('Nutrition Insights');
    expect(source).toContain("import { getDisplayName } from '@/lib/getDisplayName'");
    expect(source).toContain(
      "{getDisplayName('gordon')} reads your week and flags what matters",
    );
    // The display name is never hardcoded and the slug never renders as copy.
    expect(source).not.toMatch(/Gordon/);
  });

  it('mounts the client container on the standard Deep Navy page container', () => {
    expect(source).toContain(
      "import { InsightsPageClient } from '@/components/nutrition/insights/InsightsPageClient'",
    );
    expect(source).toContain('<InsightsPageClient />');
    expect(source).toContain('mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(EM_DASH)).toBe(false);
    expect(source.includes(EN_DASH)).toBe(false);
  });
});

describe('InsightsPageClient source', () => {
  const source = readFileSync(CLIENT, 'utf-8');

  it('is a client component', () => {
    expect(source.startsWith("'use client';")).toBe(true);
  });

  it('renders the scope chips and maps them to the GET params', () => {
    expect(source).toContain("label: 'Today'");
    expect(source).toContain("label: 'This Week'");
    expect(source).toContain("label: 'Saved'");
    // Saved reads status=saved; the two windows read active rows on the
    // daily / weekly horizon.
    expect(source).toContain("params.set('status', 'saved')");
    expect(source).toContain("params.set('status', 'active')");
    expect(source).toContain("scope === 'today' ? 'daily' : 'weekly'");
  });

  it('renders the type chips: All + the eight types with their shared icons', () => {
    expect(source).toContain('label="All"');
    expect(source).toContain("import { INSIGHT_TYPE_ICONS } from './insightIcons'");
    expect(source).toContain('INSIGHT_TYPE_ORDER');
    expect(source).toContain('INSIGHT_TYPE_LABELS');
    expect(source).toContain('icon={INSIGHT_TYPE_ICONS[t]}');
  });

  it('keeps both chip rows horizontally scrollable without wrapping', () => {
    const scrollRows = source.match(/overflow-x-auto/g) ?? [];
    expect(scrollRows.length).toBeGreaterThanOrEqual(2);
    expect(source).toContain('whitespace-nowrap');
    expect(source).not.toContain('flex-wrap');
  });

  it('refresh: POST, disabled in flight, 429 window copy, 202 refetch', () => {
    expect(source).toContain("fetch('/api/nutrition/insights/refresh', { method: 'POST' })");
    expect(source).toContain('disabled={refreshing}');
    expect(source).toContain('res.status === 429');
    expect(source).toContain('retryAfterSeconds');
    expect(source).toContain('formatRetryAfter');
    expect(source).toContain('res.status === 202');
    // 202 means the awaited run finished; the list refetches via reloadKey.
    expect(source).toContain('setReloadKey((k) => k + 1)');
  });

  it('dismiss undo: optimistic removal, PATCH dismissed, 5 second window, undo PATCHes active', () => {
    expect(source).toContain('UNDO_WINDOW_MS = 5_000');
    expect(source).toContain("{ status: 'dismissed' }");
    expect(source).toContain("{ status: 'active' }");
    expect(source).toContain('Insight dismissed');
    expect(source).toContain('onClick={handleUndo}');
    expect(source).toMatch(/>\s*Undo\s*</);
    // PATCH based, never DELETE.
    expect(source).toContain("method: 'PATCH'");
    expect(source).not.toContain("method: 'DELETE'");
  });

  it('save toggles between saved and active, feedback PATCHes the helpful flag', () => {
    expect(source).toContain("insight.status === 'saved' ? 'active' : 'saved'");
    expect(source).toContain('feedback: { helpful }');
  });

  it('lays the cards out as dependency free masonry: CSS columns with break protection', () => {
    expect(source).toContain('columns-1 gap-4 lg:columns-2');
    expect(source).toContain('break-inside-avoid');
  });

  it('renders loading skeletons, the per filter empty state, and the degraded retry', () => {
    expect(source).toContain('animate-pulse');
    expect(source).toContain('Nothing here yet');
    expect(source).toContain('Insights could not load');
    expect(source).toContain('Retry');
    expect(source).toContain('degraded');
  });

  it('every fetch is timeout wrapped, try/caught, and safeLogged (fail open)', () => {
    expect(source).toContain("import { withTimeout } from '@/lib/utils/with-timeout'");
    expect(source).toContain("import { safeLog } from '@/lib/utils/safe-log'");
    const fetches = source.match(/fetch\(/g) ?? [];
    const wrapped = source.match(/withTimeout\(\s*fetch\(/g) ?? [];
    expect(fetches.length).toBe(3);
    expect(wrapped.length).toBe(3);
    const warns = source.match(/safeLog\.warn\(/g) ?? [];
    expect(warns.length).toBe(3);
  });

  it('uses Lucide strokeWidth 1.5 only and no emojis or dashes', () => {
    expect(source).toContain('strokeWidth={1.5}');
    expect(source).not.toContain('strokeWidth={2}');
    expect(source).not.toContain('strokeWidth={1}');
    expect(source.includes(EM_DASH)).toBe(false);
    expect(source.includes(EN_DASH)).toBe(false);
    expect(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(source)).toBe(false);
  });
});

describe('InsightCard source', () => {
  const source = readFileSync(CARD, 'utf-8');

  it('reuses the shared icon map and the pure view helpers', () => {
    expect(source).toContain("import { INSIGHT_TYPE_ICONS } from './insightIcons'");
    expect(source).toContain('relativeTimestamp');
    expect(source).toContain('snapshotToRows');
    // Never raw JSON in the why section.
    expect(source).not.toContain('JSON.stringify(insight.data_snapshot');
  });

  it('renders the confidence chip and the relative timestamp', () => {
    expect(source).toContain('confidence');
    expect(source).toContain('relativeTimestamp(insight.generated_at)');
  });

  it('severity accent: left border + icon tint, Orange for attention ONLY', () => {
    expect(source).toContain("attention: 'border-l-[#B75E18]'");
    expect(source).toContain("positive: 'border-l-[#2DA5A0]'");
    expect(source).toContain("info: 'border-l-white/15'");
    expect(source).toContain("attention: 'text-[#B75E18]'");
    expect(source).toContain("positive: 'text-[#2DA5A0]'");
    // Orange appears exactly twice: the two attention map entries.
    const orange = source.match(/#B75E18/g) ?? [];
    expect(orange.length).toBe(2);
  });

  it('expands Why am I seeing this in flow via framer motion height auto + reduced motion', () => {
    expect(source).toContain('Why am I seeing this');
    expect(source).toContain("from 'framer-motion'");
    expect(source).toContain("height: 'auto'");
    expect(source).toContain('useReducedMotion');
    expect(source).toContain('aria-expanded={expanded}');
  });

  it('renders the product suggestion as a separated block with the shop link', () => {
    expect(source).toContain('insight.product_suggestion ?');
    expect(source).toContain('Related from the shop');
    expect(source).toContain('href={`/shop/product/${insight.product_suggestion.slug}`}');
    expect(source).toContain('insight.product_suggestion.slug ?');
  });

  it('renders the Save / Unsave toggle, Dismiss, and the Helpful vote with thanks', () => {
    expect(source).toContain("{saved ? 'Unsave' : 'Save'}");
    expect(source).toContain('<span>Dismiss</span>');
    expect(source).toContain('ThumbsUp');
    expect(source).toContain('ThumbsDown');
    expect(source).toContain('Thanks');
    expect(source).toContain('Helpful?');
  });

  it('uses Lucide strokeWidth 1.5 only and no emojis or dashes', () => {
    expect(source).toContain('strokeWidth={1.5}');
    expect(source).not.toContain('strokeWidth={2}');
    expect(source).not.toContain('strokeWidth={1}');
    expect(source.includes(EM_DASH)).toBe(false);
    expect(source.includes(EN_DASH)).toBe(false);
    expect(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(source)).toBe(false);
  });
});
