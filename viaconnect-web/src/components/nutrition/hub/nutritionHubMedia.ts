// Prompt 189 (2026-06-11): per card background media for the My Nutrition hub.
//
// One typed config drives the five hub cards that carry real media (one image
// + four videos), the same way the My Biology SURFACES entries describe
// theirs: Supabase storage URL verbatim, poster '' on videos, objectPosition
// 'center', and the card's own gradient constant as the fail open placeholder.
// The other tiles (Nutrition Score, Daily Macros, 7 Day Meal History) are
// deliberately absent from this map: they keep their gradient seams.
//
// INTENTIONAL MAPPING (Gary, Prompt 189): two file names do NOT line up with
// their card names and that is deliberate, not a paste error. Do not "fix" it
// by matching filenames to cards:
//   - logYourMeal plays the file NAMED "Nutrition by Genetics.mp4".
//   - nutritionByGenetics plays "A_fit_well_dressed_attractive.mp4".
//
// Standing rules honored: tokens only (the gradients below are the existing
// Prompt 183 hub constants moved here verbatim, no new colors), no emojis, no
// em or en dashes anywhere.

import type { SurfaceMedia } from '@/components/body-tracker/hub/hubConfig';

// The per card gradient seam constants, moved VERBATIM from NutritionHub.tsx
// (Prompt 183) so the media config and the gradient only tiles share one
// source. Teal corners for the data tiles, an orange corner for the priority
// Log Your Meal tile, mirroring the My Biology hub card palette.
export const MEDIA_TEAL_TL =
  'bg-[radial-gradient(120%_120%_at_0%_0%,rgba(45,165,160,0.30)_0%,rgba(30,48,84,0.85)_55%,rgba(26,39,68,1)_100%)]';
export const MEDIA_TEAL_TR =
  'bg-[radial-gradient(110%_110%_at_100%_0%,rgba(45,165,160,0.26)_0%,rgba(30,48,84,0.85)_60%,rgba(26,39,68,1)_100%)]';
export const MEDIA_ORANGE_BR =
  'bg-[radial-gradient(120%_120%_at_100%_100%,rgba(183,94,24,0.30)_0%,rgba(30,48,84,0.85)_55%,rgba(26,39,68,1)_100%)]';
export const MEDIA_TEAL_BL =
  'bg-[radial-gradient(110%_110%_at_0%_100%,rgba(45,165,160,0.26)_0%,rgba(30,48,84,0.85)_60%,rgba(26,39,68,1)_100%)]';
export const MEDIA_TEAL_BC =
  'bg-[radial-gradient(110%_110%_at_50%_100%,rgba(45,165,160,0.26)_0%,rgba(30,48,84,0.85)_60%,rgba(26,39,68,1)_100%)]';
export const MEDIA_TEAL_BR =
  'bg-[radial-gradient(110%_110%_at_100%_100%,rgba(45,165,160,0.26)_0%,rgba(30,48,84,0.85)_60%,rgba(26,39,68,1)_100%)]';

export type NutritionMediaCardKey =
  | 'todaysMeals'
  | 'nutritionScore'
  | 'logYourMeal'
  | 'dailyMacros'
  | 'saveMyMeal'
  | 'nutritionByGenetics'
  | 'nutritionInsights'
  | 'progress'
  | 'mealHistory';

export const NUTRITION_CARD_MEDIA: Record<NutritionMediaCardKey, SurfaceMedia> = {
  // Today's Meals is the one still image. Its placeholder is MEDIA_TEAL_TL,
  // the closest existing navy safe constant to the card's translucent navy
  // surface; no new gradient is invented for it.
  todaysMeals: {
    kind: 'image',
    src: 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Images/Food%203.png',
    objectPosition: 'center',
    gradientClass: MEDIA_TEAL_TL,
  },
  logYourMeal: {
    kind: 'video',
    src: 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/Nutrition%20by%20Genetics.mp4',
    poster: '',
    objectPosition: 'center',
    gradientClass: MEDIA_ORANGE_BR,
  },
  // Gary (2026-06-11): Nutrition Score gains the Mountain top background video.
  nutritionScore: {
    kind: 'video',
    src: 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/Mountain%20top.mp4',
    poster: '',
    objectPosition: 'center',
    gradientClass: MEDIA_TEAL_TL,
  },
  // Gary (2026-06-11): Daily Macros gains the Food 5 background video.
  dailyMacros: {
    kind: 'video',
    src: 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/Food%205.mp4',
    poster: '',
    objectPosition: 'center',
    gradientClass: MEDIA_TEAL_TR,
  },
  saveMyMeal: {
    kind: 'video',
    src: 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/Save%20a%20meal.mp4',
    poster: '',
    objectPosition: 'center',
    gradientClass: MEDIA_TEAL_BL,
  },
  nutritionByGenetics: {
    kind: 'video',
    src: 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/A_fit_well_dressed_attractive.mp4',
    poster: '',
    objectPosition: 'center',
    gradientClass: MEDIA_TEAL_BC,
  },
  nutritionInsights: {
    kind: 'video',
    src: 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/Nutrition%20insights.mp4',
    poster: '',
    objectPosition: 'center',
    gradientClass: MEDIA_TEAL_BR,
  },
  // Prompt 200 (2026-06-15): the Progress Row 3 tile gains a background video.
  progress: {
    kind: 'video',
    src: 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/an_atractive_fit_woman_in_the.mp4',
    poster: '',
    objectPosition: 'center',
    gradientClass: MEDIA_TEAL_TL,
  },
  // Gary (2026-06-11): 7 Day Meal History gains the Woman on beach video.
  mealHistory: {
    kind: 'video',
    src: 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/Woman%20on%20beach.mp4',
    poster: '',
    objectPosition: 'center',
    gradientClass: MEDIA_TEAL_BC,
  },
};
