import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function src(rel: string): string {
  return readFileSync(path.join(root, rel), 'utf8');
}

const NEXT_CONFIG = src('next.config.mjs');
const ROOT_NOT_FOUND = src('src/app/not-found.tsx');
const APP_NOT_FOUND = src('src/app/(app)/not-found.tsx');
const APP_CATCH_ALL = src('src/app/(app)/[...notFound]/page.tsx');
const APP_LAYOUT = src('src/app/(app)/layout.tsx');
const MARKETING_404 = src('src/components/not-found/MarketingNotFoundView.tsx');
const APP_404_VIEW = src('src/components/not-found/AppNotFoundView.tsx');
const HELIX_HINT = src('src/components/not-found/HelixAliasHint.tsx');
const ROOT_VERCEL = readFileSync(path.join(root, '..', 'vercel.json'), 'utf8');
const WEB_VERCEL = src('vercel.json');

function redirectBlock(source: string): string {
  const idx = NEXT_CONFIG.indexOf(`source: "${source}"`);
  expect(idx, `missing redirect source ${source}`).toBeGreaterThan(-1);
  return NEXT_CONFIG.slice(idx, idx + 180);
}

describe('Brief 36 Helix 404 chrome and aliases', () => {
  it('redirects /helix-rewards and /rewards to /helix', () => {
    const helixRewards = redirectBlock('/helix-rewards');
    const rewards = redirectBlock('/rewards');
    expect(helixRewards).toContain('destination: "/helix"');
    expect(helixRewards).toContain('permanent: false');
    expect(rewards).toContain('destination: "/helix"');
    expect(rewards).toContain('permanent: false');
    expect(NEXT_CONFIG).not.toContain('destination: "/helix/arena"');
  });

  it('does not add a second Vercel project rewrite for the aliases', () => {
    expect(ROOT_VERCEL).not.toMatch(/helix-rewards|["']\/rewards["']/);
    expect(WEB_VERCEL).not.toMatch(/helix-rewards|["']\/rewards["']/);
    expect(WEB_VERCEL).not.toContain('"rewrites"');
    expect(ROOT_VERCEL).not.toContain('"rewrites"');
  });

  it('signed-in 404 mounts PortalShellRouter / (app) layout, not a chrome-less root-only page', () => {
    expect(APP_LAYOUT).toContain('PortalShellRouter');
    expect(APP_LAYOUT).toContain('AdminPortalDetector');

    expect(APP_NOT_FOUND).toContain('AppNotFoundView');
    expect(APP_NOT_FOUND).not.toContain('Go to Dashboard');
    expect(APP_NOT_FOUND).not.toContain('min-h-screen');
    expect(APP_NOT_FOUND).not.toContain("'use client'");
    expect(APP_CATCH_ALL).toContain("from \"next/navigation\"");
    expect(APP_CATCH_ALL).toContain('notFound()');
    expect(APP_CATCH_ALL).not.toContain("'use client'");

    expect(ROOT_NOT_FOUND).toContain('PortalShellRouter');
    expect(ROOT_NOT_FOUND).toContain('AppNotFoundView');
    expect(ROOT_NOT_FOUND).toContain('MarketingNotFoundView');
    expect(ROOT_NOT_FOUND).toContain('createClient');
    expect(ROOT_NOT_FOUND).not.toContain('bg-cyan-500');
    expect(ROOT_NOT_FOUND).not.toContain('text-cyan-400');
  });

  it('root not-found is never a blank unbranded page', () => {
    expect(MARKETING_404).toContain('ViaConnectLogo');
    expect(MARKETING_404).toContain('Page not found');
    expect(MARKETING_404).toContain('href="/"');
    expect(MARKETING_404).not.toContain('bg-cyan-500');
    expect(ROOT_NOT_FOUND.trim().length).toBeGreaterThan(0);
  });

  it('optional Helix Rewards hint is case-insensitive and Lucide is 1.5', () => {
    expect(HELIX_HINT).toContain('Did you mean Helix Rewards?');
    expect(HELIX_HINT).toContain('shouldSuggestHelixRewards');
    expect(HELIX_HINT).toContain('strokeWidth={1.5}');
    expect(HELIX_HINT).toContain('href="/helix"');
    expect(APP_404_VIEW).toContain('strokeWidth={1.5}');
    expect(APP_404_VIEW).toContain('min-h-[44px]');
    expect(APP_404_VIEW).toContain('sm:flex-row');
    expect(APP_404_VIEW).not.toMatch(/\bas any\b/);
    expect(ROOT_NOT_FOUND).not.toMatch(/\bas any\b/);
    expect(APP_NOT_FOUND).not.toMatch(/\bas any\b/);
  });

  it('does not edit HelixChrome compete copy or consumer-honesty empty strings', () => {
    const chrome = src('src/app/(app)/(consumer)/helix/HelixChrome.tsx');
    const honesty = src('src/lib/helix/consumer-honesty.ts');
    expect(chrome).toContain('Earn');
    expect(chrome).toContain('Compete');
    expect(chrome).toContain('Redeem');
    expect(honesty).toContain('SQUAD_CHAT_EMPTY');
    expect(honesty).toContain('NOT_ENOUGH_DATA');
    expect(honesty).toContain('NOT_ANALYZED');
  });
});
