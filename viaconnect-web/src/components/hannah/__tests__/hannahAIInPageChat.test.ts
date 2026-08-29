// Locks HannahAI in-page chat chrome: chip copy, compact popover under
// the Guided by pill, no page-bottom full-width card, sidebar/nav cleanup,
// and dashboard #122 guards.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONSUMER_HANNAH_CHIP } from '@/lib/ui/consumerChrome';

const root = join(process.cwd());

function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const CHIP = 'src/components/hannah/HannahAIGuidedByChip.tsx';
const ADVISOR = 'src/components/advisor/AdvisorChat.tsx';
const STANDALONE = 'src/app/(app)/(consumer)/wellness/advisor/page.tsx';
const SIDEBAR = 'src/components/layout/Sidebar.tsx';
const MOBILE = 'src/components/layout/MobileNavBar.tsx';
const QUICK = 'src/components/dashboard/QuickActionsGrid.tsx';
const DASH = 'src/components/dashboard/ConsumerDashboard.tsx';
const DASH_HEADER = 'src/components/dashboard/DashboardHeader.tsx';
const TABS = 'src/components/peptide-protocol/converter/PeptideEducationTabs.tsx';

const CHIP_OWNERS = [
  'src/components/dashboard/DashboardHeader.tsx',
  'src/components/journey/YourJourneyCoaching.tsx',
  'src/components/genetics/hub/GeneticsHubHeader.tsx',
  'src/components/nutrition/hub/NutritionHubHeader.tsx',
  'src/app/(app)/(consumer)/supplements/SupplementsPageContent.tsx',
  'src/components/body-tracker/hub/BodyTrackerHub.tsx',
  'src/app/(app)/(consumer)/peptide-protocol/page.tsx',
] as const;

const NO_BOTTOM_CARD_SURFACES = [
  'src/components/dashboard/ConsumerDashboard.tsx',
  'src/components/journey/YourJourneyCoaching.tsx',
  'src/components/genetics/hub/GeneticsHub.tsx',
  'src/components/nutrition/hub/NutritionHub.tsx',
  'src/app/(app)/(consumer)/supplements/SupplementsPageContent.tsx',
  'src/components/body-tracker/hub/BodyTrackerHub.tsx',
  'src/app/(app)/(consumer)/peptide-protocol/page.tsx',
  'src/app/(app)/(consumer)/peptide-protocol/suggestions/page.tsx',
] as const;

