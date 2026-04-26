// Prompt #138c §4.3: four-chip grid. 2x2 on mobile, 1x4 on desktop.

import { TrustChip } from './TrustChip';

export interface TrustChipGridProps {
  chips: Array<{ id: string; icon_name: string; chip_text: string }>;
}

export function TrustChipGrid({ chips }: TrustChipGridProps) {
  if (chips.length === 0) return null;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {chips.map((c) => (
        <TrustChip key={c.id} iconName={c.icon_name} text={c.chip_text} />
      ))}
    </div>
  );
}
