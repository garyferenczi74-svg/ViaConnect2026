/**
 * ViaConnect Gamification Engine — ViaTokens Earning & Redemption
 *
 * Handles all token award logic, rate-limiting, streak multipliers,
 * and reward-store redemption.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EarnRule {
  source: string;
  baseAmount: number;
  description: string;
  cooldown?: number;       // milliseconds between allowed awards
  dailyLimit?: number;     // max awards per calendar day
  xpAward?: number;        // XP granted alongside tokens
}

export interface AwardResult {
  success: boolean;
  tokensAwarded: number;
  multiplierApplied: number;
  newBalance: number;
  achievementsUnlocked: string[];
  levelUp: boolean;
}

export interface RedeemResult {
  success: boolean;
  tokensSpent: number;
  newBalance: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Earn Rules
// ---------------------------------------------------------------------------

export const EARN_RULES: Record<string, EarnRule> = {
  supplement_checkin: {
    source: 'supplement_checkin',
    baseAmount: 5,
    description: 'Logged a supplement check-in',
    dailyLimit: 3,
    xpAward: 5,
  },
  full_day_compliance: {
    source: 'full_day_compliance',
    baseAmount: 10,
    description: 'Completed full daily supplement compliance',
    xpAward: 15,
  },
  weekly_streak: {
    source: 'weekly_streak',
    baseAmount: 25,
    description: '7-day compliance streak milestone',
    xpAward: 30,
  },
  monthly_streak: {
    source: 'monthly_streak',
    baseAmount: 100,
    description: '30-day compliance streak milestone',
    xpAward: 120,
  },
  quarterly_streak: {
    source: 'quarterly_streak',
    baseAmount: 500,
    description: '90-day compliance streak milestone',
    xpAward: 600,
  },
  lab_upload: {
    source: 'lab_upload',
    baseAmount: 50,
    description: 'Uploaded lab results',
    cooldown: 24 * 60 * 60 * 1000, // 24 hours
    xpAward: 60,
  },
  panel_completion: {
    source: 'panel_completion',
    baseAmount: 100,
    description: 'Completed a lab panel',
    xpAward: 120,
  },
  all_panels_complete: {
    source: 'all_panels_complete',
    baseAmount: 500,
    description: 'All lab panels completed',
    xpAward: 600,
  },
  genetic_data_import: {
    source: 'genetic_data_import',
    baseAmount: 100,
    description: 'Imported genetic data',
    xpAward: 120,
  },
  daily_login: {
    source: 'daily_login',
    baseAmount: 2,
    description: 'Daily app login',
    dailyLimit: 1,
    xpAward: 2,
  },
  ai_conversation: {
    source: 'ai_conversation',
    baseAmount: 3,
    description: 'Engaged with AI health assistant',
    dailyLimit: 5,
    xpAward: 3,
  },
  food_log: {
    source: 'food_log',
    baseAmount: 3,
    description: 'Logged a food entry',
    dailyLimit: 3,
    xpAward: 3,
  },
  weekly_briefing_listened: {
    source: 'weekly_briefing_listened',
    baseAmount: 15,
    description: 'Listened to weekly health briefing',
    cooldown: 7 * 24 * 60 * 60 * 1000, // 7 days
    xpAward: 20,
  },
  wearable_connected: {
    source: 'wearable_connected',
    baseAmount: 25,
    description: 'Connected a wearable device',
    xpAward: 30,
  },
  app_connected: {
    source: 'app_connected',
    baseAmount: 15,
    description: 'Connected a health app',
    xpAward: 20,
  },
  referral_signup: {
    source: 'referral_signup',
    baseAmount: 100,
    description: 'Referred user signed up',
    xpAward: 120,
  },
  referral_activated: {
    source: 'referral_activated',
    baseAmount: 100,
    description: 'Referred user became active',
    xpAward: 120,
  },
  achievement_shared: {
    source: 'achievement_shared',
    baseAmount: 10,
    description: 'Shared an achievement socially',
    dailyLimit: 3,
    xpAward: 10,
  },
  challenge_completed: {
    source: 'challenge_completed',
    baseAmount: 0, // varies per challenge
    description: 'Completed a challenge',
    xpAward: 0,
  },
  supplement_purchased: {
    source: 'supplement_purchased',
    baseAmount: 10,
    description: 'Purchased a supplement',
    xpAward: 10,
  },
  subscription_active: {
    source: 'subscription_active',
    baseAmount: 20,
    description: 'Active subscription reward',
    xpAward: 25,
  },
  supplement_reorder: {
    source: 'supplement_reorder',
    baseAmount: 10,
    description: 'Reordered supplements',
    xpAward: 10,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

function startOfDayUTC(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

// ---------------------------------------------------------------------------
// Rate-limit checks
// ---------------------------------------------------------------------------

async function checkDailyLimit(
  supabase: SupabaseClient,
  userId: string,
  source: string,
  limit: number,
): Promise<boolean> {
  const dayStart = startOfDayUTC();

  const { count, error } = await supabase
    .from('viatokens_ledger')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('source', source)
    .gte('created_at', dayStart);

  if (error) throw new Error(`Daily limit check failed: ${error.message}`);
  return (count ?? 0) < limit;
}

async function checkCooldown(
  supabase: SupabaseClient,
  userId: string,
  source: string,
  cooldownMs: number,
): Promise<boolean> {
  const cooldownStart = new Date(Date.now() - cooldownMs).toISOString();

  const { count, error } = await supabase
    .from('viatokens_ledger')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('source', source)
    .gte('created_at', cooldownStart);

  if (error) throw new Error(`Cooldown check failed: ${error.message}`);
  return (count ?? 0) === 0;
}

// ---------------------------------------------------------------------------
// Streak multiplier lookup
// ---------------------------------------------------------------------------

async function getStreakMultiplier(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from('compliance_streaks')
    .select('current_streak, multiplier')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(`Streak lookup failed: ${error.message}`);
  if (!data) return 1;
  return data.multiplier ?? 1;
}

// ---------------------------------------------------------------------------
// awardTokens
// ---------------------------------------------------------------------------

export async function awardTokens(
  userId: string,
  source: string,
  sourceId?: string,
  overrideAmount?: number,
  metadata?: Record<string, unknown>,
): Promise<AwardResult> {
  const supabase = getSupabase();

  // Validate source
  const rule = EARN_RULES[source];
  if (!rule) {
    return {
      success: false,
      tokensAwarded: 0,
      multiplierApplied: 1,
      newBalance: 0,
      achievementsUnlocked: [],
      levelUp: false,
    };
  }

  // Rate-limit: daily limit
  if (rule.dailyLimit) {
    const allowed = await checkDailyLimit(supabase, userId, source, rule.dailyLimit);
    if (!allowed) {
      return {
        success: false,
        tokensAwarded: 0,
        multiplierApplied: 1,
        newBalance: 0,
        achievementsUnlocked: [],
        levelUp: false,
      };
    }
  }

  // Rate-limit: cooldown
  if (rule.cooldown) {
    const allowed = await checkCooldown(supabase, userId, source, rule.cooldown);
    if (!allowed) {
      return {
        success: false,
        tokensAwarded: 0,
        multiplierApplied: 1,
        newBalance: 0,
        achievementsUnlocked: [],
        levelUp: false,
      };
    }
  }

  // Streak multiplier
  const multiplier = await getStreakMultiplier(supabase, userId);

  // Calculate final amount
  const baseAmount = overrideAmount ?? rule.baseAmount;
  const finalAmount = Math.round(baseAmount * multiplier);

  if (finalAmount <= 0 && !overrideAmount) {
    return {
      success: false,
      tokensAwarded: 0,
      multiplierApplied: multiplier,
      newBalance: 0,
      achievementsUnlocked: [],
      levelUp: false,
    };
  }

  // Insert ledger entry
  const { error: ledgerError } = await supabase
    .from('viatokens_ledger')
    .insert({
      user_id: userId,
      source,
      source_id: sourceId ?? null,
      amount: finalAmount,
      multiplier_applied: multiplier,
      metadata: metadata ?? null,
      created_at: new Date().toISOString(),
    });

  if (ledgerError) throw new Error(`Ledger insert failed: ${ledgerError.message}`);

  // Upsert balance cache
  const { data: balanceRow, error: balanceError } = await supabase.rpc(
    'increment_token_balance',
    { p_user_id: userId, p_amount: finalAmount },
  );

  if (balanceError) {
    // Fallback: manual upsert
    const { data: existing } = await supabase
      .from('viatokens_balance')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();

    const currentBalance = existing?.balance ?? 0;
    const newBalance = currentBalance + finalAmount;

    await supabase
      .from('viatokens_balance')
      .upsert(
        { user_id: userId, balance: newBalance, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      );
  }

  // Fetch updated balance
  const { data: updatedBalance } = await supabase
    .from('viatokens_balance')
    .select('balance')
    .eq('user_id', userId)
    .single();

  const newBalance = updatedBalance?.balance ?? finalAmount;

  // Award XP if rule defines it
  let levelUp = false;
  if (rule.xpAward && rule.xpAward > 0) {
    const { awardXP } = await import('./achievement-engine');
    const xpResult = await awardXP(supabase, userId, rule.xpAward);
    levelUp = xpResult.levelUp;
  }

  // Check achievements
  let achievementsUnlocked: string[] = [];
  try {
    const { checkAllAchievements } = await import('./achievement-engine');
    achievementsUnlocked = await checkAllAchievements(userId, supabase);
  } catch {
    // Achievement check is non-fatal
  }

  return {
    success: true,
    tokensAwarded: finalAmount,
    multiplierApplied: multiplier,
    newBalance,
    achievementsUnlocked,
    levelUp,
  };
}

// ---------------------------------------------------------------------------
// redeemTokens
// ---------------------------------------------------------------------------

export async function redeemTokens(
  userId: string,
  itemId: string,
): Promise<RedeemResult> {
  const supabase = getSupabase();

  // Look up reward item
  const { data: item, error: itemError } = await supabase
    .from('reward_store_items')
    .select('id, name, token_cost, active, inventory_count')
    .eq('id', itemId)
    .single();

  if (itemError || !item) {
    return { success: false, tokensSpent: 0, newBalance: 0, error: 'Item not found' };
  }

  if (!item.active) {
    return { success: false, tokensSpent: 0, newBalance: 0, error: 'Item is not available' };
  }

  if (item.inventory_count !== null && item.inventory_count <= 0) {
    return { success: false, tokensSpent: 0, newBalance: 0, error: 'Item out of stock' };
  }

  // Get current balance
  const { data: balanceRow, error: balError } = await supabase
    .from('viatokens_balance')
    .select('balance')
    .eq('user_id', userId)
    .single();

  if (balError || !balanceRow) {
    return { success: false, tokensSpent: 0, newBalance: 0, error: 'Balance not found' };
  }

  const currentBalance = balanceRow.balance;

  if (currentBalance < item.token_cost) {
    return {
      success: false,
      tokensSpent: 0,
      newBalance: currentBalance,
      error: `Insufficient balance. Need ${item.token_cost} VT, have ${currentBalance} VT`,
    };
  }

  // Deduct tokens — ledger entry with negative amount
  const { error: ledgerError } = await supabase
    .from('viatokens_ledger')
    .insert({
      user_id: userId,
      source: 'redemption',
      source_id: itemId,
      amount: -item.token_cost,
      multiplier_applied: 1,
      metadata: { item_name: item.name },
      created_at: new Date().toISOString(),
    });

  if (ledgerError) {
    return { success: false, tokensSpent: 0, newBalance: currentBalance, error: 'Ledger write failed' };
  }

  // Update balance cache
  const newBalance = currentBalance - item.token_cost;
  const { error: updateError } = await supabase
    .from('viatokens_balance')
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (updateError) {
    return { success: false, tokensSpent: 0, newBalance: currentBalance, error: 'Balance update failed' };
  }

  // Decrement inventory if tracked
  if (item.inventory_count !== null) {
    await supabase
      .from('reward_store_items')
      .update({ inventory_count: item.inventory_count - 1 })
      .eq('id', itemId);
  }

  // Record redemption
  await supabase
    .from('reward_redemptions')
    .insert({
      user_id: userId,
      item_id: itemId,
      tokens_spent: item.token_cost,
      status: 'pending',
      created_at: new Date().toISOString(),
    });

  return {
    success: true,
    tokensSpent: item.token_cost,
    newBalance,
  };
}
