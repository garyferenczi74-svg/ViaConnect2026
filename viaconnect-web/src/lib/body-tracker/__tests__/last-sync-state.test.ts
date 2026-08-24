import { describe, it, expect } from 'vitest';
import {
  LAST_SYNC_KINDS,
  formatSyncedRelative,
  oauthNeedsReconnect,
  resolveLastSyncState,
} from '../last-sync-state';

const NOW = Date.parse('2026-08-24T10:00:00.000Z');

describe('Brief 12 last-sync state machine', () => {
  it('exposes the locked four states only', () => {
    expect(LAST_SYNC_KINDS).toEqual([
      'not_connected',
      'connected_never_synced',
      'synced',
      'needs_reconnect',
    ]);
  });

  it('never invents a relative last-sync without a real timestamp', () => {
    const empty = resolveLastSyncState({ linked: false, lastSyncAt: null, now: NOW });
    expect(empty).toEqual({
      kind: 'not_connected',
      label: 'Not connected',
      lastSyncAt: null,
    });
    expect(empty.label).not.toMatch(/5 min ago/);
    expect(empty.label).not.toMatch(/Active/);
    expect(formatSyncedRelative('', NOW)).toBeNull();
    expect(formatSyncedRelative('not-a-date', NOW)).toBeNull();
  });

  it('uses Connected never synced instead of Active + Never synced', () => {
    const state = resolveLastSyncState({
      linked: true,
      lastSyncAt: null,
      now: NOW,
    });
    expect(state.kind).toBe('connected_never_synced');
    expect(state.label).toBe('Connected never synced');
    expect(state.lastSyncAt).toBeNull();
    expect(`${state.label}`).not.toMatch(/Active/);
    expect(`${state.label}`).not.toMatch(/Never synced/);
  });

  it('formats Synced relative only from a real persist timestamp', () => {
    const state = resolveLastSyncState({
      linked: true,
      lastSyncAt: '2026-08-24T09:55:00.000Z',
      now: NOW,
    });
    expect(state.kind).toBe('synced');
    expect(state.label).toBe('Synced 5 min ago');
    expect(state.lastSyncAt).toBe('2026-08-24T09:55:00.000Z');
  });

  it('uses Needs reconnect when the token path is broken', () => {
    expect(
      oauthNeedsReconnect({ status: 'connected', has_tokens: false }, true),
    ).toBe(true);
    expect(oauthNeedsReconnect({ status: 'error', has_tokens: true }, true)).toBe(true);
    expect(oauthNeedsReconnect({ status: 'connected', has_tokens: true }, false)).toBe(
      false,
    );
    const state = resolveLastSyncState({
      linked: false,
      lastSyncAt: '2026-08-24T09:55:00.000Z',
      needsReconnect: true,
      now: NOW,
    });
    expect(state).toEqual({
      kind: 'needs_reconnect',
      label: 'Needs reconnect',
      lastSyncAt: null,
    });
  });
});
