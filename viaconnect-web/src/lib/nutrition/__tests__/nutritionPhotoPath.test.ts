import { describe, it, expect } from 'vitest';
import {
  ownedNutritionPhotoPath,
  storagePathFromPhotoUrl,
} from '@/lib/nutrition/nutritionPhotoPath';

const USER = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const OTHER = '11111111-2222-3333-4444-555555555555';

describe('nutritionPhotoPath owner guard', () => {
  it('accepts relative owner paths', () => {
    expect(
      ownedNutritionPhotoPath(USER, `${USER}/2026-08/photo.jpg`),
    ).toBe(`${USER}/2026-08/photo.jpg`);
  });

  it('rejects cross-user paths', () => {
    expect(
      ownedNutritionPhotoPath(USER, `${OTHER}/2026-08/photo.jpg`),
    ).toBeNull();
  });

  it('rejects traversal and bare user folder', () => {
    expect(ownedNutritionPhotoPath(USER, `${USER}/../${OTHER}/x.jpg`)).toBeNull();
    expect(ownedNutritionPhotoPath(USER, `${USER}/`)).toBeNull();
    expect(ownedNutritionPhotoPath(USER, USER)).toBeNull();
  });

  it('parses signed URL under nutrition-photos then enforces owner', () => {
    const url = `https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/sign/nutrition-photos/${OTHER}/x.jpg?token=abc`;
    const resolved = storagePathFromPhotoUrl(url);
    expect(resolved).toBe(`${OTHER}/x.jpg`);
    expect(ownedNutritionPhotoPath(USER, resolved)).toBeNull();
    expect(ownedNutritionPhotoPath(OTHER, resolved)).toBe(`${OTHER}/x.jpg`);
  });
});
