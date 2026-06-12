// Prompt 189 (2026-06-11): contract tests for the My Nutrition per card media
// config. These lock the five EXACT Supabase URLs verbatim (percent encoding
// included), the kinds (one image + four videos), poster '' + objectPosition
// 'center' on the videos, the gradient constants moved verbatim from
// NutritionHub, the INTENTIONAL file to card mapping, and the no dash rule.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  MEDIA_ORANGE_BR,
  MEDIA_TEAL_BC,
  MEDIA_TEAL_BL,
  MEDIA_TEAL_BR,
  MEDIA_TEAL_TL,
  MEDIA_TEAL_TR,
  NUTRITION_CARD_MEDIA,
} from '../nutritionHubMedia';

const SOURCE = path.resolve(__dirname, '..', 'nutritionHubMedia.ts');

describe('NUTRITION_CARD_MEDIA config', () => {
  it('has exactly the eight card keys', () => {
    expect(Object.keys(NUTRITION_CARD_MEDIA).sort()).toEqual([
      'dailyMacros',
      'logYourMeal',
      'mealHistory',
      'nutritionByGenetics',
      'nutritionInsights',
      'nutritionScore',
      'saveMyMeal',
      'todaysMeals',
    ]);
  });

  it('mealHistory carries the exact Woman on beach Hero Videos URL (Gary 2026-06-11)', () => {
    expect(NUTRITION_CARD_MEDIA.mealHistory.kind).toBe('video');
    expect(NUTRITION_CARD_MEDIA.mealHistory.src).toBe(
      'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/Woman%20on%20beach.mp4',
    );
    expect(NUTRITION_CARD_MEDIA.mealHistory.poster).toBe('');
    expect(NUTRITION_CARD_MEDIA.mealHistory.objectPosition).toBe('center');
  });

  it('nutritionScore carries the exact Mountain top Hero Videos URL (Gary 2026-06-11)', () => {
    expect(NUTRITION_CARD_MEDIA.nutritionScore.kind).toBe('video');
    expect(NUTRITION_CARD_MEDIA.nutritionScore.src).toBe(
      'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/Mountain%20top.mp4',
    );
    expect(NUTRITION_CARD_MEDIA.nutritionScore.poster).toBe('');
    expect(NUTRITION_CARD_MEDIA.nutritionScore.objectPosition).toBe('center');
  });

  it('dailyMacros carries the exact Food 5 Hero Videos URL (Gary 2026-06-11)', () => {
    expect(NUTRITION_CARD_MEDIA.dailyMacros.kind).toBe('video');
    expect(NUTRITION_CARD_MEDIA.dailyMacros.src).toBe(
      'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/Food%205.mp4',
    );
    expect(NUTRITION_CARD_MEDIA.dailyMacros.poster).toBe('');
    expect(NUTRITION_CARD_MEDIA.dailyMacros.objectPosition).toBe('center');
  });

  it('todaysMeals is the one still image with the exact Hero Images URL', () => {
    expect(NUTRITION_CARD_MEDIA.todaysMeals.kind).toBe('image');
    expect(NUTRITION_CARD_MEDIA.todaysMeals.src).toBe(
      'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Images/Food%203.png',
    );
    expect(NUTRITION_CARD_MEDIA.todaysMeals.objectPosition).toBe('center');
  });

  it('the four videos carry their exact Hero Videos URLs verbatim', () => {
    expect(NUTRITION_CARD_MEDIA.logYourMeal.src).toBe(
      'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/Nutrition%20by%20Genetics.mp4',
    );
    expect(NUTRITION_CARD_MEDIA.saveMyMeal.src).toBe(
      'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/Save%20a%20meal.mp4',
    );
    expect(NUTRITION_CARD_MEDIA.nutritionByGenetics.src).toBe(
      'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/A_fit_well_dressed_attractive.mp4',
    );
    expect(NUTRITION_CARD_MEDIA.nutritionInsights.src).toBe(
      'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/Nutrition%20insights.mp4',
    );
  });

  it('every video is kind video with poster empty string and objectPosition center', () => {
    const videoKeys = [
      'logYourMeal',
      'saveMyMeal',
      'nutritionByGenetics',
      'nutritionInsights',
    ] as const;
    for (const key of videoKeys) {
      const m = NUTRITION_CARD_MEDIA[key];
      expect(m.kind).toBe('video');
      expect(m.poster).toBe('');
      expect(m.objectPosition).toBe('center');
    }
  });

  it('INTENTIONAL MAPPING LOCK: filenames deliberately do not match card names', () => {
    // Per Gary (Prompt 189) this is deliberate, NOT a paste error: the Log
    // Your Meal card plays the file NAMED "Nutrition by Genetics.mp4" and the
    // Nutrition by Genetics card plays "A_fit_well_dressed_attractive.mp4".
    // Do not "fix" this by matching filenames to card names.
    expect(NUTRITION_CARD_MEDIA.logYourMeal.src?.endsWith('Nutrition%20by%20Genetics.mp4')).toBe(
      true,
    );
    expect(
      NUTRITION_CARD_MEDIA.nutritionByGenetics.src?.endsWith('A_fit_well_dressed_attractive.mp4'),
    ).toBe(true);
  });

  it('each card reuses its existing gradient constant', () => {
    expect(NUTRITION_CARD_MEDIA.logYourMeal.gradientClass).toBe(MEDIA_ORANGE_BR);
    expect(NUTRITION_CARD_MEDIA.saveMyMeal.gradientClass).toBe(MEDIA_TEAL_BL);
    expect(NUTRITION_CARD_MEDIA.nutritionByGenetics.gradientClass).toBe(MEDIA_TEAL_BC);
    expect(NUTRITION_CARD_MEDIA.nutritionInsights.gradientClass).toBe(MEDIA_TEAL_BR);
    // Today's Meals reuses the closest existing navy safe constant, no new colors.
    expect(NUTRITION_CARD_MEDIA.todaysMeals.gradientClass).toBe(MEDIA_TEAL_TL);
  });

  it('the six constants kept their Prompt 183 values byte for byte', () => {
    expect(MEDIA_TEAL_TL).toBe(
      'bg-[radial-gradient(120%_120%_at_0%_0%,rgba(45,165,160,0.30)_0%,rgba(30,48,84,0.85)_55%,rgba(26,39,68,1)_100%)]',
    );
    expect(MEDIA_TEAL_TR).toBe(
      'bg-[radial-gradient(110%_110%_at_100%_0%,rgba(45,165,160,0.26)_0%,rgba(30,48,84,0.85)_60%,rgba(26,39,68,1)_100%)]',
    );
    expect(MEDIA_ORANGE_BR).toBe(
      'bg-[radial-gradient(120%_120%_at_100%_100%,rgba(183,94,24,0.30)_0%,rgba(30,48,84,0.85)_55%,rgba(26,39,68,1)_100%)]',
    );
    expect(MEDIA_TEAL_BL).toBe(
      'bg-[radial-gradient(110%_110%_at_0%_100%,rgba(45,165,160,0.26)_0%,rgba(30,48,84,0.85)_60%,rgba(26,39,68,1)_100%)]',
    );
    expect(MEDIA_TEAL_BC).toBe(
      'bg-[radial-gradient(110%_110%_at_50%_100%,rgba(45,165,160,0.26)_0%,rgba(30,48,84,0.85)_60%,rgba(26,39,68,1)_100%)]',
    );
    expect(MEDIA_TEAL_BR).toBe(
      'bg-[radial-gradient(110%_110%_at_100%_100%,rgba(45,165,160,0.26)_0%,rgba(30,48,84,0.85)_60%,rgba(26,39,68,1)_100%)]',
    );
  });

  it('source carries the INTENTIONAL MAPPING comment and no em or en dashes', () => {
    const source = readFileSync(SOURCE, 'utf-8');
    expect(source).toContain('INTENTIONAL MAPPING');
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
