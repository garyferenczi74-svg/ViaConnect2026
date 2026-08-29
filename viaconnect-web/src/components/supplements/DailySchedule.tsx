'use client';

// Prompt 185a slice 5b (2026-06-09): the today-scoped Daily Schedule surface on
// My Supplements. Renders the three time buckets from GET /api/supplements/
// schedule (Hannah-assigned slots, enriched with chips + rationale). Desktop is
// three columns; mobile is stacked collapsible buckets with the current local
// hour open by default. The take control is optimistic local state here; slice
// 7 wires it to protocol_adherence_log keyed to the user local date.
// No emojis. No em or en dashes.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Sunrise, Sun, Moon, Loader2, Plus, ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { DraggableScheduleCard } from './DraggableScheduleCard';
import { removeSupplementFromView, restoreSupplementToView } from './scheduleViewOps';
import { safeLog } from '@/lib/utils/safe-log';
import type { ScheduleCard, ScheduleView } from '@/lib/caq/supplements/timing/assignTiming';
import { useDailyScheduleView } from '@/hooks/useDailyScheduleView';
import {
  EMPTY_SCHEDULE_VIEW,
  currentLocalScheduleBucket,
} from '@/lib/supplements/dailyScheduleShared';
import { CONSUMER_SCHEDULE_ROW_SCALE } from '@/lib/ui/consumerChrome';

type TimeOfDay = 'morning' | 'afternoon' | 'evening';

const BUCKETS: { id: TimeOfDay; label: string; icon: LucideIcon; color: string }[] = [
  { id: 'morning', label: 'Morning', icon: Sunrise, color: '#FBBF24' },
  { id: 'afternoon', label: 'Afternoon', icon: Sun, color: '#B75E18' },
  { id: 'evening', label: 'Evening', icon: Moon, color: '#60A5FA' },
];

const EMPTY_VIEW = EMPTY_SCHEDULE_VIEW;

function currentBucket(): TimeOfDay {
  return currentLocalScheduleBucket();
}

// Pure: move a card to a different bucket in the local view (optimistic). The
// moved card is marked user_drag to mirror the server lock.
function moveCardInView(view: ScheduleView, slotId: string, target: TimeOfDay): ScheduleView {
  const next: ScheduleView = { morning: [], afternoon: [], evening: [] };
  let moved: ScheduleCard | null = null;
  for (const b of ['morning', 'afternoon', 'evening'] as TimeOfDay[]) {
    for (const c of view[b]) {
      if (c.slot_id === slotId) moved = { ...c, time_of_day: target, time_source: 'user_drag' };
      else next[b].push(c);
    }
  }
  if (moved) next[target].push(moved);
  return next;
}

// Pure: reorder a bucket's cards to the given slot-id order (optimistic),
// stamping display_order and user_drag to mirror the server.
function reorderViewBucket(view: ScheduleView | null, bucket: TimeOfDay, orderedSlotIds: string[]): ScheduleView | null {
  if (!view) return view;
  const byId = new Map(view[bucket].map((c) => [c.slot_id, c]));
  const reordered: ScheduleCard[] = [];
  orderedSlotIds.forEach((id, i) => {
    const c = byId.get(id);
    if (c) {
      reordered.push({ ...c, display_order: i, time_source: 'user_drag' });
      byId.delete(id);
    }
  });
  for (const c of byId.values()) reordered.push(c);
  return { ...view, [bucket]: reordered };
}

