'use client';

// Prompt 180 (2026-06-08): Connections foundation strip.
//
// Sits directly below the bento grid. Links to the existing
// /body-tracker/connections route which already lists the supported
// sources. The strip presents the five highest priority sources from
// CONNECTIONS as pills with a teal dot when connected and a dim dot
// when not. While the ingestion series is still in flight every
// source ships as connected = false; the real status hook will land
// later.

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CONNECTIONS } from './hubConfig';

const ACCENT_HEX = '#2DA5A0';

export function ConnectionsStrip() {
  const Icon = CONNECTIONS.icon;
  return (
    <Link
      href={CONNECTIONS.href}
      aria-label={`${CONNECTIONS.title}: ${CONNECTIONS.description}`}
      className="group relative flex min-h-[88px] flex-col gap-3 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-4 backdrop-blur-md transition-all duration-200 ease-out hover:border-white/[0.16] hover:shadow-lg hover:shadow-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] md:min-h-[96px] md:flex-row md:items-center md:gap-4 md:p-5"
      data-hub-connections
    >
      <span
        aria-hidden="true"
        className="absolute left-0 right-0 top-0 h-[2px]"
        style={{ backgroundColor: ACCENT_HEX }}
      />

      <div className="flex items-center gap-3 md:gap-4">
        <span
          className="inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] backdrop-blur-sm md:h-14 md:w-14"
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" strokeWidth={1.5} style={{ color: ACCENT_HEX }} />
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="text-[14px] font-semibold leading-tight text-white md:text-[15px]">
            {CONNECTIONS.title}
          </h2>
          <p className="text-[12px] leading-relaxed text-white/[0.62] md:text-[13px]">
            {CONNECTIONS.description}
          </p>
        </div>
      </div>

      {/* Source pills + go affordance. Mobile: pills wrap, affordance
          sits on its own row. Desktop: everything sits to the right. */}
      <div className="flex flex-wrap items-center gap-2 md:ml-auto md:flex-nowrap md:gap-3">
        <ul className="flex flex-wrap items-center gap-1.5">
          {CONNECTIONS.sources.map((source) => (
            <li key={source.id}>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-white/75 backdrop-blur-sm">
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 rounded-full ${
                    source.connected ? 'bg-[#2DA5A0]' : 'bg-white/25'
                  }`}
                />
                {source.label}
                <span className="sr-only">
                  {source.connected ? 'connected' : 'not connected'}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <span className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium text-white/70 transition-colors group-hover:text-white md:ml-2">
          <span>Manage</span>
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
            strokeWidth={1.5}
          />
        </span>
      </div>
    </Link>
  );
}

export default ConnectionsStrip;
