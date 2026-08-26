// Brief 6 / Brief 51: marketing Variants Explorer Preview data.
// Demo only. Never "Your variant". No protocol-change line (no member delta).
// Ban genotype / COMT / CLOCK / MTHFR copy on Demo Explorer.
// Chips stay Demo | Unanalyzed | Reference. Not a diagnosis.
// Standing rules: existing tokens, no em or en dashes, no any.

export const VARIANTS_EXPLORER_PREVIEW_TITLE = 'Variants Explorer Preview';

export const VARIANTS_EXPLORER_EDUCATIONAL_LINE =
  'Educational preview. Not a diagnosis and not your genotype.';

export type PreviewVariantState = 'demo' | 'unanalyzed' | 'reference';

export interface PreviewVariant {
  gene: string;
  variant: string;
  implication: string;
  state: PreviewVariantState;
}

export const PREVIEW_VARIANTS: readonly PreviewVariant[] = [
  {
    gene: 'GeneXM',
    variant: 'Methylation and detox SNPs',
    implication:
      'Educational catalog preview of the GeneXM panel. This is not your call and not a diagnosis.',
    state: 'demo',
  },
  {
    gene: 'NutrigenDX',
    variant: 'Nutrient-metabolism SNPs',
    implication:
      'Educational catalog preview. Empty here is Unanalyzed, not a made-up genotype.',
    state: 'unanalyzed',
  },
  {
    gene: 'HormoneIQ',
    variant: 'DUTCH markers',
    implication:
      'HormoneIQ maps DUTCH hormone markers. Reference catalog copy, not your result.',
    state: 'reference',
  },
];

export const PREVIEW_STATE_STYLES: Record<PreviewVariantState, string> = {
  demo: 'border-[#2DA5A0]/40 bg-[#2DA5A0]/5',
  unanalyzed: 'border-white/10 bg-white/5',
  reference: 'border-[#B75E18]/40 bg-[#B75E18]/5',
};

export const PREVIEW_STATE_LABEL: Record<PreviewVariantState, string> = {
  demo: 'Demo',
  unanalyzed: 'Unanalyzed',
  reference: 'Reference',
};
