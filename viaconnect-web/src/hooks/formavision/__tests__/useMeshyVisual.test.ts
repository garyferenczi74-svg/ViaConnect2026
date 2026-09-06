import { describe, expect, it } from 'vitest';
import { emptyMeshyVisual } from '@/lib/formavision/meshy/meshyVisualState';
import {
  noSessionMeshyVisual,
  shouldKickMeshyCreate,
  timedOutMeshyVisual,
} from '../useMeshyVisual';

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

describe('already-Ready Meshy client terminals', () => {
  it('history-resolved Ready without a FRBL session is failed, not idle Loading', () => {
    const visual = noSessionMeshyVisual('2026-09-06T00:00:00.000Z');
    expect(visual.status).toBe('failed');
    expect(visual.errorCode).toBe('no_photos');
    expect(visual.glbPath).toBeNull();
  });

  it('bounded wait turns pending Meshy into a timeout failure', () => {
    const pending = {
      ...emptyMeshyVisual('2026-09-06T00:00:00.000Z'),
      status: 'pending' as const,
      taskId: 'task-1',
    };
    const timedOut = timedOutMeshyVisual(pending, '2026-09-06T00:02:00.000Z');
    expect(timedOut.status).toBe('failed');
    expect(timedOut.errorCode).toBe('timeout');
  });
});
