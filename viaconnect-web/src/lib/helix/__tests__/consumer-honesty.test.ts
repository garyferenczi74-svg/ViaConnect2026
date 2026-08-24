import { describe, expect, it } from 'vitest';
import { helixTierFromPoints } from '../tier-display';
import {
  CHALLENGES_EMPTY,
  LEADERBOARD_EMPTY,
  NOT_ANALYZED,
  NOT_ENOUGH_DATA,
  SQUAD_CHAT_EMPTY,
  activeChallengeCount,
  formatHelixBalance,
  formatHelixRank,
  leaderboardMaxHelix,
  mapChallengeViews,
  mapLeaderboardRows,
  mapReferralStats,
  progressPercent,
  viewerLeaderboardRank,
} from '../consumer-honesty';

describe('Brief 15b Helix honesty mappers', () => {
  it('treats a missing leaderboard as empty, never Sarah K / 4350', () => {
    expect(mapLeaderboardRows(null, 'u-1')).toEqual([]);
    expect(mapLeaderboardRows([], 'u-1')).toEqual([]);
    expect(formatHelixRank(null)).toBe(NOT_ENOUGH_DATA);
    expect(formatHelixRank(0)).toBe(NOT_ENOUGH_DATA);
    expect(leaderboardMaxHelix([])).toBe(0);
    expect(viewerLeaderboardRank([])).toBeNull();
  });

  it('maps only rows with a real rank, score, and name', () => {
    const entries = mapLeaderboardRows(
      [
        { user_id: 'u-1', display_name: 'Gary F', rank: 1, score: 12 },
        { user_id: 'rival', display_name: null, rank: 2, score: 9 },
        { user_id: 'skip', display_name: 'Ghost', rank: null, score: 4 },
      ],
      'u-1',
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      rank: 1,
      name: 'Gary F',
      helix: 12,
      isYou: true,
    });
    expect(entries[0].name).not.toBe('Sarah K.');
    expect(entries[0].helix).not.toBe(4350);
    expect(viewerLeaderboardRank(entries)).toBe(1);
  });

  it('does not invent challenge progress or participant theater', () => {
    const views = mapChallengeViews(
      [
        {
          id: 'c1',
          name: '10K Steps Sprint',
          description: 'Walk',
          challenge_type: 'steps',
          token_reward: 500,
          is_active: true,
          target_value: 10000,
        },
      ],
      [],
      'u-1',
    );
    expect(views).toHaveLength(1);
    expect(views[0].progress).toBeNull();
    expect(views[0].participants).toBe(0);
    expect(views[0].active).toBe(true);
    expect(progressPercent(null, 100)).toBeNull();
    expect(progressPercent(71, 100)).toBe(71);
  });

  it('computes progress only from a real participant row', () => {
    const views = mapChallengeViews(
      [
        {
          id: 'c1',
          name: 'Perfect Protocol',
          description: null,
          challenge_type: 'supplements',
          token_reward: 750,
          is_active: false,
          target_value: 14,
        },
      ],
      [
        {
          challenge_id: 'c1',
          user_id: 'u-1',
          status: 'active',
          current_progress: 7,
          target_value: 14,
        },
        {
          challenge_id: 'c1',
          user_id: 'u-2',
          status: 'active',
          current_progress: 2,
          target_value: 14,
        },
      ],
      'u-1',
    );
    expect(views[0].progress).toBe(50);
    expect(views[0].participants).toBe(2);
    expect(activeChallengeCount(views)).toBe(0);
  });

  it('keeps 0 Helix as honest empty, never 4350', () => {
    expect(formatHelixBalance(null)).toBe(0);
    expect(formatHelixBalance(undefined)).toBe(0);
    expect(formatHelixBalance(-4)).toBe(0);
    expect(formatHelixBalance(12.9)).toBe(12);
    expect(helixTierFromPoints(0).current).toBe('Bronze');
    expect(helixTierFromPoints(0).current).not.toBe('Champion' as never);
  });

  it('counts referral stats from rows only', () => {
    expect(mapReferralStats(null)).toEqual({
      invitesSent: 0,
      friendsJoined: 0,
      helixEarned: 0,
      pending: 0,
    });
    expect(
      mapReferralStats([
        { referred_user_id: 'a', referrer_tokens_awarded: 100, status: 'joined' },
        { referred_user_id: null, referrer_tokens_awarded: 0, status: 'pending' },
      ]),
    ).toEqual({
      invitesSent: 2,
      friendsJoined: 1,
      helixEarned: 100,
      pending: 1,
    });
  });

  it('keeps empty copy honest', () => {
    expect(NOT_ANALYZED).toBe('Not analyzed');
    expect(LEADERBOARD_EMPTY).toContain('Not enough data');
    expect(CHALLENGES_EMPTY).toContain('Not enough data');
    expect(SQUAD_CHAT_EMPTY).toContain('not live');
  });
});
