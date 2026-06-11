'use client';

// Prompt 187 Task 4 (2026-06-11): client container for the Nutrition by
// Genetics page. The three primary tabs render through the shared
// NutritionTabs shell (default ?tab= param), so deep links restore on refresh
// and keyboard nav comes free. Default tab when the URL carries no ?tab=:
// recommendations when either source already has findings, otherwise upload.
//
// Tab switching is client side. A tab mounts on its first activation and then
// stays mounted (hidden) for the life of this container, so each tab's
// on-mount fetch runs once and toggling tabs never refetches.

import { useEffect, useState } from 'react';
import { NutritionTabs, useNutritionActiveTab } from '@/components/nutrition/NutritionTabs';
import { NutrigenDxResultsTab } from './NutrigenDxResultsTab';
import { UploadNutritionTestTab } from './UploadNutritionTestTab';
import { NutritionRecommendationsTab } from './NutritionRecommendationsTab';

const PRIMARY_TABS = [
  { id: 'nutrigendx', label: 'NutrigenDX Results' },
  { id: 'upload', label: 'Upload Your Nutrition Testing' },
  { id: 'recommendations', label: 'Nutrition Recommendations' },
] as const;

export interface NutritionGeneticsTabsProps {
  readonly userId: string;
  readonly hasNutrigenDx: boolean;
  readonly hasUploaded: boolean;
  readonly nutrigenDxPending: boolean;
}

export function NutritionGeneticsTabs({
  userId,
  hasNutrigenDx,
  hasUploaded,
  nutrigenDxPending,
}: NutritionGeneticsTabsProps) {
  const defaultTab = hasNutrigenDx || hasUploaded ? 'recommendations' : 'upload';
  const active = useNutritionActiveTab(PRIMARY_TABS, defaultTab);

  // First-activation ledger: the initially active tab is mounted up front and
  // every later activation is added once, never removed.
  const [visited, setVisited] = useState<Record<string, boolean>>(() => ({ [active]: true }));
  useEffect(() => {
    setVisited((prev) => (prev[active] ? prev : { ...prev, [active]: true }));
  }, [active]);

  return (
    <div className="space-y-5">
      <NutritionTabs
        tabs={PRIMARY_TABS}
        defaultTab={defaultTab}
        ariaLabel="Nutrition by Genetics sections"
      />

      {/* Each panel is labelled by its tab button (ntab-tab-{id} per the
          NutritionTabs id convention), so the tab and panel announce once. */}
      {visited.nutrigendx ? (
        <div
          role="tabpanel"
          aria-labelledby="ntab-tab-nutrigendx"
          hidden={active !== 'nutrigendx'}
        >
          <NutrigenDxResultsTab nutrigenDxPending={nutrigenDxPending} />
        </div>
      ) : null}

      {visited.upload ? (
        <div role="tabpanel" aria-labelledby="ntab-tab-upload" hidden={active !== 'upload'}>
          <UploadNutritionTestTab userId={userId} />
        </div>
      ) : null}

      {visited.recommendations ? (
        <div
          role="tabpanel"
          aria-labelledby="ntab-tab-recommendations"
          hidden={active !== 'recommendations'}
        >
          <NutritionRecommendationsTab userId={userId} />
        </div>
      ) : null}
    </div>
  );
}

export default NutritionGeneticsTabs;
