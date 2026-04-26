// Prompt #138e §4.6 + §6.3: qualifier block. Renders adjacent to phase cards
// at body weight, never as a footnote. Visually distinct via #2DA5A0 accent
// border but typographically equivalent to phase body text.

export interface QualifierBlockProps {
  text: string;
}

export function QualifierBlock({ text }: QualifierBlockProps) {
  return (
    <div className="rounded-2xl border-l-2 border-[#2DA5A0]/60 bg-white/[0.02] px-5 py-4 max-w-3xl mx-auto">
      <p className="text-sm text-slate-300 leading-relaxed">{text}</p>
    </div>
  );
}
