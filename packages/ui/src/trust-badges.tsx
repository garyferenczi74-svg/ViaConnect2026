import React from 'react';

export interface TrustBadgeItem {
  icon: string;
  label: string;
}

export interface TrustBadgesProps {
  items?: TrustBadgeItem[];
  className?: string;
}

const defaultItems: TrustBadgeItem[] = [
  { icon: 'verified_user', label: 'HIPAA Compliant' },
  { icon: 'hub', label: 'FHIR R4 Interop' },
  { icon: 'workspace_premium', label: 'GMP Certified' },
];

export function TrustBadges({ items = defaultItems, className = '' }: TrustBadgesProps) {
  return (
    <section className={`py-6 border-y border-white/5 ${className}`}>
      <div className={`grid grid-cols-${items.length} gap-4`}>
        {items.map((item) => (
          <div key={item.label} className="flex flex-col items-center text-center space-y-2">
            <span className="material-symbols-outlined text-[#05bed6]/60">
              {item.icon}
            </span>
            <span className="text-[10px] font-semibold text-slate-400 uppercase">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
