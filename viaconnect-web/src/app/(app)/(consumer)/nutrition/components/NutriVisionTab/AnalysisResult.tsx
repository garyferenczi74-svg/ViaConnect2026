'use client';

// Prompt #170 Phase 1l: review screen orchestrator.
// Prompt #170j Phase 1c-2: voice editing surfaces mounted at the end of
// the result review screen. Voice is gracefully degraded off when the
// parent does not supply onRemoveChip + onRestoreSnapshot.
// Prompt 172 Phase 1A: card body subtree extracted into MealCard. The
// totals box, modification chips, items list, add item button, save bar,
// and FdaDisclaimer slot all move into MealCard. AnalysisResult continues
// to own the photo thumbnail, meal type picker, plate selector, confidence
// badge, corpus opt in banner, and voice session orchestration; those land
// in MealCard as slots so the rendered DOM tree stays byte equivalent.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { useState } from 'react';
import { Maximize2, X } from 'lucide-react';
import type { CookingOilSelection } from '@/lib/nutrition/cooking-oil/types';
import { ClarificationCard } from '@/lib/nutrition/voice/components/ClarificationCard';
import { ErrorCard } from '@/lib/nutrition/voice/components/ErrorCard';
import { OperationPreview } from '@/lib/nutrition/voice/components/OperationPreview';
import { QuickApplyToast } from '@/lib/nutrition/voice/components/QuickApplyToast';
import { VoiceCaptureOverlay } from '@/lib/nutrition/voice/components/VoiceCaptureOverlay';
import { VoiceEditedChip } from '@/lib/nutrition/voice/components/VoiceEditedChip';
import { VoiceFAB } from '@/lib/nutrition/voice/components/VoiceFAB';
import { VoiceHelpSheet } from '@/lib/nutrition/voice/components/VoiceHelpSheet';
import { VoiceTutorial } from '@/lib/nutrition/voice/components/VoiceTutorial';
import { useVoiceSession } from '@/lib/nutrition/voice/hooks/useVoiceSession';
import { MealCard } from '@/components/nutrition/meal-card';
import { toMealCardModel } from '@/components/nutrition/meal-card/mealCardModel';
import { ConfidenceBadge } from './ConfidenceBadge';
import { CorpusOptInBanner } from './CorpusOptInBanner';
import { MealTypePicker } from './MealTypePicker';
import { PlateSelector } from './PlateSelector';
import { classifyConfidence } from './types';
import type {
  MealDraft,
  MealItemDraft,
  FoodSwapReplacement,
  ModifierChip,
  MealType,
  PlateSelectorKind,
} from './types';

