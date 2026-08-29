'use client';

// Prompt 185a / 219 / 219a / Brief 34 / Brief 49: Daily Schedule checklist row.
// 219: compact density. 219a: rows size to CONTENT (min-height 56px, height auto).
// Brief 34: take the column width (w-full min-w-0). Never wrap at every glyph
// (that collapses min-content and letter-stacks the name). Word wrap only.
// Brief 49: one homework line (molecule why / delivery why / input chip) or an
// honest omission. Hero MorningProtocolCta stays one next action.
// One flex row: checkbox + name + dose. Name may wrap to two lines; full name shown.
// Chips sit inside the row and wrap as words. Controls vertical-center.
// Functions unchanged: take toggle, drag, move, remove, rationale.
// No emojis, no em/en dashes.

import type { PointerEvent as ReactPointerEvent } from 'react';
import { Utensils, Ban, Droplet, ArrowLeftRight, GripVertical, Check, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { RationalePeek } from './RationalePeek';
import { MoveToMenu } from './MoveToMenu';
import { getDisplayName } from '@/lib/getDisplayName';
import { SUPPLEMENT_TIMING_AGENT_SLUG } from '@/lib/caq/supplements/timing/agent';
import type { ScheduleCard } from '@/lib/caq/supplements/timing/assignTiming';
import type { TimeOfDay } from '@/lib/caq/supplements/timing/types';
import {
  buildProtocolHomework,
  formatHomeworkText,
  homeworkHasContent,
} from '@/lib/supplements/protocolHomework';
import { CONSUMER_HOMEWORK } from '@/lib/ui/consumerChrome';

const AGENT_NAME = getDisplayName(SUPPLEMENT_TIMING_AGENT_SLUG);

/** Card surface: Deep Navy / Card #1E3054 over hero (216 scrim principle). */
const ROW_SURFACE =
  'rounded-lg border border-white/12 bg-[rgba(30,48,84,0.90)] backdrop-blur-sm';

function Chip({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-0.5 rounded border border-white/10 bg-white/[0.04] px-1 py-0.5 text-[9px] leading-tight text-white/50">
      <Icon className="h-2.5 w-2.5 shrink-0" strokeWidth={1.5} />
      <span className="break-words [overflow-wrap:break-word] [word-break:normal]">{label}</span>
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
  if (card.away_from.length > 0) {
    chips.push({ icon: ArrowLeftRight, label: `Away from ${card.away_from.join(', ')}` });
  }

  const homework =
    card.homework ??
    buildProtocolHomework({
      name: card.name,
      dosageForm: card.dosage_form,
      source: card.source,
    });
  const homeworkText = formatHomeworkText(homework);

  return (
    <div
      data-testid="schedule-compact-row"
      data-row-sizing="content"
      className={`relative flex h-auto min-h-[56px] w-full min-w-0 items-center gap-1 overflow-visible px-1.5 py-1.5 ${ROW_SURFACE}`}
    >
      {/* Drag handle: 44px touch target; centers to final row height */}
      <button
        type="button"
        aria-label={`Drag to reschedule ${card.name}`}
        data-drag-handle
        onPointerDown={onHandlePointerDown}
        style={{ touchAction: 'none' }}
        className="flex h-11 min-h-[44px] w-9 flex-shrink-0 cursor-grab items-center justify-center self-center text-white/30 transition-colors hover:text-white/55 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" strokeWidth={1.5} />
      </button>

      {/* Completion checkbox: 44px target */}
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={taken}
        aria-label={`${taken ? 'Mark not taken' : 'Mark taken'}: ${card.name}`}
        className="flex h-11 min-h-[44px] min-w-[44px] flex-shrink-0 items-center justify-center self-center"
      >
        {taken ? (
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#2DA5A0]/45 bg-[#2DA5A0]/20">
            <Check className="h-3 w-3 text-[#2DA5A0]" strokeWidth={2.5} />
          </span>
        ) : (
          <span className="h-5 w-5 rounded-full border-2 border-white/20 transition-colors hover:border-[#2DA5A0]/45" />
        )}
      </button>

      {/* Name + chips (content-driven height; full name always shown as words) */}
      <div className="min-w-0 flex-1 self-center py-0.5">
        <p
          data-testid="schedule-row-name"
          className={`text-base font-medium leading-snug break-words [overflow-wrap:break-word] [word-break:normal] ${
            taken ? 'text-white/40 line-through' : 'text-white/90'
          }`}
        >
          {card.name}
        </p>
        {homeworkHasContent(homework) ? (
          <p
            data-testid="schedule-row-homework"
            className={`${CONSUMER_HOMEWORK} ${
              taken ? 'text-white/40' : 'text-white/85'
            }`}
          >
            {homeworkText ? <span>{homeworkText}</span> : null}
            {homework.inputChip ? (
              <span
                data-testid="schedule-row-input-chip"
                className="ml-1 inline-flex max-w-full items-center rounded border border-white/10 bg-white/[0.04] px-1 py-0.5 text-[9px] leading-tight text-white/45"
              >
                {homework.inputChip}
              </span>
            ) : null}
          </p>
        ) : null}
        {chips.length > 0 ? (
          <div
            data-testid="schedule-row-chips"
            className="mt-1 flex flex-wrap content-start gap-0.5"
          >
            {chips.map((c) => (
              <Chip key={c.label} icon={c.icon} label={c.label} />
            ))}
          </div>
        ) : null}
      </div>

      {card.dose ? (
        <p
          data-testid="schedule-row-dose"
          className="max-w-[28%] shrink-0 self-center text-sm leading-tight text-white/70 break-words [overflow-wrap:break-word] [word-break:normal]"
        >
          {card.dose}
        </p>
      ) : null}

      {/* Right action cluster: info, move, delete (44px targets), vertical center */}
      <div className="flex flex-shrink-0 items-center gap-0 self-center">
        {card.rationale ? (
          <RationalePeek label={`Why this time, per ${AGENT_NAME}`} text={card.rationale} />
        ) : null}
        <MoveToMenu current={card.time_of_day} onMove={onMove} />
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${card.name} from your schedule`}
          className="flex h-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

export default ScheduleSupplementCard;
