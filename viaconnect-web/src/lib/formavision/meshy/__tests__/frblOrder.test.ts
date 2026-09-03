import { describe, expect, it } from 'vitest';
import { frblGlbStoragePath, orderFrblPhotos } from '../frblOrder';

describe('orderFrblPhotos', () => {
  it('orders Front, Right, Back, Left and skips missing', () => {
    const photos = orderFrblPhotos({
      back_full_path: 'u/s/back_full_1.jpg',
      front_full_path: 'u/s/front_full_1.jpg',
      left_full_path: null,
      right_full_path: 'u/s/right_full_1.jpg',
    });
    expect(photos.map((p) => p.view)).toEqual(['front', 'right', 'back']);
    expect(photos[0]?.path).toBe('u/s/front_full_1.jpg');
  });

  it('keeps front first when only back and front exist', () => {
    const photos = orderFrblPhotos({
      back_full_path: 'u/s/back.jpg',
      front_full_path: 'u/s/front.jpg',
    });
    expect(photos.map((p) => p.view)).toEqual(['front', 'back']);
  });

  it('returns empty when no poses are stored', () => {
    expect(orderFrblPhotos({})).toEqual([]);
  });

  it('keys the mirrored GLB by user and session', () => {
    expect(frblGlbStoragePath('user-1', 'session-9')).toBe('user-1/session-9/meshy/visual.glb');
  });
});
