// Prompt #138d §8.1: category strip reuses the trust-chip visual primitive
// from #138c so no new visual primitive is introduced.

import { TrustChip } from './TrustChip';

const CATEGORY_ICON_MAP: Record<string, string> = {
  methylation_pathway_support: 'flask-conical',
  sleep_architecture_optimization: 'lock',
  stress_response_balance: 'shield-check',
  mitochondrial_energy_support: 'heart-pulse',
};

export interface CategoryStripProps {
  categories: Array<{ id: string; category_code: string; category_display_name: string }>;
}

export function CategoryStrip({ categories }: CategoryStripProps) {
  if (categories.length === 0) return null;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {categories.map((c) => (
        <TrustChip
          key={c.id}
          iconName={CATEGORY_ICON_MAP[c.category_code] ?? 'microscope'}
          text={c.category_display_name}
        />
      ))}
    </div>
  );
}
