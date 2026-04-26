// Prompt #138d §8.1 + §3.4: persona card with typographic monogram only.
// No photographic representation per spec section 3.4 firm constraint.

export interface PersonaCardProps {
  displayName: string;
  ageBand: string;
  lifestyleDescriptors: string[];
  healthConcerns: string[];
}

export function PersonaCard({
  displayName, ageBand, lifestyleDescriptors, healthConcerns,
}: PersonaCardProps) {
  const initial = (displayName.trim()[0] ?? "?").toUpperCase();
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/40 p-5 sm:p-6 max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-center sm:items-start">
        <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-[#1E3054] text-white flex items-center justify-center text-2xl sm:text-3xl font-semibold flex-none ring-2 ring-[#2DA5A0]/30">
          {initial}.
        </div>
        <div className="flex-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
            <p className="text-base sm:text-lg font-semibold text-white">{displayName}</p>
            <span className="inline-flex items-center text-[10px] uppercase tracking-wider text-[#2DA5A0] bg-[#2DA5A0]/15 rounded-full px-2 py-0.5">
              Composite
            </span>
          </div>
          <p className="text-xs text-white/60 mt-0.5">
            {ageBand}{lifestyleDescriptors.length > 0 ? `, ${lifestyleDescriptors.join(', ')}` : ''}
          </p>
          {healthConcerns.length > 0 && (
            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
              Reports: {healthConcerns.join(', ')}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
