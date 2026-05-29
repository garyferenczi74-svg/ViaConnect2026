// Prompt #170 Phase 1h: barrel for the NutriVision corpus writer and
// conditional photo contribution helpers. Save-time meal-write routes
// import from here.

export {
  writeCorpusRow,
  deriveDominantCuisine,
  collectOilSelections,
  type CorpusSource,
  type CorpusFinalState,
  type CorpusFinalStateItem,
  type CorpusEditDiff,
  type CorpusWriteOpts,
  type CorpusWriteResult,
} from './writer';

export {
  maybeContributePhoto,
  stripImageMetadata,
  type PhotoContributionOpts,
  type PhotoContributionResult,
} from './photo-contribution';
