// Prompt #138d §4.6: tier explainer side panel.
// Body renders the consolidated tier_explainer copy block as flowing prose.

export interface TierExplainerPanelProps {
  text: string;
}

export function TierExplainerPanel({ text }: TierExplainerPanelProps) {
  return (
    <aside className="rounded-2xl border-l-2 border-[#B75E18]/60 bg-white/[0.02] px-5 py-4 max-w-3xl mx-auto">
      <p className="text-[10px] uppercase tracking-wider text-[#B75E18] mb-2">Tier explainer</p>
      <p className="text-sm text-slate-300 leading-relaxed">{text}</p>
    </aside>
  );
}