describe('HannahAIGuidedByChip', () => {
  const chip = src(CHIP);

  it('is a button using getDisplayName that opens a compact popover under the pill', () => {
    expect(chip).toContain('<button');
    expect(chip).toContain("getDisplayName('hannahai')");
    expect(chip).toContain('Guided by {getDisplayName(');
    expect(chip).toContain('hannah-ai-chat');
    expect(chip).toContain('AdvisorChat');
    expect(chip).toMatch(/absolute|fixed/);
    expect(chip).toContain('getBoundingClientRect');
    expect(chip).toContain('max-w-[min(26rem,calc(100vw-2rem))]');
    expect(chip).toContain('rounded-2xl');
    expect(chip).toContain('border-white/[0.08]');
    expect(chip).toContain('#1E3054');
    expect(chip).toContain('backdrop-blur');
    expect(chip).not.toContain('scrollIntoView');
    expect(chip).not.toContain('hub-card-frame');
    expect(chip).not.toMatch(/href=["']\/wellness\/advisor["']/);
    expect(chip).not.toMatch(/className="[^"]*hidden md:inline-flex/);
    expect(chip).toContain('strokeWidth={1.5}');
    expect(chip).not.toContain('Guided by Hannah');
    expect(chip).not.toContain('Guided by HannahAI');
  });

  it('closes on chip toggle, click outside, and Escape', () => {
    expect(chip).toContain('togglePanel');
    expect(chip).toContain('pointerdown');
    expect(chip).toContain("event.key !== 'Escape'");
    expect(chip).toContain('location.hash');
  });

  it('uses a grey/navy frost pill background, not a teal fill', () => {
    expect(chip).toContain('CONSUMER_HANNAH_CHIP');
    expect(chip).toContain("getDisplayName('hannahai')");
    expect(chip).toContain('Guided by {getDisplayName(');
    expect(chip).toContain('className={CONSUMER_HANNAH_CHIP}');
    expect(chip).toContain('strokeWidth={1.5}');
    expect(chip).toContain('max-w-[min(26rem,calc(100vw-2rem))]');
    expect(chip).toContain('text-[#2DA5A0]');
    expect(chip).not.toContain('bg-[#2DA5A0]');
    expect(chip).not.toMatch(/bg-\[#2DA5A0\]/);
    expect(chip).not.toMatch(/from-\[#2DA5A0\]|to-\[#2DA5A0\]|via-\[#2DA5A0\]/);
    expect(chip).not.toMatch(/\bbg-teal|\bbg-cyan/);

    expect(CONSUMER_HANNAH_CHIP).toContain('rounded-full');
    expect(CONSUMER_HANNAH_CHIP).toContain('min-h-[44px]');
    expect(CONSUMER_HANNAH_CHIP).toContain('bg-[#1A2744]/55');
    expect(CONSUMER_HANNAH_CHIP).toContain('border-white/15');
    expect(CONSUMER_HANNAH_CHIP).toContain('backdrop-blur');
    expect(CONSUMER_HANNAH_CHIP).not.toContain('#2DA5A0');
    expect(CONSUMER_HANNAH_CHIP).not.toContain('bg-[#2DA5A0]');
    expect(CONSUMER_HANNAH_CHIP).not.toMatch(/bg-\[#2DA5A0\]/);
    expect(CONSUMER_HANNAH_CHIP).not.toMatch(/from-\[#2DA5A0\]|to-\[#2DA5A0\]|via-\[#2DA5A0\]/);
    expect(CONSUMER_HANNAH_CHIP).not.toMatch(/\bbg-teal|\bbg-cyan/);
    expect(CONSUMER_HANNAH_CHIP).not.toContain('bg-white/[0.04]');
  });
});

describe('compact AdvisorChat popover chrome', () => {
  const chip = src(CHIP);
  const advisor = src(ADVISOR);
  const standalone = src(STANDALONE);

  it('wraps AdvisorChat as an embedded consumer popover', () => {
    expect(chip).toContain('embedded');
    expect(chip).toContain('role="consumer"');
    expect(chip).toContain('accentColor={ACCENT}');
    expect(chip).toContain('#2DA5A0');
    expect(chip).toContain("getDisplayName('hannahai')");
    expect(chip).toContain('HANNAH_CONSUMER_SUBTITLE');
    expect(chip).toContain('How can I improve my Bio Optimization Score?');
    expect(chip).toContain('Should I take my supplements with food?');
    expect(chip).toContain('What does my MTHFR result mean?');
    expect(chip).toContain('Which genetic test should I take next?');
  });

  it('AdvisorChat supports compact embedded height without changing the standalone page', () => {
    expect(advisor).toContain('embedded?: boolean');
    expect(advisor).toContain('embedded = false');
    expect(advisor).toContain('h-[380px]');
    expect(advisor).toContain('max-h-[440px]');
    expect(advisor).not.toContain('h-[min(520px,70vh)]');
    expect(advisor).not.toContain('min-h-[420px]');
    expect(advisor).toContain('h-[calc(100vh-64px)]');
    expect(standalone).not.toContain('embedded');
    expect(standalone).toContain('<AdvisorChat');
  });
});

describe('seven hubs use the chip and do not mount a page-bottom HannahAIChatCard', () => {
  it.each(CHIP_OWNERS)('imports and renders HannahAIGuidedByChip on %s', (rel) => {
    const file = src(rel);
    expect(file).toContain('HannahAIGuidedByChip');
    expect(file).toMatch(/import \{ HannahAIGuidedByChip \}/);
    expect(file).toContain('<HannahAIGuidedByChip');
  });

  it.each(NO_BOTTOM_CARD_SURFACES)('does not mount HannahAIChatCard on %s', (rel) => {
    const file = src(rel);
    expect(file).not.toContain('HannahAIChatCard');
    expect(file).not.toContain('<HannahAIChatCard');
  });

  it('NutritionHubHeader has only the HannahAI chip, no Gordon owner pill', () => {
    const file = src('src/components/nutrition/hub/NutritionHubHeader.tsx');
    expect(file).toContain('<HannahAIGuidedByChip');
    expect(file).not.toContain("getDisplayName('gordon')");
    expect(file).not.toContain('Guided by Gordon');
    expect(file).not.toContain('Guided by {getDisplayName(');
  });

  it('BodyTrackerHub has only the HannahAI chip, no Arnold owner pill', () => {
    const file = src('src/components/body-tracker/hub/BodyTrackerHub.tsx');
    expect(file).toContain('<HannahAIGuidedByChip');
    expect(file).not.toContain("getDisplayName('arnold')");
    expect(file).not.toContain('Guided by Arnold');
    expect(file).not.toContain('Guided by Gordon');
    expect(file).not.toContain('Guided by {getDisplayName(');
  });

  it('Supplements places HannahAI chip on the title row, not glued to ProtocolConfidenceBadge', () => {
    const file = src(
      'src/app/(app)/(consumer)/supplements/SupplementsPageContent.tsx',
    );
    expect(file).toContain('<HannahAIGuidedByChip');
    expect(file).toContain('<ProtocolConfidenceBadge');
    expect(file).toContain('Your personalized daily regimen: Daily Schedule');
    expect(file).not.toMatch(
      /HannahAIGuidedByChip[\s\S]{0,120}ProtocolConfidenceBadge/,
    );
  });

  it('keeps PeptideSuggestionsClient on peptide suggestions with the chip only', () => {
    const suggestions = src(
      'src/app/(app)/(consumer)/peptide-protocol/suggestions/page.tsx',
    );
    expect(suggestions).toContain('HannahAIGuidedByChip');
    expect(suggestions).toContain('<HannahAIGuidedByChip');
    expect(suggestions).not.toContain('HannahAIChatCard');
    expect(suggestions).toContain('PeptideSuggestionsClient');
    expect(suggestions).toContain('<PeptideSuggestionsClient');
  });
});

describe('consumer chrome no longer lists /wellness/advisor', () => {
  it('consumer Sidebar has no Hannah AI Wellness Assistant nav item', () => {
    const sidebar = src(SIDEBAR);
    expect(sidebar).not.toContain('Hannah AI Wellness Assistant');
    expect(sidebar).not.toContain('href: "/wellness/advisor"');
    expect(sidebar).not.toContain("href: '/wellness/advisor'");
    expect(sidebar).toContain('href: "/practitioner/advisor"');
    expect(sidebar).toContain('href: "/naturopath/advisor"');
  });

  it('MobileNavBar drops the leftover consumer advisor href', () => {
    const mobile = src(MOBILE);
    expect(mobile).not.toContain('/wellness/advisor');
    expect(mobile).not.toContain('Hannah AI Wellness Assistant');
  });

  it('QuickActionsGrid no longer links to /wellness/advisor', () => {
    const quick = src(QUICK);
    expect(quick).not.toContain('/wellness/advisor');
    expect(quick).toContain('/dashboard#hannah-ai-chat');
    expect(quick).toContain("getDisplayName('hannahai')");
  });

  it('PeptideEducationTabs uses getDisplayName(hannahai) not hardcoded Hannah', () => {
    const tabs = src(TABS);
    expect(tabs).toContain("getDisplayName('hannahai')");
    expect(tabs).not.toContain("label: 'Hannah'");
    expect(tabs).not.toContain('label: "Hannah"');
  });
});

describe('ConsumerDashboard #122 locks stay intact', () => {
  it('still has no /admin/jeffery and no Connections HomeBeat bar', () => {
    const dash = src(DASH);
    expect(dash).not.toContain('/admin/jeffery');
    expect(dash).not.toContain('HomeBeatEntry');
    expect(dash).not.toContain('beat="connections"');
    expect(dash).not.toContain('Jeffery™ Command Center');
    expect(dash).not.toContain('HannahAIChatCard');
    expect(src(DASH_HEADER)).toContain('<HannahAIGuidedByChip');
  });
});
