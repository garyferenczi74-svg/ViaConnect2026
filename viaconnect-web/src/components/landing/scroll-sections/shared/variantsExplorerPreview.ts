// Brief 6: marketing Variants Explorer Preview data.
// Demo only. Never "Your variant". No protocol-change line (no member delta).
// MTHFR folate copy here is educational GeneXM preview, not a visitor genotype.
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
    gene: 'MTHFR',
    variant: 'C677T',
    implication:
      'People with this variant may process folate via alternative pathways, which can shift how the body uses certain B vitamins.',
    state: 'demo',
  },
  {
    gene: 'COMT',
    variant: 'V158M',
    implication:
      'Carriers metabolize catecholamines at differing rates, which may influence how the body responds to stress signaling.',
    state: 'unanalyzed',
  },
  {
    gene: 'VDR',
    variant: 'FokI',
    implication:
      'This variant is associated with differences in how cells respond to vitamin D, which can affect baseline calcium and bone signaling.',
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
