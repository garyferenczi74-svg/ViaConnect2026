'use client';

// DashboardLinkCard — generic full-width link card matching the dashboard's
// tab design language (HelixRewardsSummary / ConnectCard styling). Reusable
// for any "title + description + CTA" tab on the dashboard.

import Link from 'next/link';
import { ArrowRight, type LucideIcon } from 'lucide-react';

interface DashboardLinkCardProps {
  eyebrow: string;
  eyebrowIcon?: LucideIcon;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  href: string;
  cta: string;
}

export function DashboardLinkCard({
  eyebrow,
  eyebrowIcon: EyebrowIcon,
  title,
  description,
  icon: Icon,
  accent,
  href,
  cta,
}: DashboardLinkCardProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#1E3054]/60 backdrop-blur-md p-4 sm:p-5">
      {/* Header eyebrow */}
      <div className="mb-3 flex items-center gap-2">
        {EyebrowIcon && (
          <EyebrowIcon className="h-4 w-4" strokeWidth={1.5} style={{ color: accent }} />
        )}
        <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50">
          {eyebrow}
        </h2>
      </div>

      {/* Body */}
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
          style={{
            background: `${accent}1A`,
            border: `1px solid ${accent}40`,
          }}
        >
          <Icon className="h-5 w-5" strokeWidth={1.5} style={{ color: accent }} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-white/45 sm:text-xs">
            {description}
          </p>
        </div>
      </div>

      {/* CTA */}
      <Link
        href={href}
        className="group relative mt-4 flex min-h-[40px] w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all hover:shadow-[0_0_16px_var(--cta-shadow)] active:scale-[0.97]"
        style={{
          background: `linear-gradient(135deg, ${accent} 0%, #1E3054 100%)`,
          ['--cta-shadow' as string]: `${accent}59`,
        } as React.CSSProperties}
      >
        <span className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        <span className="relative">{cta}</span>
        <ArrowRight className="relative h-4 w-4" strokeWidth={2} />
      </Link>
    </section>
  );
}
