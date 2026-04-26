// Prompt #138e §4.3 to §4.5: phase card. Title + subtitle + body.
// Uses existing Card Navy #1E3054 background per spec §8.1; no new tokens.

export interface PhaseCardProps {
  title: string;
  subtitle: string;
  body: string;
}

export function PhaseCard({ title, subtitle, body }: PhaseCardProps) {
  return (
    <article className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/40 p-5 sm:p-6 flex flex-col gap-2 h-full">
      <h3 className="text-base sm:text-lg font-semibold text-white">{title}</h3>
      <p className="text-xs sm:text-sm text-[#2DA5A0] uppercase tracking-wider">{subtitle}</p>
      <p className="mt-2 text-sm text-slate-300 leading-relaxed">{body}</p>
    </article>
  );
}
