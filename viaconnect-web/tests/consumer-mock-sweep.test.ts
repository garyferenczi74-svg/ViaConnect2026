import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const webRoot = process.cwd();
const repoRoot = join(webRoot, '..');

function src(rel: string): string {
  return readFileSync(join(webRoot, rel), 'utf8');
}

function mobile(rel: string): string {
  return readFileSync(join(repoRoot, 'viaconnect-mobile', rel), 'utf8');
}

const CONSUMER_SURFACES = [
  'src/app/(app)/(consumer)/helix/layout.tsx',
  'src/app/(app)/(consumer)/helix/HelixChrome.tsx',
  'src/app/(app)/(consumer)/helix/arena/page.tsx',
  'src/app/(app)/(consumer)/helix/challenges/page.tsx',
  'src/app/(app)/(consumer)/helix/earn/page.tsx',
  'src/app/(app)/(consumer)/helix/redeem/page.tsx',
  'src/app/(app)/(consumer)/helix/refer/page.tsx',
  'src/app/(app)/(consumer)/helix/research/page.tsx',
  'src/app/(app)/(consumer)/alerts/page.tsx',
  'src/app/(app)/(consumer)/plugins/manage/page.tsx',
  'src/components/dashboard/HealthSnapshot.tsx',
  'src/components/community/PatternCirclePreview.tsx',
  'src/components/helix/ChallengeCard.tsx',
  'src/components/dashboard/accuracy-pill.tsx',
] as const;

const FORBIDDEN = [
  'Sarah K.',
  'Mike R.',
  'Marcus T.',
  'Jessica L.',
  'David T.',
  'Amanda W.',
  'Chris P.',
  'GARY-VIA-2026',
  'IL-6 GG',
  'TNF-alpha GA',
  'ACTN3 XX',
  'MTHFR CT',
  'MTR AA',
  'Apple Watch S9',
  'Garmin Venu 3',
  'Oura Ring Gen 3',
  '612,000 SNPs',
  '23 biomarkers extracted',
  'Quest Diagnostics',
  '8,432',
  '8432',
  '247 members',
  '183 members',
  '156 members',
  '201 members',
  'Sleep quality improved 12%',
  'USER_BALANCE = 4350',
  'const USER_RANK = 2',
  'Champion',
] as const;

