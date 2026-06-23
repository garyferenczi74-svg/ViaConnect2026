import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { newCorrelationId, logScanEvent } from '../correlation';

// Spy on the safeLog module
vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { safeLog } from '@/lib/utils/safe-log';

describe('newCorrelationId', () => {
  it('is deterministic and contains the seed', () => {
    const id1 = newCorrelationId('s1');
    const id2 = newCorrelationId('s1');
    expect(id1).toBe(id2);
    expect(id1).toContain('s1');
  });

  it('differs for different seeds', () => {
    expect(newCorrelationId('abc')).not.toBe(newCorrelationId('xyz'));
  });
});

describe('logScanEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls safeLog.info with the stage and correlationId in the fields', () => {
    logScanEvent('started', 'scan_s1', { userId: 'u1' });
    expect(safeLog.info).toHaveBeenCalledWith(
      'scan.telemetry',
      'started',
      expect.objectContaining({ correlationId: 'scan_s1', userId: 'u1' })
    );
  });

  it('passes all extra fields through to safeLog', () => {
    logScanEvent('completed', 'scan_s2', { userId: 'u2', entryId: 'e9' });
    expect(safeLog.info).toHaveBeenCalledWith(
      'scan.telemetry',
      'completed',
      expect.objectContaining({ correlationId: 'scan_s2', entryId: 'e9' })
    );
  });
});
