// Helix Rewards Token Engine
// Handles earn, redeem, balance updates, tier recalculations
// CONSUMER PORTAL ONLY — never exposes data to practitioner/naturopath

import { createClient } from "@/lib/supabase/client";

export const EARN_RULES: Record<string, { baseTokens: number; description: string; dailyLimit?: number }> = {
  supplement_checkin: { baseTokens: 5, description: "Supplement check-off" },
  full_day_compliance: { baseTokens: 10, description: "All protocol items taken today" },
  daily_score_logged: { baseTokens: 3, description: "Daily score logged" },
  all_scores_logged: { baseTokens: 8, description: "All 6 daily categories logged" },
  bio_score_milestone: { baseTokens: 50, description: "Bio Optimization milestone crossed" },
  wearable_sync: { baseTokens: 3, description: "Wearable data synced", dailyLimit: 1 },
  steps_10k: { baseTokens: 10, description: "10,000+ steps achieved" },
  caq_completed: { baseTokens: 100, description: "Clinical Assessment completed" },
  caq_readministered: { baseTokens: 75, description: "Quarterly re-assessment completed" },
  ai_chat_session: { baseTokens: 5, description: "AI Advisor conversation", dailyLimit: 3 },
  lab_upload: { baseTokens: 50, description: "Lab results uploaded" },
  genex360_completed: { baseTokens: 500, description: "GeneX360 results received" },
  purchase_completed: { baseTokens: 25, description: "FarmCeutica purchase" },
  referral_signup: { baseTokens: 100, description: "Referred friend signed up" },
  referral_caq_complete: { baseTokens: 100, description: "Referred friend completed CAQ" },
  challenge_completed: { baseTokens: 0, description: "Challenge reward (variable)" },
};

export async function earnTokens(
  userId: string,
  source: string,
  customAmount?: number
): Promise<{ success: boolean; tokensEarned: number; newBalance: number }> {
  const supabase = createClient();
  const rule = EARN_RULES[source];
  if (!rule && !customAmount) return { success: false, tokensEarned: 0, newBalance: 0 };

  // Get current balance + multiplier
  const { data: balance } = await supabase
    .from("helix_balances")
    .select("current_balance, multiplier, tier_points")
    .eq("user_id", userId)
    .single();

  if (!balance) {
    // Initialize balance for new user
    await supabase.from("helix_balances").insert({ user_id: userId });
    return earnTokens(userId, source, customAmount); // Retry
  }

  const baseAmount = customAmount || rule.baseTokens;
  const multiplier = balance.multiplier || 1;
  const tokensEarned = Math.round(baseAmount * multiplier);
  const newBalance = balance.current_balance + tokensEarned;

  // Record transaction
  await supabase.from("helix_transactions").insert({
    user_id: userId,
    type: "earn",
    amount: tokensEarned,
    source,
    description: rule?.description || `Earned ${tokensEarned} Helix`,
    balance_after: newBalance,
    multiplier_applied: multiplier,
  });

  // Update balance
  await supabase.from("helix_balances").update({
    current_balance: newBalance,
    lifetime_earned: (balance.current_balance || 0) + tokensEarned,
    tier_points: (balance.tier_points || 0) + tokensEarned,
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);

  // Check tier upgrade
  await checkTierUpgrade(userId);

  return { success: true, tokensEarned, newBalance };
}

export async function redeemTokens(
  userId: string,
  amount: number,
  rewardType: string,
  rewardDescription: string
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  const supabase = createClient();

  const { data: balance } = await supabase
    .from("helix_balances")
    .select("current_balance")
    .eq("user_id", userId)
    .single();

  if (!balance || balance.current_balance < amount) {
    return { success: false, newBalance: balance?.current_balance || 0, error: "Insufficient balance" };
  }

  const newBalance = balance.current_balance - amount;

  await supabase.from("helix_transactions").insert({
    user_id: userId,
    type: "redeem",
    amount: -amount,
    source: rewardType,
    description: rewardDescription,
    balance_after: newBalance,
  });

  await supabase.from("helix_redemptions").insert({
    user_id: userId,
    reward_type: rewardType,
    reward_description: rewardDescription,
    tokens_spent: amount,
  });

  await supabase.from("helix_balances").update({
    current_balance: newBalance,
    lifetime_redeemed: amount,
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);

  return { success: true, newBalance };
}

async function checkTierUpgrade(userId: string) {
  const supabase = createClient();
  const { data: balance } = await supabase.from("helix_balances").select("tier_points, current_tier").eq("user_id", userId).single();
  if (!balance) return;

  const { data: tiers } = await supabase.from("helix_tiers").select("*").order("min_points", { ascending: false });
  if (!tiers) return;

  for (const tier of tiers) {
    if (balance.tier_points >= tier.min_points && balance.current_tier !== tier.tier) {
      await supabase.from("helix_balances").update({
        current_tier: tier.tier,
        multiplier: tier.multiplier,
      }).eq("user_id", userId);
      break;
    }
  }
}
