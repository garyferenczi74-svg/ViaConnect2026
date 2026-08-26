// Brief 16 / Brief 51: Demo | Unanalyzed | Reference | your upload | GENEX360 | GeneXM.
// Demo reuses the existing SampleBadge chrome (neutral flask, Lucide 1.5).
// Never claims the visitor genotype. Display name is GeneXM. Existing palette only.

import { BookOpen, Check, FlaskConical, HelpCircle } from 'lucide-react';
import {
  VARIANT_ROW_CHIP_LABEL,
  type VariantRowChipKind,
} from '@/lib/genetics/variantRowChip';

const CHIP_CLASS: Record<VariantRowChipKind, string> = {
  demo: 'border-white/20 bg-white/[0.06] text-white/70',
  unanalyzed: 'border-white/10 bg-white/[0.04] text-white/50',
  reference: 'border-[#B75E18]/40 bg-[#B75E18]/10 text-[#B75E18]',
  your_upload: 'border-[#2DA5A0]/40 bg-[#2DA5A0]/10 text-[#2DA5A0]',
  genex360: 'border-[#2DA5A0]/40 bg-[#2DA5A0]/10 text-[#2DA5A0]',
  genexm: 'border-[#2DA5A0]/40 bg-[#2DA5A0]/10 text-[#2DA5A0]',
};

const CHIP_TITLE: Record<VariantRowChipKind, string> = {
  demo: 'Demo preview. Not a diagnosis.',
  unanalyzed: 'Unanalyzed. Not a diagnosis.',
  reference: 'Reference catalog. Not a diagnosis.',
  your_upload: 'your upload. Not a diagnosis.',
  genex360: 'GENEX360. Not a diagnosis.',
  genexm: 'GeneXM. Not a diagnosis.',
};

function ChipIcon({ kind }: { kind: VariantRowChipKind }) {
  if (kind === 'demo') {
    return <FlaskConical aria-hidden="true" className="h-3 w-3 shrink-0" strokeWidth={1.5} />;
  }
  if (kind === 'reference') {
    return <BookOpen aria-hidden="true" className="h-3 w-3 shrink-0" strokeWidth={1.5} />;
  }
  if (kind === 'unanalyzed') {
    return <HelpCircle aria-hidden="true" className="h-3 w-3 shrink-0" strokeWidth={1.5} />;
  }
  return <Check aria-hidden="true" className="h-3 w-3 shrink-0" strokeWidth={1.5} />;
}

export function VariantRowChip({ kind }: { kind: VariantRowChipKind }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${CHIP_CLASS[kind]}`}
      title={CHIP_TITLE[kind]}
    >
      <ChipIcon kind={kind} />
      {VARIANT_ROW_CHIP_LABEL[kind]}
    </span>
  );
}

export default VariantRowChip;
