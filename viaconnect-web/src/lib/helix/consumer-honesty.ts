// Brief 15b: consumer Helix / alerts / plugins honesty.
// If there is no real row, render empty / Not analyzed / Not enough data.
// Never invent a rival name, rank, last-sync, variant, ring, or percent.

export const NOT_ENOUGH_DATA = 'Not enough data';
export const NOT_ANALYZED = 'Not analyzed';

export const SQUAD_CHAT_EMPTY =
  'Squad Chat is not live. There are no messages until a real thread exists.';

export const LEADERBOARD_EMPTY =
  'Not enough data. Ranks appear when helix_leaderboard has a real row.';

export const CHALLENGES_EMPTY =
  'Not enough data. Challenges appear when helix_challenges has a real row.';

export const REFERRAL_CODE_EMPTY = 'Not enough data';

const HELIX_ACCENT = ['#2DA5A0', '#B75E18', '#FFD700', '#8B5CF6', '#F472B6', '#C0C0C0'] as const;

export interface HelixLeaderboardRow {
  user_id: string | null;
  display_name: string | null;
  rank: number | null;
  score: number | null;
}

export interface HelixLeaderboardEntry {
  rank: number;
  name: string;
  initials: string;
  helix: number;
  color: string;
  isYou: boolean;
}

export interface HelixChallengeRow {
  id: string;
  name: string;
  description: string | null;
  challenge_type: string;
  token_reward: number;
  is_active: boolean | null;
  target_value: number | null;
}

export interface HelixParticipantRow {
  challenge_id: string | null;
  user_id: string | null;
  status: string | null;
  current_progress: number | null;
  target_value: number | null;
}

export interface HelixChallengeView {
  id: string;
  type: string;
  title: string;
  description: string;
  helix: number;
  active: boolean;
  progress: number | null;
  participants: number | null;
}

export interface HelixReferralStatRow {
  referred_user_id: string | null;
  referrer_tokens_awarded: number | null;
  status: string | null;
}

export interface HelixReferralStats {
  invitesSent: number;
  friendsJoined: number;
  helixEarned: number;
  pending: number;
}

export function initialsFromName(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export function formatHelixRank(rank: number | null | undefined): string {
  if (typeof rank !== 'number' || !Number.isFinite(rank) || rank <= 0) {
    return NOT_ENOUGH_DATA;
  }
  return `#${rank}`;
}

export function formatHelixBalance(balance: number | null | undefined): number {
  if (typeof balance !== 'number' || !Number.isFinite(balance) || balance < 0) return 0;
  return Math.floor(balance);
}

export function progressPercent(
  current: number | null | undefined,
  target: number | null | undefined,
): number | null {
  if (typeof current !== 'number' || typeof target !== 'number') return null;
  if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((current / target) * 100)));
}

export function mapLeaderboardRows(
  rows: HelixLeaderboardRow[] | null | undefined,
  viewerUserId: string | null,
): HelixLeaderboardEntry[] {
  if (!rows || rows.length === 0) return [];
  const entries: HelixLeaderboardEntry[] = [];
  for (const row of rows) {
    const rank = row.rank;
    const score = row.score;
    if (typeof rank !== 'number' || !Number.isFinite(rank) || rank <= 0) continue;
    if (typeof score !== 'number' || !Number.isFinite(score)) continue;
    const isYou = Boolean(viewerUserId && row.user_id === viewerUserId);
    const name = (row.display_name ?? '').trim();
    if (!name && !isYou) continue;
    const displayName = name || 'You';
    entries.push({
      rank,
      name: displayName,
      initials: initialsFromName(displayName),
      helix: Math.floor(score),
      color: HELIX_ACCENT[(rank - 1) % HELIX_ACCENT.length],
      isYou,
    });
  }
  return entries.sort((a, b) => a.rank - b.rank);
}

export function viewerLeaderboardRank(
  entries: HelixLeaderboardEntry[],
): number | null {
  const mine = entries.find((entry) => entry.isYou);
  return mine ? mine.rank : null;
}

export function leaderboardMaxHelix(entries: HelixLeaderboardEntry[]): number {
  if (entries.length === 0) return 0;
  return Math.max(...entries.map((entry) => entry.helix));
}

export function mapChallengeViews(
  challenges: HelixChallengeRow[] | null | undefined,
  participants: HelixParticipantRow[] | null | undefined,
  viewerUserId: string | null,
): HelixChallengeView[] {
  if (!challenges || challenges.length === 0) return [];
  const people = participants ?? [];
  return challenges.map((challenge) => {
    const rows = people.filter((row) => row.challenge_id === challenge.id);
    const mine = viewerUserId
      ? rows.find((row) => row.user_id === viewerUserId)
      : undefined;
    const target = mine?.target_value ?? challenge.target_value;
    return {
      id: challenge.id,
      type: challenge.challenge_type || 'checkin',
      title: challenge.name,
      description: (challenge.description ?? '').trim(),
      helix: Number.isFinite(challenge.token_reward) ? challenge.token_reward : 0,
      active: challenge.is_active === true,
      progress: progressPercent(mine?.current_progress, target),
      participants: rows.length,
    };
  });
}

export function mapReferralStats(
  rows: HelixReferralStatRow[] | null | undefined,
): HelixReferralStats {
  if (!rows || rows.length === 0) {
    return { invitesSent: 0, friendsJoined: 0, helixEarned: 0, pending: 0 };
  }
  let friendsJoined = 0;
  let helixEarned = 0;
  let pending = 0;
  for (const row of rows) {
    if (row.referred_user_id) friendsJoined += 1;
    const awarded = row.referrer_tokens_awarded;
    if (typeof awarded === 'number' && Number.isFinite(awarded)) helixEarned += awarded;
    if (!row.referred_user_id || row.status === 'pending') pending += 1;
  }
  return {
    invitesSent: rows.length,
    friendsJoined,
    helixEarned,
    pending,
  };
}

export function activeChallengeCount(views: HelixChallengeView[]): number {
  return views.filter((view) => view.active).length;
}
