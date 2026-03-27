/**
 * ViaConnect Gamification Engine — Achievements & Leveling
 *
 * Defines all 25 achievements, 7 health levels, and provides
 * functions for checking/unlocking achievements and awarding XP.
 */

import { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  requirement: AchievementRequirement;
  tokenReward: number;
  xpReward: number;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
}

export interface AchievementRequirement {
  type: string;
  field?: string;
  value: number;
}

export interface HealthLevel {
  level: number;
  name: string;
  xpRequired: number;
  perks: string[];
}

export interface XPResult {
  levelUp: boolean;
  newLevel?: HealthLevel;
}

// ---------------------------------------------------------------------------
// Achievements (25)
// ---------------------------------------------------------------------------

export const ACHIEVEMENTS: Achievement[] = [
  // --- Compliance ---
  {
    id: 'first_checkin',
    name: 'First Step',
    description: 'Complete your first supplement check-in',
    category: 'compliance',
    requirement: { type: 'checkin_count', value: 1 },
    tokenReward: 10,
    xpReward: 10,
    icon: 'pill',
    tier: 'bronze',
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day compliance streak',
    category: 'compliance',
    requirement: { type: 'streak', value: 7 },
    tokenReward: 25,
    xpReward: 30,
    icon: 'fire',
    tier: 'bronze',
  },
  {
    id: 'streak_30',
    name: 'Monthly Master',
    description: 'Maintain a 30-day compliance streak',
    category: 'compliance',
    requirement: { type: 'streak', value: 30 },
    tokenReward: 100,
    xpReward: 120,
    icon: 'calendar',
    tier: 'silver',
  },
  {
    id: 'streak_90',
    name: 'Quarter Champion',
    description: 'Maintain a 90-day compliance streak',
    category: 'compliance',
    requirement: { type: 'streak', value: 90 },
    tokenReward: 500,
    xpReward: 600,
    icon: 'trophy',
    tier: 'gold',
  },
  {
    id: 'streak_365',
    name: 'Year of Wellness',
    description: 'Maintain a 365-day compliance streak',
    category: 'compliance',
    requirement: { type: 'streak', value: 365 },
    tokenReward: 2000,
    xpReward: 2500,
    icon: 'crown',
    tier: 'diamond',
  },

  // --- Lab & Genetic ---
  {
    id: 'first_lab_upload',
    name: 'Data Driven',
    description: 'Upload your first lab result',
    category: 'lab',
    requirement: { type: 'lab_upload_count', value: 1 },
    tokenReward: 50,
    xpReward: 60,
    icon: 'microscope',
    tier: 'bronze',
  },
  {
    id: 'five_labs',
    name: 'Lab Regular',
    description: 'Upload 5 lab results',
    category: 'lab',
    requirement: { type: 'lab_upload_count', value: 5 },
    tokenReward: 100,
    xpReward: 120,
    icon: 'flask',
    tier: 'silver',
  },
  {
    id: 'panel_complete',
    name: 'Panel Pro',
    description: 'Complete a full lab panel',
    category: 'lab',
    requirement: { type: 'panel_completion_count', value: 1 },
    tokenReward: 100,
    xpReward: 120,
    icon: 'clipboard-check',
    tier: 'silver',
  },
  {
    id: 'all_panels',
    name: 'Full Spectrum',
    description: 'Complete all available lab panels',
    category: 'lab',
    requirement: { type: 'all_panels_complete', value: 1 },
    tokenReward: 500,
    xpReward: 600,
    icon: 'star',
    tier: 'gold',
  },
  {
    id: 'genetic_import',
    name: 'Know Your Genes',
    description: 'Import your genetic data',
    category: 'genetic',
    requirement: { type: 'genetic_profile_count', value: 1 },
    tokenReward: 100,
    xpReward: 120,
    icon: 'dna',
    tier: 'silver',
  },

  // --- Engagement ---
  {
    id: 'first_login',
    name: 'Welcome Aboard',
    description: 'Log in for the first time',
    category: 'engagement',
    requirement: { type: 'login_count', value: 1 },
    tokenReward: 5,
    xpReward: 5,
    icon: 'door-open',
    tier: 'bronze',
  },
  {
    id: 'login_30',
    name: 'Committed',
    description: 'Log in 30 different days',
    category: 'engagement',
    requirement: { type: 'login_count', value: 30 },
    tokenReward: 50,
    xpReward: 60,
    icon: 'key',
    tier: 'silver',
  },
  {
    id: 'first_ai_chat',
    name: 'AI Explorer',
    description: 'Have your first AI health conversation',
    category: 'engagement',
    requirement: { type: 'ai_conversation_count', value: 1 },
    tokenReward: 10,
    xpReward: 10,
    icon: 'message-circle',
    tier: 'bronze',
  },
  {
    id: 'ai_power_user',
    name: 'AI Power User',
    description: 'Complete 50 AI conversations',
    category: 'engagement',
    requirement: { type: 'ai_conversation_count', value: 50 },
    tokenReward: 100,
    xpReward: 120,
    icon: 'brain',
    tier: 'gold',
  },
  {
    id: 'food_logger',
    name: 'Nutrition Tracker',
    description: 'Log 100 food entries',
    category: 'engagement',
    requirement: { type: 'food_log_count', value: 100 },
    tokenReward: 75,
    xpReward: 90,
    icon: 'utensils',
    tier: 'silver',
  },

  // --- Social ---
  {
    id: 'first_referral',
    name: 'Ambassador',
    description: 'Refer your first friend',
    category: 'social',
    requirement: { type: 'referral_count', value: 1 },
    tokenReward: 100,
    xpReward: 120,
    icon: 'users',
    tier: 'silver',
  },
  {
    id: 'referral_5',
    name: 'Inner Circle',
    description: 'Refer 5 friends',
    category: 'social',
    requirement: { type: 'referral_count', value: 5 },
    tokenReward: 250,
    xpReward: 300,
    icon: 'users-plus',
    tier: 'gold',
  },
  {
    id: 'first_share',
    name: 'Sharing is Caring',
    description: 'Share an achievement',
    category: 'social',
    requirement: { type: 'share_count', value: 1 },
    tokenReward: 10,
    xpReward: 10,
    icon: 'share',
    tier: 'bronze',
  },
  {
    id: 'challenge_first',
    name: 'Challenger',
    description: 'Complete your first challenge',
    category: 'social',
    requirement: { type: 'challenge_count', value: 1 },
    tokenReward: 25,
    xpReward: 30,
    icon: 'swords',
    tier: 'bronze',
  },
  {
    id: 'challenge_10',
    name: 'Challenge Master',
    description: 'Complete 10 challenges',
    category: 'social',
    requirement: { type: 'challenge_count', value: 10 },
    tokenReward: 200,
    xpReward: 250,
    icon: 'medal',
    tier: 'gold',
  },

  // --- Connections ---
  {
    id: 'wearable_connect',
    name: 'Wired In',
    description: 'Connect a wearable device',
    category: 'connections',
    requirement: { type: 'wearable_count', value: 1 },
    tokenReward: 25,
    xpReward: 30,
    icon: 'watch',
    tier: 'bronze',
  },
  {
    id: 'app_connect',
    name: 'App Ecosystem',
    description: 'Connect a health app',
    category: 'connections',
    requirement: { type: 'app_connection_count', value: 1 },
    tokenReward: 15,
    xpReward: 20,
    icon: 'smartphone',
    tier: 'bronze',
  },
  {
    id: 'full_integration',
    name: 'Fully Connected',
    description: 'Connect 3 or more data sources',
    category: 'connections',
    requirement: { type: 'total_connection_count', value: 3 },
    tokenReward: 100,
    xpReward: 120,
    icon: 'plug',
    tier: 'silver',
  },

  // --- Commerce ---
  {
    id: 'first_purchase',
    name: 'Investor in You',
    description: 'Make your first supplement purchase',
    category: 'commerce',
    requirement: { type: 'purchase_count', value: 1 },
    tokenReward: 25,
    xpReward: 30,
    icon: 'shopping-cart',
    tier: 'bronze',
  },
  {
    id: 'subscriber',
    name: 'Subscriber',
    description: 'Activate a subscription plan',
    category: 'commerce',
    requirement: { type: 'subscription_active', value: 1 },
    tokenReward: 50,
    xpReward: 60,
    icon: 'repeat',
    tier: 'silver',
  },
];

