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
    <section className="rounded-2xl border border-white/10 bg-[#1E3054] p-4 sm:p-5">
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
        className="mt-4 inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all"
        style={{
          background: `${accent}1A`,
          borderColor: `${accent}4D`,
          color: accent,
        }}
      >
        {cta}
        <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
      </Link>
    </section>
  );
}
