'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { reportSupabaseError } from '@/lib/utils/schema-drift';
import {
  activeChallengeCount,
  formatHelixBalance,
  mapChallengeViews,
  mapLeaderboardRows,
  mapReferralStats,
  viewerLeaderboardRank,
  type HelixChallengeView,
  type HelixLeaderboardEntry,
  type HelixReferralStats,
} from '@/lib/helix/consumer-honesty';

export interface HelixConsumerSnapshot {
  loading: boolean;
  userId: string | null;
  leaderboard: HelixLeaderboardEntry[];
  myRank: number | null;
  challenges: HelixChallengeView[];
  activeChallenges: number;
  referralCode: string | null;
  referralStats: HelixReferralStats;
}

const EMPTY_STATS: HelixReferralStats = {
  invitesSent: 0,
  friendsJoined: 0,
  helixEarned: 0,
  pending: 0,
};

const EMPTY: HelixConsumerSnapshot = {
  loading: true,
  userId: null,
  leaderboard: [],
  myRank: null,
  challenges: [],
  activeChallenges: 0,
  referralCode: null,
  referralStats: EMPTY_STATS,
};

export function useHelixConsumerSnapshot(): HelixConsumerSnapshot {
  const [state, setState] = useState<HelixConsumerSnapshot>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) {
            setState({ ...EMPTY, loading: false });
          }
          return;
        }

        const [board, challenges, participants, referrals, codeRes] = await Promise.all([
          supabase
            .from('helix_leaderboard')
            .select('user_id, display_name, rank, score')
            .order('rank', { ascending: true })
            .limit(25),
          supabase
            .from('helix_challenges')
            .select('id, name, description, challenge_type, token_reward, is_active, target_value')
            .order('created_at', { ascending: false })
            .limit(24),
          supabase
            .from('helix_challenge_participants')
            .select('challenge_id, user_id, status, current_progress, target_value'),
          supabase
            .from('helix_referrals')
            .select('referred_user_id, referrer_tokens_awarded, status')
            .eq('referrer_id', user.id),
          fetch('/api/helix/referral-code', { credentials: 'include' }),
        ]);

        if (board.error) {
          reportSupabaseError('helix.consumerSnapshot.leaderboard', board.error, {
            table: 'helix_leaderboard',
          });
        }
        if (challenges.error) {
          reportSupabaseError('helix.consumerSnapshot.challenges', challenges.error, {
            table: 'helix_challenges',
          });
        }
        if (participants.error) {
          reportSupabaseError('helix.consumerSnapshot.participants', participants.error, {
            table: 'helix_challenge_participants',
          });
        }
        if (referrals.error) {
          reportSupabaseError('helix.consumerSnapshot.referrals', referrals.error, {
            table: 'helix_referrals',
          });
        }

        const leaderboard = mapLeaderboardRows(
          (board.error ? [] : board.data) ?? [],
          user.id,
        );
        const challengeViews = mapChallengeViews(
          (challenges.error ? [] : challenges.data) ?? [],
          (participants.error ? [] : participants.data) ?? [],
          user.id,
        );
        const referralStats = mapReferralStats(
          (referrals.error ? [] : referrals.data) ?? [],
        );

        let referralCode: string | null = null;
        if (codeRes.ok) {
          try {
            const body = (await codeRes.json()) as { code?: unknown };
            if (typeof body.code === 'string' && body.code.trim().length > 0) {
              referralCode = body.code.trim();
            }
          } catch {
            referralCode = null;
          }
        }

        if (cancelled) return;
        setState({
          loading: false,
          userId: user.id,
          leaderboard,
          myRank: viewerLeaderboardRank(leaderboard),
          challenges: challengeViews,
          activeChallenges: activeChallengeCount(challengeViews),
          referralCode,
          referralStats,
        });
      } catch {
        if (!cancelled) {
          setState({ ...EMPTY, loading: false });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

export function snapshotBalance(raw: number | null | undefined): number {
  return formatHelixBalance(raw);
}
