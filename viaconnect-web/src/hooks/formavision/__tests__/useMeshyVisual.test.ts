import { describe, expect, it } from 'vitest';
import { shouldKickMeshyCreate } from '../useMeshyVisual';

describe('shouldKickMeshyCreate', () => {
  it('POSTs create when an existing sessionId has not been kicked yet', () => {
    expect(shouldKickMeshyCreate('11111111-1111-4111-8111-111111111111', null)).toBe(
      true,
    );
  });

  it('does not re-POST the same sessionId', () => {
    expect(
      shouldKickMeshyCreate(
        '11111111-1111-4111-8111-111111111111',
        '11111111-1111-4111-8111-111111111111',
      ),
    ).toBe(false);
  });

  it('is a no-op without a sessionId', () => {
    expect(shouldKickMeshyCreate(null, null)).toBe(false);
    expect(shouldKickMeshyCreate('', null)).toBe(false);
  });
});