// ---------------------------------------------------------------------------
// Health Levels (7)
// ---------------------------------------------------------------------------

export const HEALTH_LEVELS: HealthLevel[] = [
  {
    level: 1,
    name: 'Newcomer',
    xpRequired: 0,
    perks: ['Access to basic dashboard'],
  },
  {
    level: 2,
    name: 'Health Seeker',
    xpRequired: 100,
    perks: ['Unlock AI conversation history', 'Basic badge display'],
  },
  {
    level: 3,
    name: 'Wellness Explorer',
    xpRequired: 500,
    perks: ['Unlock weekly health briefing', 'Expanded AI conversation limits'],
  },
  {
    level: 4,
    name: 'Health Advocate',
    xpRequired: 1500,
    perks: ['Priority AI responses', 'Custom dashboard themes'],
  },
  {
    level: 5,
    name: 'Vitality Champion',
    xpRequired: 4000,
    perks: ['Early access to new features', 'Exclusive challenges'],
  },
  {
    level: 6,
    name: 'Wellness Master',
    xpRequired: 10000,
    perks: ['VIP support channel', 'Beta feature access', 'Bonus token multiplier'],
  },
  {
    level: 7,
    name: 'Health Legend',
    xpRequired: 25000,
    perks: ['Founding member badge', 'Lifetime perks', 'Advisory board invitation'],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getLevelForXP(totalXP: number): HealthLevel {
  let current = HEALTH_LEVELS[0];
  for (const level of HEALTH_LEVELS) {
    if (totalXP >= level.xpRequired) {
      current = level;
    } else {
      break;
    }
  }
  return current;
}

// ---------------------------------------------------------------------------
// checkAllAchievements
// ---------------------------------------------------------------------------

export async function checkAllAchievements(
  userId: string,
  supabase: SupabaseClient,
): Promise<string[]> {
  // Load existing user achievements
  const { data: userAchievements } = await supabase
    .from('user_achievements')
    .select('achievement_id, status')
    .eq('user_id', userId);

  const unlockedSet = new Set(
    (userAchievements ?? [])
      .filter((a) => a.status === 'unlocked')
      .map((a) => a.achievement_id),
  );

  // Load user data in parallel
  const [
    streakResult,
    checkinCountResult,
    labUploadCountResult,
    panelCountResult,
    allPanelsResult,
    geneticResult,
    loginCountResult,
    aiConvoCountResult,
    foodLogCountResult,
    referralCountResult,
    shareCountResult,
    challengeCountResult,
    wearableCountResult,
    appConnectionCountResult,
    totalConnectionResult,
    purchaseCountResult,
    subscriptionResult,
  ] = await Promise.all([
    // Streak
    supabase
      .from('compliance_streaks')
      .select('current_streak')
      .eq('user_id', userId)
      .maybeSingle(),
    // Checkin count
    supabase
      .from('viatokens_ledger')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('source', 'supplement_checkin'),
    // Lab upload count
    supabase
      .from('viatokens_ledger')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('source', 'lab_upload'),
    // Panel completion count
    supabase
      .from('viatokens_ledger')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('source', 'panel_completion'),
    // All panels complete
    supabase
      .from('viatokens_ledger')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('source', 'all_panels_complete'),
    // Genetic profiles
    supabase
      .from('genetic_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
    // Login count
    supabase
      .from('viatokens_ledger')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('source', 'daily_login'),
    // AI conversation count
    supabase
      .from('ai_conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
    // Food log count
    supabase
      .from('viatokens_ledger')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('source', 'food_log'),
    // Referral count
    supabase
      .from('viatokens_ledger')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('source', 'referral_signup'),
    // Share count
    supabase
      .from('viatokens_ledger')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('source', 'achievement_shared'),
    // Challenge count
    supabase
      .from('viatokens_ledger')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('source', 'challenge_completed'),
    // Wearable count
    supabase
      .from('user_connections')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('type', 'wearable'),
    // App connection count
    supabase
      .from('user_connections')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('type', 'app'),
    // Total connections
    supabase
      .from('user_connections')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
    // Purchase count
    supabase
      .from('viatokens_ledger')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('source', 'supplement_purchased'),
    // Subscription active
    supabase
      .from('viatokens_ledger')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('source', 'subscription_active'),
  ]);

  // Build a map of requirement type -> current value
  const currentValues: Record<string, number> = {
    checkin_count: checkinCountResult.count ?? 0,
    streak: streakResult.data?.current_streak ?? 0,
    lab_upload_count: labUploadCountResult.count ?? 0,
    panel_completion_count: panelCountResult.count ?? 0,
    all_panels_complete: allPanelsResult.count ?? 0,
    genetic_profile_count: geneticResult.count ?? 0,
    login_count: loginCountResult.count ?? 0,
    ai_conversation_count: aiConvoCountResult.count ?? 0,
    food_log_count: foodLogCountResult.count ?? 0,
    referral_count: referralCountResult.count ?? 0,
    share_count: shareCountResult.count ?? 0,
    challenge_count: challengeCountResult.count ?? 0,
    wearable_count: wearableCountResult.count ?? 0,
    app_connection_count: appConnectionCountResult.count ?? 0,
    total_connection_count: totalConnectionResult.count ?? 0,
    purchase_count: purchaseCountResult.count ?? 0,
    subscription_active: subscriptionResult.count ?? 0,
  };

  // Check each achievement
  const newlyUnlocked: string[] = [];

  for (const achievement of ACHIEVEMENTS) {
    // Skip already unlocked
    if (unlockedSet.has(achievement.id)) continue;

    const currentVal = currentValues[achievement.requirement.type] ?? 0;

    if (currentVal >= achievement.requirement.value) {
      // Unlock it
      const { error } = await supabase
        .from('user_achievements')
        .upsert(
          {
            user_id: userId,
            achievement_id: achievement.id,
            status: 'unlocked',
            unlocked_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,achievement_id' },
        );

      if (!error) {
        newlyUnlocked.push(achievement.id);

        // Award token reward
        if (achievement.tokenReward > 0) {
          await supabase.from('viatokens_ledger').insert({
            user_id: userId,
            source: 'achievement_unlock',
            source_id: achievement.id,
            amount: achievement.tokenReward,
            multiplier_applied: 1,
            metadata: { achievement_name: achievement.name },
            created_at: new Date().toISOString(),
          });

          // Update balance cache
          await supabase.rpc('increment_token_balance', {
            p_user_id: userId,
            p_amount: achievement.tokenReward,
          });
        }

        // Award XP reward
        if (achievement.xpReward > 0) {
          await awardXP(supabase, userId, achievement.xpReward);
        }
      }
    }
  }

  return newlyUnlocked;
}

// ---------------------------------------------------------------------------
// awardXP
// ---------------------------------------------------------------------------

export async function awardXP(
  supabase: SupabaseClient,
  userId: string,
  xp: number,
): Promise<XPResult> {
  // Get current level record
  const { data: current, error } = await supabase
    .from('user_health_levels')
    .select('level, total_xp')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(`XP fetch failed: ${error.message}`);

  const previousXP = current?.total_xp ?? 0;
  const previousLevel = current?.level ?? 1;
  const newTotalXP = previousXP + xp;

  const newLevelObj = getLevelForXP(newTotalXP);
  const levelUp = newLevelObj.level > previousLevel;

  // Upsert user health level
  const { error: upsertError } = await supabase
    .from('user_health_levels')
    .upsert(
      {
        user_id: userId,
        level: newLevelObj.level,
        level_name: newLevelObj.name,
        total_xp: newTotalXP,
        xp_to_next_level: getXPToNextLevel(newTotalXP, newLevelObj.level),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

  if (upsertError) throw new Error(`XP upsert failed: ${upsertError.message}`);

  return {
    levelUp,
    newLevel: levelUp ? newLevelObj : undefined,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getXPToNextLevel(currentXP: number, currentLevel: number): number {
  const nextLevel = HEALTH_LEVELS.find((l) => l.level === currentLevel + 1);
  if (!nextLevel) return 0; // max level
  return nextLevel.xpRequired - currentXP;
}
