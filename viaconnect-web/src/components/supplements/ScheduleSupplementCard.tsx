'use client';

// Prompt 185a slice 5b (2026-06-09): one supplement card in the Daily Schedule.
// Shows name + dose, the engine constraint chips (Lucide at strokeWidth 1.5), a
// take control, a drag handle (wired in slice 6), and Hannah's rationale via the
// 157k peek-pin. The agent label resolves through getDisplayName; no hardcoded
// name. No emojis. No em or en dashes.

import type { PointerEvent as ReactPointerEvent } from 'react';
import { Utensils, Ban, Droplet, ArrowLeftRight, GripVertical, Check, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { RationalePeek } from './RationalePeek';
import { MoveToMenu } from './MoveToMenu';
import { getDisplayName } from '@/lib/getDisplayName';
import { SUPPLEMENT_TIMING_AGENT_SLUG } from '@/lib/caq/supplements/timing/agent';
import type { ScheduleCard } from '@/lib/caq/supplements/timing/assignTiming';
import type { TimeOfDay } from '@/lib/caq/supplements/timing/types';

const AGENT_NAME = getDisplayName(SUPPLEMENT_TIMING_AGENT_SLUG);

function Chip({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-white/55">
      <Icon className="h-3 w-3" strokeWidth={1.5} />
      {label}
    </span>
  );
}

export function ScheduleSupplementCard({
  card,
  taken,
  onToggle,
  onMove,
  onRemove,
  onHandlePointerDown,
}: {
  card: ScheduleCard;
  taken: boolean;
  onToggle: () => void;
  onMove: (t: TimeOfDay) => void;
  onRemove: () => void;
  onHandlePointerDown?: (e: ReactPointerEvent) => void;
}) {
  const chips: { icon: LucideIcon; label: string }[] = [];
  if (card.with_food) chips.push({ icon: Utensils, label: 'With food' });
  if (card.empty_stomach) chips.push({ icon: Ban, label: 'Empty stomach' });
  if (card.fat_soluble) chips.push({ icon: Droplet, label: 'Fat soluble' });
  if (card.away_from.length > 0) chips.push({ icon: ArrowLeftRight, label: `Away from ${card.away_from.join(', ')}` });

  return (
    <div className="relative flex items-start gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-2.5 pb-7">
      <button
        type="button"
        aria-label={`Drag to reschedule ${card.name}`}
        data-drag-handle
        onPointerDown={onHandlePointerDown}
        style={{ touchAction: 'none' }}
        className="flex min-h-[44px] w-6 flex-shrink-0 cursor-grab items-center justify-center text-white/25 transition-colors hover:text-white/50"
      >
        <GripVertical className="h-4 w-4" strokeWidth={1.5} />
      </button>

      <button
        type="button"
        onClick={onToggle}
        aria-pressed={taken}
        aria-label={`${taken ? 'Mark not taken' : 'Mark taken'}: ${card.name}`}
        className="flex min-h-[44px] min-w-[44px] flex-shrink-0 items-center justify-center"
      >
        {taken ? (
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#2DA5A0]/40 bg-[#2DA5A0]/20">
            <Check className="h-3.5 w-3.5 text-[#2DA5A0]" strokeWidth={2.5} />
          </span>
        ) : (
          <span className="h-6 w-6 rounded-full border-2 border-white/15 transition-colors hover:border-[#2DA5A0]/40" />
        )}
      </button>

      <div className="min-w-0 flex-1 pt-1">
        <div className="flex items-start justify-between gap-1">
          <p className={`text-sm font-medium ${taken ? 'text-white/40 line-through' : 'text-white/85'}`}>{card.name}</p>
          <div className="flex flex-shrink-0 items-center">
            {card.rationale ? <RationalePeek label={`Why this time, per ${AGENT_NAME}`} text={card.rationale} /> : null}
            <MoveToMenu current={card.time_of_day} onMove={onMove} />
          </div>
        </div>
        {card.dose ? <p className="mt-0.5 text-[11px] text-white/35">{card.dose}</p> : null}
        {chips.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {chips.map((c) => (
              <Chip key={c.label} icon={c.icon} label={c.label} />
            ))}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${card.name} from your schedule`}
        className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-md text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
      >
        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>
    </div>
  );
}

export default ScheduleSupplementCard;
