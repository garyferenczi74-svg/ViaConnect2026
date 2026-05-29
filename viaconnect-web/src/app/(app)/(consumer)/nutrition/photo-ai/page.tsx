'use client';

// Prompt #170 Phase 1l: NutriVision shell route.
//
// The placeholder banner from Phase 1k is replaced with the full UI tree at
// ../components/NutriVisionTab. The tab carries its own page chrome (hero
// background, header row, back chevron) so this file is a single mount.

import NutriVisionTab from '../components/NutriVisionTab';

export default function NutriVisionPage() {
  return <NutriVisionTab />;
}
