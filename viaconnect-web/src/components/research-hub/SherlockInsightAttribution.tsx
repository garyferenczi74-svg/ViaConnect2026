'use client';

// SherlockInsightAttribution — tiny "Discovered by Sherlock" badge added
// to content cards. Designed to slot in without altering card layout.

import { Search } from 'lucide-react';

interface SherlockInsightAttributionProps {
  scoredAt?: string | null;
  className?: string;
}

const formatRelative = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const min = diff / (1000 * 60);
  if (min < 1) return 'just now';
  if (min < 60) return `${Math.round(min)}m ago`;
  const hours = min / 60;
  if (hours < 24) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

export function SherlockInsightAttribution({ scoredAt, className = '' }: SherlockInsightAttributionProps) {
  const rel = formatRelative(scoredAt);
  return (
    <p
      className={`inline-flex items-center gap-1 text-[9px] text-white/35 ${className}`}
      title="Sherlock — Research Hub Intelligence Agent"
    >
      <Search className="h-2.5 w-2.5 text-[#2DA5A0]/70" strokeWidth={1.5} />
      Discovered by Sherlock{rel ? ` · scored ${rel}` : ''}
    </p>
  );
}
