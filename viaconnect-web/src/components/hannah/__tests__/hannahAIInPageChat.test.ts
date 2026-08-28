// Locks HannahAI in-page chat chrome: chip copy, embedded AdvisorChat card
// on seven consumer hubs, sidebar/nav cleanup, and dashboard #122 guards.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(process.cwd());

function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const CHIP = 'src/components/hannah/HannahAIGuidedByChip.tsx';
const CARD = 'src/components/hannah/HannahAIChatCard.tsx';
const ADVISOR = 'src/components/advisor/AdvisorChat.tsx';
const STANDALONE = 'src/app/(app)/(consumer)/wellness/advisor/page.tsx';
const SIDEBAR = 'src/components/layout/Sidebar.tsx';
const MOBILE = 'src/components/layout/MobileNavBar.tsx';
const QUICK = 'src/components/dashboard/QuickActionsGrid.tsx';
const DASH = 'src/components/dashboard/ConsumerDashboard.tsx';
const DASH_HEADER = 'src/components/dashboard/DashboardHeader.tsx';
const TABS = 'src/components/peptide-protocol/converter/PeptideEducationTabs.tsx';

const SEVEN_SURFACES = [
  'src/components/dashboard/ConsumerDashboard.tsx',
  'src/components/journey/YourJourneyCoaching.tsx',
  'src/components/genetics/hub/GeneticsHub.tsx',
  'src/components/nutrition/hub/NutritionHub.tsx',
  'src/app/(app)/(consumer)/supplements/SupplementsPageContent.tsx',
  'src/components/body-tracker/hub/BodyTrackerHub.tsx',
  'src/app/(app)/(consumer)/peptide-protocol/page.tsx',
] as const;

describe('HannahAIGuidedByChip', () => {
  const chip = src(CHIP);

  it('is a button that scrolls to #hannah-ai-chat and never routes to /wellness/advisor', () => {
    expect(chip).toContain('<button');
    expect(chip).toContain("getDisplayName('hannahai')");
    expect(chip).toContain('Guided by {getDisplayName(');
    expect(chip).toContain('hannah-ai-chat');
    expect(chip).toContain('scrollIntoView');
    expect(chip).not.toContain('/wellness/advisor');
    expect(chip).not.toContain('hidden md:inline-flex');
    expect(chip).toContain('strokeWidth={1.5}');
    expect(chip).not.toContain('Guided by Hannah');
    expect(chip).not.toContain('Guided by HannahAI');
  });
});

describe('HannahAIChatCard', () => {
  const card = src(CARD);
  const advisor = src(ADVISOR);
  const standalone = src(STANDALONE);

  it('wraps AdvisorChat as an embedded consumer card', () => {
    expect(card).toContain('hub-card-frame');
    expect(card).toContain('rounded-2xl');
    expect(card).toContain('border-white/[0.08]');
    expect(card).toContain('id={HANNAH_AI_CHAT_ID}');
    expect(card).toContain('embedded');
    expect(card).toContain('role="consumer"');
    expect(card).toContain('accentColor={ACCENT}');
    expect(card).toContain('#2DA5A0');
    expect(card).toContain("getDisplayName('hannahai')");
    expect(card).toContain('HANNAH_CONSUMER_SUBTITLE');
    expect(card).toContain('How can I improve my Bio Optimization Score?');
    expect(card).toContain('Should I take my supplements with food?');
    expect(card).toContain('What does my MTHFR result mean?');
    expect(card).toContain('Which genetic test should I take next?');
  });

  it('AdvisorChat supports embedded height without changing the standalone page', () => {
    expect(advisor).toContain('embedded?: boolean');
    expect(advisor).toContain('embedded = false');
    expect(advisor).toContain('h-[min(520px,70vh)]');
    expect(advisor).toContain('h-[calc(100vh-64px)]');
    expect(standalone).not.toContain('embedded');
    expect(standalone).toContain('<AdvisorChat');
  });
});

describe('HannahAIChatCard mounts on seven consumer hubs', () => {
  it.each(SEVEN_SURFACES)('imports and mounts HannahAIChatCard on %s', (rel) => {
    const file = src(rel);
    expect(file).toContain('HannahAIChatCard');
    expect(file).toMatch(/import \{ HannahAIChatCard \}/);
    expect(file).toContain('<HannahAIChatCard');
  });

  it('also mounts the card on peptide suggestions without replacing PeptideSuggestionsClient', () => {
    const suggestions = src(
      'src/app/(app)/(consumer)/peptide-protocol/suggestions/page.tsx',
    );
    expect(suggestions).toContain('HannahAIChatCard');
    expect(suggestions).toContain('<HannahAIChatCard');
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
    expect(dash).toContain('<HannahAIChatCard');
    expect(src(DASH_HEADER)).toContain('<HannahAIGuidedByChip');
  });
});
