// Prompt #138d §4.3-§4.5: scenario phase card with numbered marker + body.

export interface ScenarioPhaseCardProps {
  phaseNumber: number;
  body: string;
}

export function ScenarioPhaseCard({ phaseNumber, body }: ScenarioPhaseCardProps) {
  return (
    <article className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/40 p-5 sm:p-6 flex flex-col gap-3 h-full">
      <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#2DA5A0] text-[#0B1520] text-sm font-bold flex-none">
        {phaseNumber}
      </div>
      <p className="text-sm text-slate-300 leading-relaxed">{body}</p>
    </article>
  );
}
