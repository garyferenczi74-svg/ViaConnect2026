'use client';

// Prompt #168c section 2.2: snack stacking container. Shows today's saved
// snacks as collapsed summary rows + one active draft "Snack N" entry +
// a "+ Add another snack" button (disabled until Snack 1 is saved).

import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { Meal, NutritionTargets, MealDistribution } from '@/lib/gordon/types';
import type { QuickLogDraft } from '@/components/meals/QuickLogModal';
import { SnackEntryBlock } from './SnackEntryBlock';

export interface SnackStackContainerProps {
  readonly targets: NutritionTargets;
  readonly mealDistribution?: MealDistribution;
  // Today's snacks already saved, sorted by snack_index ascending.
  readonly todaysSnacks: ReadonlyArray<Meal>;
  // Save handler computes snack_index server-side via the parent's insert path.
  readonly onSaveSnack: (draft: QuickLogDraft, computedSnackIndex: number) => void | Promise<void>;
}

export function SnackStackContainer(props: SnackStackContainerProps) {
  const { targets, mealDistribution, todaysSnacks, onSaveSnack } = props;

  // Active draft state: when true, render an editable Snack N entry block
  // below the saved snacks. Defaults to true the first time the tab is opened
  // (no saved snacks yet) so the user always sees an entry surface.
  const [draftActive, setDraftActive] = useState<boolean>(true);

  const savedCount = todaysSnacks.length;
  const nextSnackIndex = savedCount + 1;
  const canAddAnother = savedCount > 0 && !draftActive;

  const handleSaveDraft = async (draft: QuickLogDraft) => {
    const indexAtSave = nextSnackIndex;
    await onSaveSnack(draft, indexAtSave);
    // After save: collapse the draft so user sees a fresh "+ Add another snack"
    // affordance. Realtime subscription on todaysSnacks repopulates the saved
    // list and the draft surface returns when the user clicks add.
    setDraftActive(false);
  };

  return (
    <div className="flex flex-col gap-3">
      {todaysSnacks.map((snack, index) => (
        <SnackEntryBlock
          key={snack.mealId}
          snackIndex={snack.snackIndex ?? index + 1}
          targets={targets}
          mealDistribution={mealDistribution}
          snacksLoggedToday={savedCount}
          savedMeal={snack}
        />
      ))}

      {draftActive ? (
        <SnackEntryBlock
          snackIndex={nextSnackIndex}
          targets={targets}
          mealDistribution={mealDistribution}
          snacksLoggedToday={savedCount}
          onSaveDraft={handleSaveDraft}
          onCancelDraft={savedCount > 0 ? () => setDraftActive(false) : undefined}
        />
      ) : null}

      <button
        type="button"
        onClick={() => setDraftActive(true)}
        disabled={!canAddAnother}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-transparent px-4 py-3 text-[13px] font-semibold text-white/75 transition-colors hover:border-white/30 hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus className="h-4 w-4" strokeWidth={1.5} />
        <span>Add another snack</span>
      </button>
    </div>
  );
}

export default SnackStackContainer;
