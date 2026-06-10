'use client';

// Prompt 185a slice 6b (2026-06-09): the framer-motion drag wrapper. The drag
// is driven by dragControls started from the card's drag handle (dragListener
// is off), so a touch on the rest of the card scrolls normally and only the
// handle initiates a drag. dragSnapToOrigin returns the card to place; the
// parent decides on drop, via onDragEnd hit-testing, whether the card changed
// bucket. Respects prefers-reduced-motion (disables the layout animation).
// No emojis. No em or en dashes.

import { motion, useDragControls, useReducedMotion } from 'framer-motion';
import { ScheduleSupplementCard } from './ScheduleSupplementCard';
import type { ScheduleCard } from '@/lib/caq/supplements/timing/assignTiming';
import type { TimeOfDay } from '@/lib/caq/supplements/timing/types';

export function DraggableScheduleCard({
  card,
  taken,
  onToggle,
  onMove,
  onCardDragEnd,
}: {
  card: ScheduleCard;
  taken: boolean;
  onToggle: () => void;
  onMove: (t: TimeOfDay) => void;
  onCardDragEnd: (card: ScheduleCard, point: { x: number; y: number }) => void;
}) {
  const controls = useDragControls();
  const reduced = useReducedMotion();

  return (
    <motion.div
      data-slot-id={card.slot_id}
      layout={reduced ? false : 'position'}
      drag
      dragListener={false}
      dragControls={controls}
      dragSnapToOrigin
      dragElastic={0.12}
      dragMomentum={false}
      whileDrag={{ scale: 1.03, zIndex: 50, cursor: 'grabbing' }}
      onDragEnd={(_e, info) => onCardDragEnd(card, info.point)}
    >
      <ScheduleSupplementCard
        card={card}
        taken={taken}
        onToggle={onToggle}
        onMove={onMove}
        onHandlePointerDown={(e) => controls.start(e)}
      />
    </motion.div>
  );
}

export default DraggableScheduleCard;
