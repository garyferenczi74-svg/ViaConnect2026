// ============================================================
// Helix Rewards System — TypeScript Interfaces
// ViaConnect 2026
// ============================================================

export interface HelixBalance {
  id: string;
  user_id: string;
  balance: number;
  lifetime_earned: number;
  lifetime_redeemed: number;
  current_streak: number;
  longest_streak: number;
  level: number;
  level_name: string;
  xp_to_next_level: number;
  created_at: string;
  updated_at: string;
}

export interface HelixTransaction {
  id: string;
  user_id: string;
  amount: number;
  type:
    | 'earn_supplement'
    | 'earn_steps'
    | 'earn_meal'
    | 'earn_checkin'
    | 'earn_workout'
    | 'earn_sleep'
    | 'earn_weight'
    | 'earn_biomarker'
    | 'earn_referral'
    | 'earn_friend_bonus'
    | 'earn_subscription'
    | 'earn_research'
    | 'earn_challenge'
    | 'earn_streak_bonus'
    | 'redeem'
    | 'admin_adjust'
    | 'expire';
  description: string | null;
  metadata: Record<string, unknown>;
  challenge_id: string | null;
  referral_id: string | null;
  created_at: string;
}

export interface HelixChallenge {
  id: string;
  title: string;
  description: string | null;
  type: string;
  reward_helix: number;
  target_value: number;
  target_unit: string;
  duration_days: number;
  max_participants: number | null;
  is_recurring: boolean;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface HelixChallengeParticipant {
  id: string;
  challenge_id: string;
  user_id: string;
  progress: number;
  progress_percent: number;
  completed_at: string | null;
  rank: number | null;
  helix_earned: number;
  joined_at: string;
  created_at: string;
}

export interface HelixSquad {
  id: string;
  name: string;
  description: string | null;
  avatar_color: string;
  created_by: string;
  max_members: number;
  is_public: boolean;
  invite_code: string | null;
  created_at: string;
}

export interface HelixSquadMember {
  id: string;
  squad_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  created_at: string;
}

export interface HelixMessage {
  id: string;
  squad_id: string;
  user_id: string;
  content: string;
  message_type: 'text' | 'image' | 'achievement' | 'system';
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface HelixReferral {
  id: string;
  referrer_id: string;
  referred_email: string;
  referred_user_id: string | null;
  referral_code: string;
  status: 'pending' | 'signed_up' | 'qualified' | 'rewarded' | 'expired';
  referrer_helix_awarded: number;
  referred_helix_awarded: number;
  created_at: string;
}

export interface HelixResearchConsent {
  id: string;
  user_id: string;
  consent_biomarkers: boolean;
  consent_supplements: boolean;
  consent_lifestyle: boolean;
  consent_anonymized_sharing: boolean;
  is_enrolled: boolean;
  monthly_helix_rate: number;
  enrolled_at: string | null;
  withdrawn_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface HelixReward {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  cost_helix: number;
  category: string;
  is_active: boolean;
  stock: number | null;
  created_at: string;
}

export interface HelixRedemption {
  id: string;
  user_id: string;
  reward_id: string;
  helix_spent: number;
  status: 'pending' | 'processing' | 'fulfilled' | 'cancelled' | 'refunded';
  fulfilled_at: string | null;
  created_at: string;
}

export interface HelixDailyAction {
  id: string;
  user_id: string;
  action_date: string;
  action_type: string;
  helix_awarded: number;
  completed_at: string;
  created_at: string;
}

export interface HelixLeaderboardEntry {
  id: string;
  user_id: string;
  week_start: string;
  helix_earned: number;
  challenges_completed: number;
  streak_days: number;
  rank: number | null;
  created_at: string;
}

export interface HelixLevel {
  level: number;
  name: string;
  min_lifetime_helix: number;
  badge_icon: string | null;
  perks: Record<string, unknown>;
  created_at: string;
}
