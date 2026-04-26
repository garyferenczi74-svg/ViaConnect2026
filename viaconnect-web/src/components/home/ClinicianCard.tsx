// Prompt #138c §4.2: clinician card. Renders photo if available; otherwise
// typographic initial (first + last) per spec §3.3 permanent-fallback rule.

export interface ClinicianCardProps {
  displayName: string;
  credentialLine: string;
  roleLine: string;
  descriptorSentence: string;
  photoUrl?: string;
}

export function ClinicianCard({
  displayName, credentialLine, roleLine, descriptorSentence, photoUrl,
}: ClinicianCardProps) {
  const initials = computeInitials(displayName);
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6 max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-center sm:items-start">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={displayName}
            className="h-16 w-16 sm:h-20 sm:w-20 rounded-full object-cover flex-none ring-2 ring-[#2DA5A0]/30"
          />
        ) : (
          <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-[#1E3054] text-white flex items-center justify-center text-xl sm:text-2xl font-semibold flex-none ring-2 ring-[#2DA5A0]/30">
            {initials}
          </div>
        )}
        <div className="text-center sm:text-left">
          <p className="text-sm sm:text-base font-semibold text-white">
            {displayName}{credentialLine ? `, ${credentialLine}` : ''}
          </p>
          <p className="text-xs text-[#2DA5A0] mt-0.5">{roleLine}</p>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
            {descriptorSentence}
          </p>
        </div>
      </div>
    </div>
  );
}

function computeInitials(name: string): string {
  const parts = name.trim().replace(/^Dr\.?\s+/i, '').split(/\s+/);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