interface AnalysisResultProps {
  draft: MealDraft;
  userId: string | null;
  corpusOptedIn: boolean;
  corpusDismissed: boolean;
  isSaving: boolean;
  mealType: MealType;
  onMealTypeChange: (next: MealType) => void;
  onCorpusDismiss: () => void;
  onCorpusOptIn: () => void;
  onPortionChange: (itemId: string, grams: number) => void;
  onFoodSwap: (itemId: string, replacement: FoodSwapReplacement) => void;
  onCookingOilChange: (itemId: string, selection: CookingOilSelection) => void;
  onApplyChip: (itemId: string | 'meal', chip: ModifierChip) => void;
  onAddItem: () => void;
  onRemoveItem: (itemId: string) => void;
  onMarkVerified: (itemId: string) => void;
  // #170a supplement §17.2: parent plumbs the selection up to useMealItemEdits
  // so the save payload carries plate_size on the meal row.
  onPlateSizeChange: (kind: PlateSelectorKind) => void;
  // #170j Phase 1c-2 voice mutators: when both are provided, voice is enabled.
  // Either omitted gracefully disables voice rendering.
  onRemoveChip?: (itemId: string | 'meal', chip: ModifierChip) => void;
  onRestoreSnapshot?: (items: ReadonlyArray<MealItemDraft>) => void;
  onAppendItem?: (item: MealItemDraft) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function AnalysisResult(props: AnalysisResultProps) {
  const { draft } = props;
  const band = classifyConfidence(draft.meal_confidence);
  const showPlateSelector = draft.credit_card_detected !== true;

  const voiceAvailable = Boolean(
    props.onRemoveChip && props.onRestoreSnapshot && props.onAppendItem
  );
  const noopRemoveChip: NonNullable<typeof props.onRemoveChip> = () => {};
  const noopRestoreSnapshot: NonNullable<typeof props.onRestoreSnapshot> = () => {};
  const noopAppendItem: NonNullable<typeof props.onAppendItem> = () => {};

  const voiceSession = useVoiceSession({
    draft,
    mutators: {
      setPortion: props.onPortionChange,
      setCookingOil: props.onCookingOilChange,
      applyChip: props.onApplyChip,
      removeChip: props.onRemoveChip ?? noopRemoveChip,
      removeItem: props.onRemoveItem,
    },
    restoreSnapshot: props.onRestoreSnapshot ?? noopRestoreSnapshot,
    appendItem: props.onAppendItem ?? noopAppendItem,
  });

  const voiceSessionCount = Math.ceil(voiceSession.apply.state.voice_operation_count / 3);
  const recentPreviews: string[] = [];

  // Prompt 172 Phase 1A: build the MealCard view model at the orchestrator
  // boundary. Pre save the SaveResponse is undefined so mealId and
  // mealQualityScore land null. AnalysisResult itself is pre save in 1A;
  // post save lifting is wired in 172c when the orchestrator hands a
  // SaveResponse through onSaveResponse.
  const mealCardModel = toMealCardModel({
    draft,
    photoUrl: draft.thumbnail_url ?? null,
    safetyMode: false,
    degradedService: false,
    recognitionConfidence: band,
  });

  // Slots passed down so MealCard renders these in byte equivalent
  // positions while AnalysisResult retains the source of truth wiring for
  // the underlying components.
  const confidenceBadgeSlot = (
    <ConfidenceBadge band={band} score={draft.meal_confidence} label="meal" size="md" />
  );
  const voiceEditedChipSlot =
    voiceAvailable && voiceSession.apply.state.voice_operation_count > 0 ? (
      <VoiceEditedChip
        sessionCount={Math.max(1, voiceSessionCount)}
        recentOperationPreviews={recentPreviews}
      />
    ) : null;
  const corpusBannerSlot =
    props.userId !== null ? (
      <CorpusOptInBanner
        userId={props.userId}
        alreadyOptedIn={props.corpusOptedIn}
        dismissed={props.corpusDismissed}
        onDismiss={props.onCorpusDismiss}
        onOptIn={props.onCorpusOptIn}
      />
    ) : null;

  // onSaveResponse is forward looking; 172c wires the post save state lift
  // from log-meal. 1A passes a no-op so the type contract holds without
  // changing behavior.
  const onSaveResponseNoop: (resp: import('./types').SaveResponse) => void = () => {};

  return (
    <>
      <div className="flex flex-col gap-3 pb-24 md:pb-0">
        {/* Prompt 171a: photo thumbnail rendered above the meal type picker
            when the meal was sourced from a photo. Barcode-sourced meals
            never carry thumbnail_url, so the block is hidden for those. */}
        <MealPhotoThumbnail thumbnailUrl={draft.thumbnail_url ?? null} />

        <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-white/55">
            Meal type
          </div>
          <MealTypePicker value={props.mealType} onChange={props.onMealTypeChange} />
        </div>

        {showPlateSelector && (
          <PlateSelector
            value={draft.plate_size}
            onSelect={props.onPlateSizeChange}
          />
        )}

        <MealCard
          model={mealCardModel}
          draft={draft}
          confidenceBadge={confidenceBadgeSlot}
          voiceEditedChip={voiceEditedChipSlot}
          corpusBanner={corpusBannerSlot}
          onConfirm={props.onSave}
          onEdit={() => {}}
          onSplit={() => {}}
          onSaveResponse={onSaveResponseNoop}
          onCancel={props.onCancel}
          onAddItem={props.onAddItem}
          onPortionChange={props.onPortionChange}
          onFoodSwap={props.onFoodSwap}
          onCookingOilChange={props.onCookingOilChange}
          onApplyChip={props.onApplyChip}
          onRemoveItem={props.onRemoveItem}
          onMarkVerified={props.onMarkVerified}
          isSaving={props.isSaving}
        />
      </div>

      {/* Prompt 170j Phase 1c-2: voice surfaces. FAB sits above the Save bar. */}
      {voiceAvailable && voiceSession.phase === 'closed' && (
        <VoiceFAB available={true} onClick={voiceSession.open} />
      )}
      {voiceAvailable && (voiceSession.phase === 'capturing' || voiceSession.phase === 'processing') && (
        <VoiceCaptureOverlay
          state={voiceSession.capture.state}
          onStop={voiceSession.stopCapture}
          onCancel={voiceSession.close}
          onShowHelp={voiceSession.showHelp}
        />
      )}
      {voiceAvailable && voiceSession.phase === 'preview' && voiceSession.nlu.state.result && (
        <OperationPreview
          result={voiceSession.nlu.state.result}
          transcript={voiceSession.capture.state.transcript}
          onApplyAll={voiceSession.applyAll}
          onTryAgain={voiceSession.tryAgain}
          onCancel={voiceSession.close}
        />
      )}
      {voiceAvailable && voiceSession.phase === 'clarifying' && voiceSession.nlu.state.result && (
        <ClarificationCard
          result={voiceSession.nlu.state.result}
          roundNumber={1}
          onAnswer={voiceSession.answerClarification}
          onRetryVoice={voiceSession.tryAgain}
          onCancel={voiceSession.close}
        />
      )}
      {voiceAvailable && voiceSession.phase === 'error' && voiceSession.errorKind && (
        <ErrorCard
          kind={voiceSession.errorKind}
          message={voiceSession.errorMessage}
          onTryAgain={voiceSession.tryAgain}
          onCancel={voiceSession.close}
        />
      )}
      {voiceAvailable && voiceSession.phase === 'applied' && voiceSession.apply.state.undo_window_active && (
        <QuickApplyToast
          appliedCount={voiceSession.apply.state.operations_applied}
          onUndo={voiceSession.undoLast}
          onExpire={voiceSession.dismissToast}
        />
      )}
      {voiceAvailable && voiceSession.phase === 'tutorial' && (
        <VoiceTutorial
          onComplete={voiceSession.onTutorialComplete}
          onSkip={voiceSession.close}
        />
      )}
      {voiceAvailable && (
        <VoiceHelpSheet
          open={voiceSession.helpSheetOpen}
          onClose={voiceSession.hideHelp}
        />
      )}
    </>
  );
}

// Prompt 171a: photo thumbnail + click-to-fullscreen modal.
interface MealPhotoThumbnailProps {
  thumbnailUrl: string | null;
}

function MealPhotoThumbnail({ thumbnailUrl }: MealPhotoThumbnailProps) {
  const [fullscreen, setFullscreen] = useState(false);

  if (typeof thumbnailUrl !== 'string' || thumbnailUrl.length === 0) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setFullscreen(true)}
        aria-label="View meal photo full screen"
        className="group relative w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2DA5A0]"
        style={{ aspectRatio: '16 / 9' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnailUrl}
          alt="Captured meal"
          className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
          loading="lazy"
        />
        <span
          className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full"
          style={{ backgroundColor: 'rgba(26, 39, 68, 0.7)', color: '#FFFFFF' }}
          aria-hidden="true"
        >
          <Maximize2 className="h-3.5 w-3.5" strokeWidth={1.5} />
        </span>
      </button>

      {fullscreen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Meal photo, full screen"
          className="fixed inset-0 z-[150] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.92)' }}
          onClick={() => setFullscreen(false)}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setFullscreen(false); }}
            aria-label="Close full screen photo"
            className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full"
            style={{
              top: 'calc(env(safe-area-inset-top, 0) + 16px)',
              backgroundColor: 'rgba(30, 48, 84, 0.85)',
              color: '#FFFFFF',
            }}
          >
            <X className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbnailUrl}
            alt="Captured meal"
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
