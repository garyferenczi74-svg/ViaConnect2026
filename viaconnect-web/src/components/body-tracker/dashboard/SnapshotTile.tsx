'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { BentoTile } from '@/components/ui/BentoTile';

interface SnapshotTileProps {
  href: string;
  icon: LucideIcon;
  label: string;
  className?: string;
  children: React.ReactNode;
  error?: string | null;
  onRetry?: () => void;
}

export function SnapshotTile({
  href,
  icon: Icon,
  label,
  className,
  children,
  error,
  onRetry,
}: SnapshotTileProps) {
  return (
    <BentoTile
      href={href}
      interactive
      ariaLabel={label}
      className={`min-h-[140px] rounded-[20px] ${className ?? ''}`}
      contentClassName="gap-2"
      scrim={false}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
            {label}
          </span>
        </div>
        <ChevronRight className="h-3.5 w-3.5 text-white/35" strokeWidth={1.5} />
      </div>
      {error ? (
        <div className="mt-auto space-y-2">
          <p className="text-xs text-white/60">{error}</p>
          {onRetry ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onRetry();
              }}
              className="min-h-[44px] rounded-lg border border-white/10 px-3 text-xs text-[#2DA5A0]"
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : (
        <div className="mt-auto">{children}</div>
      )}
    </BentoTile>
  );
}
