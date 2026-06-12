// Prompt 193 Task T2 (2026-06-12): one marker group inside a GENEX360 panel
// description card on /shop/genex360.
//
// Renders the group title as a teal tinted uppercase eyebrow, then each marker
// as a compact row: symbol in Teal #2DA5A0, fullName muted, description in body
// text. On desktop the markers may flow into a responsive two column grid for
// scanability; on mobile they stay single column. Presentational, no hooks.
//
// Standing rules honored: tokens only (Teal #2DA5A0, white opacity neutrals),
// Lucide strokeWidth 1.5, Instrument Sans inherited, no emojis, no checkmark
// glyphs in strings, no em or en dashes, TypeScript strict (no any).

import { Dot } from "lucide-react";
import type { PanelMarkerGroup as PanelMarkerGroupData } from "@/data/genex360/types";

interface PanelMarkerGroupProps {
  group: PanelMarkerGroupData;
}

export function PanelMarkerGroup({ group }: PanelMarkerGroupProps) {
  return (
    <section className="space-y-3">
      <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2DA5A0]">
        {group.groupTitle}
      </h4>
      <ul className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
        {group.markers.map((marker) => (
          <li
            key={marker.symbol}
            className="flex gap-2 rounded-lg border border-white/[0.06] bg-[#1E3054]/40 p-3"
          >
            <Dot
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-[#2DA5A0]"
              strokeWidth={1.5}
            />
            <div className="space-y-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="font-mono text-sm font-semibold text-[#2DA5A0]">
                  {marker.symbol}
                </span>
                <span className="text-[11px] text-white/45">{marker.fullName}</span>
              </div>
              <p className="text-[13px] leading-relaxed text-white/75">
                {marker.description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default PanelMarkerGroup;