export function DailySchedule() {
  // Prompt 219d: same shared read as Dashboard TodaysProtocol
  // (GET /api/supplements/schedule via useDailyScheduleView).
  const {
    view: sharedView,
    counts,
    status,
    errorMessage,
    refresh,
    replaceView,
    toggleTaken,
  } = useDailyScheduleView();
  const view = sharedView;
  const loading = status === 'loading';
  const setView = replaceView;
  const [openMobile, setOpenMobile] = useState<TimeOfDay | null>(currentBucket());
  // Latest view, read synchronously inside the drop handler (avoids stale closure).
  const viewRef = useRef<ScheduleView | null>(null);
  useEffect(() => { viewRef.current = view; }, [view]);

  // Mark a slot taken / not taken for the user's local date. Shared POST path
  // with Dashboard (protocol_adherence_log keyed to profiles.timezone).
  const handleToggle = useCallback(async (card: ScheduleCard) => {
    const ok = await toggleTaken({
      slotId: card.slot_id,
      userSupplementId: card.user_supplement_id,
      timeOfDay: card.time_of_day,
      nextTaken: !card.taken,
    });
    if (!ok) {
      safeLog.error('supplements.schedule.intake', 'toggle failed; reverted', {
        slotId: card.slot_id,
      });
    }
  }, [toggleTaken]);

  // Move a supplement to another bucket via the "Move to" menu (slice 6a) or a
  // drag (slice 6b). Optimistic; reverts visually and logs on failure. The move
  // sets time_source = user_drag on the server so Hannah stops reassigning it.
  const handleMove = useCallback(async (card: ScheduleCard, target: TimeOfDay) => {
    if (card.time_of_day === target) return;
    const original = card.time_of_day;
    setView((prev) => (prev ? moveCardInView(prev, card.slot_id, target) : prev));
    try {
      const res = await fetch('/api/supplements/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'move', slotId: card.slot_id, timeOfDay: target }),
      });
      const json = await res.json().catch(() => ({ ok: false }));
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? `status ${res.status}`);
    } catch (err) {
      setView((prev) => (prev ? moveCardInView(prev, card.slot_id, original) : prev));
      safeLog.error('supplements.schedule.move', 'move failed; reverted', {
        slotId: card.slot_id,
        target,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  // Reorder within a bucket from a drag (slice 6b). Optimistic; restores the
  // prior order and logs on failure. Persists display_order + user_drag.
  const handleReorder = useCallback(async (bucket: TimeOfDay, orderedSlotIds: string[], prevCards: ScheduleCard[]) => {
    setView((prev) => reorderViewBucket(prev, bucket, orderedSlotIds) ?? prev);
    try {
      const res = await fetch('/api/supplements/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reorder', orderedSlotIds }),
      });
      const json = await res.json().catch(() => ({ ok: false }));
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? `status ${res.status}`);
    } catch (err) {
      setView((prev) => (prev ? { ...prev, [bucket]: prevCards } : prev));
      safeLog.error('supplements.schedule.reorder', 'reorder failed; reverted', {
        bucket,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  // Remove a whole supplement from the regimen (soft delete, is_current=false).
  // Optimistic: all of the supplement's cards leave the view immediately, with an
  // Undo toast that restores them (PATCH restore). Reverts + logs on failure.
  const handleRemove = useCallback(async (card: ScheduleCard) => {
    const snapshot = viewRef.current ?? EMPTY_VIEW;
    const { next, removed } = removeSupplementFromView(snapshot, card.user_supplement_id);
    if (removed.length === 0) return;
    setView(next);

    const undo = async () => {
      setView((prev) => restoreSupplementToView(prev ?? EMPTY_VIEW, removed));
      try {
        const res = await fetch('/api/supplements/schedule', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'restore', userSupplementId: card.user_supplement_id }),
        });
        const json = await res.json().catch(() => ({ ok: false }));
        if (!res.ok || !json?.ok) throw new Error(json?.error ?? `status ${res.status}`);
      } catch (err) {
        setView((prev) => removeSupplementFromView(prev ?? EMPTY_VIEW, card.user_supplement_id).next);
        safeLog.error('supplements.schedule.restore', 'restore failed', {
          userSupplementId: card.user_supplement_id,
          error: err instanceof Error ? err.message : String(err),
        });
        toast.error('Could not undo. You can re-add the supplement below.');
      }
    };

    try {
      const res = await fetch('/api/supplements/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', userSupplementId: card.user_supplement_id }),
      });
      const json = await res.json().catch(() => ({ ok: false }));
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? `status ${res.status}`);
      toast(
        (t) => (
          <span className="flex items-center gap-3 text-sm">
            Removed {card.name}.
            <button
              type="button"
              onClick={() => { toast.dismiss(t.id); void undo(); }}
              className="font-semibold text-[#2DA5A0] hover:underline"
            >
              Undo
            </button>
          </span>
        ),
        { duration: 6000 },
      );
    } catch (err) {
      setView(snapshot);
      safeLog.error('supplements.schedule.remove', 'remove failed; reverted', {
        userSupplementId: card.user_supplement_id,
        error: err instanceof Error ? err.message : String(err),
      });
      toast.error('Could not remove the supplement. Please try again.');
    }
  }, []);

  const bucketRefs = useRef<Record<TimeOfDay, HTMLDivElement | null>>({ morning: null, afternoon: null, evening: null });

  // On drop, hit-test the pointer against each (desktop) bucket rect. A drop
  // over a different bucket moves the card there (handleMove); a drop within the
  // same bucket reorders by vertical position (handleReorder). Both lock the
  // slot to user_drag. Mobile uses the Move to menu (desktop rects are hidden).
  const onCardDragEnd = useCallback((card: ScheduleCard, point: { x: number; y: number }) => {
    let target: TimeOfDay | null = null;
    for (const b of ['morning', 'afternoon', 'evening'] as TimeOfDay[]) {
      const el = bucketRefs.current[b];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (point.x >= r.left && point.x <= r.right && point.y >= r.top && point.y <= r.bottom) {
        target = b;
        break;
      }
    }
    if (!target) return;
    if (target !== card.time_of_day) {
      void handleMove(card, target);
      return;
    }
    // Same bucket: compute the new order from the drop position. Compare the
    // drop Y against each other card's midpoint; the dragged card is excluded
    // (its own rect is at the drop position).
    const el = bucketRefs.current[target];
    const current = viewRef.current?.[target] ?? [];
    if (!el || current.length < 2) return;
    const nodes = Array.from(el.querySelectorAll('[data-slot-id]')) as HTMLElement[];
    const others: string[] = [];
    let insertAt = -1;
    for (const n of nodes) {
      const sid = n.getAttribute('data-slot-id');
      if (!sid || sid === card.slot_id) continue;
      const r = n.getBoundingClientRect();
      if (insertAt === -1 && point.y < r.top + r.height / 2) insertAt = others.length;
      others.push(sid);
    }
    if (insertAt === -1) insertAt = others.length;
    const newOrder = [...others.slice(0, insertAt), card.slot_id, ...others.slice(insertAt)];
    if (newOrder.join('|') === current.map((c) => c.slot_id).join('|')) return;
    void handleReorder(target, newOrder, current);
  }, [handleMove, handleReorder]);

  // Prompt 219d: counts from shared computeDailyScheduleCounts (same as Dashboard).
  const total = counts.total;
  const bucketTaken = (cards: ScheduleCard[]) => cards.filter((c) => c.taken).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-8 text-white/40">
        <Loader2 className="h-5 w-5 animate-spin text-[#2DA5A0]" />
        <span className="text-sm">Building your schedule...</span>
      </div>
    );
  }

  if (status === 'unavailable') {
    return (
      <div className="p-5 md:p-6 text-center">
        <p className="text-sm text-white/60">
          {errorMessage ?? 'Schedule unavailable. Retry when ready.'}
        </p>
        <button
          type="button"
          onClick={refresh}
          className="mt-3 min-h-[44px] rounded-xl border border-[#2DA5A0]/40 px-4 py-2 text-sm text-[#2DA5A0]"
        >
          Retry
        </button>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="p-5 md:p-6">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-8 text-center">
          <p className="text-sm text-white/50">No active supplements yet.</p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-[#2DA5A0]">
            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
            Add supplements below to build your daily schedule.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="p-3 md:p-4"
      data-testid="supplements-daily-schedule"
      data-schedule-total={counts.total}
      data-schedule-completed={counts.completed}
      data-schedule-adherence={counts.adherencePercent}
    >
      {/* Desktop: three columns; compact rows (Prompt 219) */}
      <div className="hidden min-w-0 gap-3 md:grid md:grid-cols-3">
        {BUCKETS.map((b) => {
          const cards = view[b.id] ?? [];
          const Icon = b.icon;
          return (
            <div key={b.id} ref={(el) => { bucketRefs.current[b.id] = el; }} className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[rgba(30,48,84,0.55)]">
              <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: `${b.color}1A` }}>
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.5} style={{ color: b.color }} />
                </span>
                <span className="flex-1 text-xl font-semibold" style={{ color: b.color }}>{b.label}</span>
                <span className="text-[11px] text-white/45">{bucketTaken(cards)}/{cards.length}</span>
              </div>
              {cards.length > 0 ? (
                <div className={`min-w-0 flex flex-col gap-2 p-1.5 ${CONSUMER_SCHEDULE_ROW_SCALE}`}>
                  {cards.map((c) => (
                    <DraggableScheduleCard key={c.slot_id} card={c} taken={c.taken} onToggle={() => handleToggle(c)} onMove={(t) => handleMove(c, t)} onRemove={() => handleRemove(c)} onCardDragEnd={onCardDragEnd} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center px-4 py-6">
                  <p className="text-center text-xs text-white/25">Nothing scheduled</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: stacked collapsible buckets */}
      <div className="flex min-w-0 flex-col gap-3 md:hidden">
        {BUCKETS.map((b) => {
          const cards = view[b.id] ?? [];
          const isOpen = openMobile === b.id;
          const Icon = b.icon;
          return (
            <div key={b.id} className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-[rgba(30,48,84,0.55)]">
              <button
                type="button"
                onClick={() => setOpenMobile(isOpen ? null : b.id)}
                aria-expanded={isOpen}
                className="flex min-h-[44px] w-full items-center gap-2 px-3 py-2"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: `${b.color}1A` }}>
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.5} style={{ color: b.color }} />
                </span>
                <span className="flex-1 text-left text-xl font-semibold" style={{ color: b.color }}>{b.label}</span>
                <span className="text-[11px] text-white/45">{bucketTaken(cards)}/{cards.length}</span>
                <ChevronDown className={`h-4 w-4 text-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} strokeWidth={1.5} />
              </button>
              {isOpen ? (
                cards.length > 0 ? (
                  <div className={`min-w-0 flex flex-col gap-2 p-1.5 ${CONSUMER_SCHEDULE_ROW_SCALE}`}>
                    {cards.map((c) => (
                      <DraggableScheduleCard key={c.slot_id} card={c} taken={c.taken} onToggle={() => handleToggle(c)} onMove={(t) => handleMove(c, t)} onRemove={() => handleRemove(c)} onCardDragEnd={onCardDragEnd} />
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-5"><p className="text-center text-xs text-white/25">Nothing scheduled</p></div>
                )
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default DailySchedule;
