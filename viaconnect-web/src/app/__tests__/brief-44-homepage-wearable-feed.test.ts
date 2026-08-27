import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function src(rel: string): string {
  return readFileSync(path.join(root, rel), 'utf8');
}

function sha256(rel: string): string {
  return createHash('sha256').update(readFileSync(path.join(root, rel))).digest('hex');
}

function walkFiles(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, acc);
    else acc.push(full);
  }
  return acc;
}

const HANNAH_LINE =
  "Connect a device when it's available. Coming soon stays Coming soon. Missing stays UNKNOWN.";

const FEATURE_CARDS = src('src/components/landing/scroll-sections/shared/featureCards.ts');
const HOME_PAGE = src('src/app/page.tsx');
const FEATURES_DESKTOP = src(
  'src/components/landing/scroll-sections/desktop/FeaturesSectionDesktop.tsx',
);
const FEATURES_MOBILE = src(
  'src/components/landing/scroll-sections/mobile/FeaturesSectionMobile.tsx',
);

const LANDING_AND_HOME_SOURCES = [
  HOME_PAGE,
  FEATURE_CARDS,
  FEATURES_DESKTOP,
  FEATURES_MOBILE,
  ...walkFiles(path.join(root, 'src/components/landing')).map((file) =>
    readFileSync(file, 'utf8'),
  ),
  ...walkFiles(path.join(root, 'src/components/home')).map((file) => readFileSync(file, 'utf8')),
].join('\n');

// SHA-256 of in-app Connections wearable-tile files.
// Brief 56 already moved tiles/surface/panel off 4a13c3de; Brief 57
// refreshes ConnectionsBosDial to the Daily Scores plasma construction.
const CONNECTIONS_WEARABLE_TILE_HASHES: Record<string, string> = {
  'src/lib/body-tracker/wearable-tiles.ts':
    '016ebf45036060aa586d7193f588ed69d0d119b87a27a03a69c4bda3c32361a6',
  'src/components/body-tracker/connections/WearableTileCard.tsx':
    'bf0176d880a66d0693858c03802cfdd840c817da345dc1d864cb3d877d19b3b1',
  'src/components/body-tracker/connections/ConnectionsSurface.tsx':
    '7549cc3d57526dd4789a1a7e287051941b80e306e0406455bddebbdfc44a93aa',
  'src/components/body-tracker/connections/ConnectionsBosDial.tsx':
    '007b0baceb4c9ef8ce5c1641356a59f59b0c52dfdcd0fac0b72f7f2bba5b74d9',
  'src/components/body-tracker/connections/ScoreDetailPanel.tsx':
    'c5ac8ebc597ab927e63a4b968d27fa52efc25b119f311c963a4864eaaa8803be',
  'src/hooks/useWearableTilesSnapshot.ts':
    'd29ded22c62d654de85e0613ef7ac9944b8cd3b51191977b36047e7378e698a7',
};

describe('Brief 44 homepage stops promising automatic wearable feed', () => {
  it('rewrites the Wellness Analytics card off automatic-feed claims', () => {
    expect(FEATURE_CARDS).not.toMatch(/feed it automatically/i);
    expect(FEATURE_CARDS).not.toMatch(/fed by every device/i);
    expect(FEATURE_CARDS).not.toMatch(/feed(?:s|ing)? (?:it|the score) automatically/i);
    expect(FEATURE_CARDS).not.toContain(
      'Wearables, labs, and connected tools feed it automatically',
    );
    expect(HOME_PAGE).not.toMatch(/feed it automatically/i);
    expect(HOME_PAGE).not.toMatch(/fed by every device/i);
    expect(LANDING_AND_HOME_SOURCES).not.toMatch(/feed it automatically/i);
    expect(LANDING_AND_HOME_SOURCES).not.toMatch(/fed by every device/i);
  });

  it("includes Hannah's locked device-honesty line on teaser and body", () => {
    expect(FEATURE_CARDS).toContain(HANNAH_LINE);
    const wellnessBlock = FEATURE_CARDS.slice(
      FEATURE_CARDS.indexOf("id: 'wellness-analytics'"),
      FEATURE_CARDS.indexOf("id: 'peptide-protocols'"),
    );
    expect(wellnessBlock).toContain(`teaser: "${HANNAH_LINE}"`);
    expect(wellnessBlock).toContain(`"${HANNAH_LINE}"`);
    expect(wellnessBlock.split(HANNAH_LINE).length - 1).toBeGreaterThanOrEqual(2);
    expect(FEATURES_DESKTOP).toContain('card.body');
    expect(FEATURES_MOBILE).toContain('feature.teaser');
    expect(FEATURES_MOBILE).toContain('feature.body');
  });

  it('does not add Whoop / Oura / Google / Garmin Connect CTAs on the homepage', () => {
    const comingSoonConnect = [
      /Connect(?:\s+your)?\s+Whoop/i,
      /Connect(?:\s+your)?\s+Oura/i,
      /Connect(?:\s+your)?\s+Garmin/i,
      /Connect(?:\s+your)?\s+Google(?:\s+Health)?/i,
      /Whoop[\s\S]{0,80}Connect/i,
      /Oura[\s\S]{0,80}Connect/i,
      /Garmin[\s\S]{0,80}Connect/i,
      /Google Health[\s\S]{0,80}Connect/i,
    ];
    for (const pattern of comingSoonConnect) {
      expect(LANDING_AND_HOME_SOURCES).not.toMatch(pattern);
    }
    expect(LANDING_AND_HOME_SOURCES).not.toMatch(/\bWhoop\b/);
    expect(LANDING_AND_HOME_SOURCES).not.toMatch(/\bOura\b/);
    expect(LANDING_AND_HOME_SOURCES).not.toMatch(/\bGarmin\b/);
    expect(LANDING_AND_HOME_SOURCES).not.toMatch(/Google Health/);
  });

  it('leaves in-app Connections wearable-tile files frozen at Brief 57', () => {
    for (const [rel, expected] of Object.entries(CONNECTIONS_WEARABLE_TILE_HASHES)) {
      expect(sha256(rel), rel).toBe(expected);
    }
  });

  it('does not introduce TypeScript any or package.json edits', () => {
    expect(FEATURE_CARDS).not.toMatch(/\bas any\b/);
    expect(src('src/app/__tests__/brief-44-homepage-wearable-feed.test.ts')).not.toMatch(
      /\bas any\b/,
    );
    expect(sha256('package.json')).toBe(
      '063e568f5cfd91d78c94ad76f1d3c59a048f59bd5eea540af8c3e037a9bdec7d',
    );
  });
});