describe('Brief 15b consumer mock sweep', () => {
  it('cannot render staged helix rivals, 4350, or Champion theater', () => {
    const joined = CONSUMER_SURFACES.map((rel) => src(rel)).join('\n');
    for (const token of FORBIDDEN) {
      expect(joined).not.toContain(token);
    }
    expect(src('src/app/(app)/(consumer)/helix/HelixChrome.tsx')).toContain('helixTierFromPoints');
    expect(src('src/app/(app)/(consumer)/helix/HelixChrome.tsx')).toContain('formatHelixRank');
    expect(src('src/app/(app)/(consumer)/helix/arena/page.tsx')).toContain('SQUAD_CHAT_EMPTY');
    expect(src('src/app/(app)/(consumer)/helix/layout.tsx')).not.toContain('4350');
    expect(src('src/app/(app)/(consumer)/helix/HelixChrome.tsx')).not.toContain('4350');
    expect(src('src/app/(app)/(consumer)/helix/earn/page.tsx')).toContain('useHelixEarnCatalog');
    expect(src('src/hooks/useHelixEarnCatalog.ts')).toContain('helix_earning_event_types');
    expect(src('src/hooks/useHelixEarnCatalog.ts')).toContain('helix_transactions');
    expect(src('src/app/(app)/(consumer)/helix/earn/page.tsx')).not.toContain('+25/day');
    expect(src('src/app/(app)/(consumer)/helix/redeem/page.tsx')).toContain('/api/helix/redemption-catalog');
    expect(src('src/app/(app)/(consumer)/helix/research/page.tsx')).toContain('RESEARCH_EMPTY');
    expect(src('src/app/(app)/(consumer)/helix/research/page.tsx')).not.toContain('Enroll Now');
  });

  it('alerts is empty / Not analyzed without a genotype+biometric script', () => {
    const alerts = src('src/app/(app)/(consumer)/alerts/page.tsx');
    expect(alerts).toContain('Not analyzed');
    expect(alerts).toContain('Not enough data');
    expect(alerts).not.toContain('Early illness signals detected');
    expect(alerts).not.toContain('HRV dropped');
    expect(alerts).not.toContain('RELAX+');
  });

  it('plugins/manage does not invent MyFitnessPal, Strava, Quest, or 23andMe rows', () => {
    const manage = src('src/app/(app)/(consumer)/plugins/manage/page.tsx');
    expect(manage).toContain('/body-tracker/connections');
    expect(manage).toContain('/plugins/apps');
    expect(manage).not.toContain('MyFitnessPal');
    expect(manage).not.toContain('Strava');
    expect(manage).not.toContain('23andMe');
    expect(manage).not.toContain('Quest Diagnostics');
    expect(manage).not.toContain('1 hr ago');
    expect(manage).not.toContain('Last full sync');
    expect(manage).not.toContain('Force Sync Now');
  });

  it('HealthSnapshot cannot render Sleep 92 / HRV 78 / steps 8432', () => {
    const snap = src('src/components/dashboard/HealthSnapshot.tsx');
    expect(snap).toContain('Not enough data');
    expect(snap).not.toContain("'92'");
    expect(snap).not.toContain("'78'");
    expect(snap).not.toContain('8,432');
    expect(snap).not.toContain('Optimal');
  });

  it('Pattern Circles have no fake member counts and Notify Me is waitlist-only', () => {
    const circles = src('src/components/community/PatternCirclePreview.tsx');
    expect(circles).toContain('Notify Me');
    expect(circles).toContain('Coming soon. Notify Me does not join a live circle.');
    expect(circles).toContain('CIRCLES_EMPTY');
    expect(circles).not.toContain('memberCount');
    expect(circles).not.toContain('247');
    expect(circles).not.toContain('Adrenal Support Circle');
    expect(src('src/app/(app)/(consumer)/dashboard/page.tsx')).toContain('userPatterns={[]}');
  });

  it('does not invent last-sync and does not reopen WearableDashboard', () => {
    const manage = src('src/app/(app)/(consumer)/plugins/manage/page.tsx');
    expect(manage).not.toContain('5 minutes ago');
    expect(manage).not.toContain('WearableDashboardPage');
    expect(src('src/lib/body-tracker/last-sync-state.ts')).toContain('LAST_SYNC_KINDS');
    expect(src('src/lib/body-tracker/last-sync-state.ts')).toContain('resolveLastSyncState');
  });

  it('Expo Home cannot render leftover SKUs, Vitality 87, or COMT 12% insights', () => {
    const home = mobile('app/(consumer)/index.tsx');
    expect(home).toContain('Not enough data');
    expect(home).toContain('Not analyzed');
    expect(home).not.toContain('Vitality Score');
    expect(home).not.toContain('COMT+');
    expect(home).not.toContain('FOCUS+');
    expect(home).not.toContain('Sleep quality improved 12%');
    expect(home).not.toContain("w-[87%]");
  });

  it('Expo Helix cannot render 4350, Sarah K, or GARY-VIA-2026', () => {
    const joined = [
      mobile('src/components/consumer/helix/HelixHero.tsx'),
      mobile('src/components/consumer/helix/HelixArena.tsx'),
      mobile('src/components/consumer/helix/HelixChallenges.tsx'),
      mobile('src/components/consumer/helix/HelixEarn.tsx'),
      mobile('src/components/consumer/helix/HelixRedeem.tsx'),
      mobile('src/components/consumer/helix/HelixRefer.tsx'),
      mobile('src/components/consumer/helix/HelixResearch.tsx'),
    ].join('\n');
    expect(joined).not.toContain('4350');
    expect(joined).not.toContain('Sarah K.');
    expect(joined).not.toContain('Mike R.');
    expect(joined).not.toContain('GARY-VIA-2026');
    expect(joined).not.toContain('Just hit 4K Helix');
    expect(joined).toContain('Not enough data');
  });
});
