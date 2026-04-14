'use client';

import { Construction } from 'lucide-react';

export default function Page() {
  const tabName = typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : '';
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <Construction className="h-10 w-10 text-[#2DA5A0]/60" strokeWidth={1.5} />
      <h2 className="text-lg font-semibold text-white capitalize">{tabName} Tab</h2>
      <p className="max-w-sm text-sm text-white/45">
        This section is being built by Arnold. Check back soon for full body composition,
        weight tracking, muscle analysis, milestones, and metabolic data.
      </p>
    </div>
  );
}
