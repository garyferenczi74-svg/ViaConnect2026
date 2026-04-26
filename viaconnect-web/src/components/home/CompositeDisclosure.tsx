// Prompt #138d §4.9 + §6.3: composite illustrative disclosure.
// Renders in-element at body weight, never as a footnote, per the
// MARSHALL.MARKETING.COMPOSITE_DISCLOSURE P0 rule.

export interface CompositeDisclosureProps {
  text: string;
  placement: 'opening' | 'closing' | 'both';
}

export function CompositeDisclosure({ text, placement }: CompositeDisclosureProps) {
  return (
    <div
      data-disclosure-placement={placement}
      className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 max-w-3xl mx-auto text-center"
    >
      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic">{text}</p>
    </div>
  );
}
