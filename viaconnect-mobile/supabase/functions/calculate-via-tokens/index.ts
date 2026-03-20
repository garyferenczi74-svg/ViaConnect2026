import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { ok, err } from '../_shared/response.ts';
import { getSupabaseAdmin, getUserId } from '../_shared/supabase-admin.ts';
import { writeAudit } from '../_shared/audit.ts';
import { z } from '../_shared/validate.ts';

// ── Token award rules ────────────────────────────────────────────────────
const TOKEN_AWARDS = {
  daily_checkin: 5,
  streak_7_day: 50,
  streak_30_day: 200,
  caq_completion: 100,
  referral_signup: 500,
} as const;

// ── Tier thresholds ──────────────────────────────────────────────────────
const TIER_THRESHOLDS = [
  { tier: 'PLATINUM' as const, min: 15000 },
  { tier: 'GOLD' as const, min: 5000 },
  { tier: 'SILVER' as const, min: 1000 },
  { tier: 'BRONZE' as const, min: 0 },
];

const InputSchema = z.object({
  activityType: z.enum([
    'daily_checkin',
    'streak_7_day',
    'streak_30_day',
    'caq_completion',
    'referral_signup',
  ]),
  metadata: z.record(z.unknown()).optional(),
});

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const userId = await getUserId(req);
    if (!userId) return err('Unauthorized', 'AUTH_REQUIRED', 401);

    const body = await req.json();
    const parsed = InputSchema.safeParse(body);
    if (!parsed.success) {
      return err(parsed.error.issues[0].message, 'VALIDATION_ERROR');
    }
    const { activityType, metadata } = parsed.data;
    const admin = getSupabaseAdmin();

    const tokensToAward = TOKEN_AWARDS[activityType];

    // Get or create token balance
    const { data: existing } = await admin
      .from('farma_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    const currentBalance = existing?.balance ?? 0;
    const currentLifetime = existing?.lifetime_earned ?? 0;
    const newBalance = currentBalance + tokensToAward;
    const newLifetime = currentLifetime + tokensToAward;

    // Upsert token balance
    await admin.from('farma_tokens').upsert({
      user_id: userId,
      balance: newBalance,
      lifetime_earned: newLifetime,
    });

    // Record transaction
    await admin.from('token_transactions').insert({
      user_id: userId,
      transaction_type: 'EARN',
      activity_type: activityType,
      token_amount: tokensToAward,
      balance_after: newBalance,
      description: `Earned ${tokensToAward} tokens for ${activityType.replace(/_/g, ' ')}`,
    });

    // Update streak if daily checkin
    if (activityType === 'daily_checkin') {
      const today = new Date().toISOString().split('T')[0];
      const { data: streak } = await admin
        .from('user_streaks')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (streak) {
        const lastDate = streak.last_activity_date;
        const yesterday = new Date(Date.now() - 86400000)
          .toISOString()
          .split('T')[0];
        const isConsecutive = lastDate === yesterday;

        const newStreak = isConsecutive ? streak.current_streak + 1 : 1;
        const longestStreak = Math.max(newStreak, streak.longest_streak);

        await admin
          .from('user_streaks')
          .update({
            current_streak: newStreak,
            longest_streak: longestStreak,
            last_activity_date: today,
            streak_start_date: isConsecutive
              ? streak.streak_start_date
              : today,
          })
          .eq('user_id', userId);

        // Check for streak milestones (auto-award bonus tokens)
        if (newStreak === 7) {
          // Recursively award streak bonus — but via direct insert to avoid loops
          const streak7Tokens = TOKEN_AWARDS.streak_7_day;
          const afterStreakBalance = newBalance + streak7Tokens;
          await admin.from('farma_tokens').update({
            balance: afterStreakBalance,
            lifetime_earned: newLifetime + streak7Tokens,
          }).eq('user_id', userId);

          await admin.from('token_transactions').insert({
            user_id: userId,
            transaction_type: 'BONUS',
            activity_type: 'streak_7_day',
            token_amount: streak7Tokens,
            balance_after: afterStreakBalance,
            description: '7-day streak bonus!',
          });

          await admin.from('achievements').upsert({
            user_id: userId,
            achievement_type: 'streak_7',
            achievement_name: '7-Day Streak',
            description: 'Logged supplements for 7 consecutive days',
            tokens_awarded: streak7Tokens,
          });
        }

        if (newStreak === 30) {
          const streak30Tokens = TOKEN_AWARDS.streak_30_day;
          const { data: currentTokens } = await admin
            .from('farma_tokens')
            .select('balance, lifetime_earned')
            .eq('user_id', userId)
            .single();

          const after30Balance = (currentTokens?.balance ?? newBalance) + streak30Tokens;
          await admin.from('farma_tokens').update({
            balance: after30Balance,
            lifetime_earned: (currentTokens?.lifetime_earned ?? newLifetime) + streak30Tokens,
          }).eq('user_id', userId);

          await admin.from('token_transactions').insert({
            user_id: userId,
            transaction_type: 'BONUS',
            activity_type: 'streak_30_day',
            token_amount: streak30Tokens,
            balance_after: after30Balance,
            description: '30-day streak bonus!',
          });

          await admin.from('achievements').upsert({
            user_id: userId,
            achievement_type: 'streak_30',
            achievement_name: '30-Day Streak',
            description: 'Logged supplements for 30 consecutive days',
            tokens_awarded: streak30Tokens,
          });
        }
      } else {
        // First-ever checkin
        await admin.from('user_streaks').insert({
          user_id: userId,
          current_streak: 1,
          longest_streak: 1,
          streak_start_date: today,
          last_activity_date: today,
        });
      }
    }

    // Determine and update tier
    const { data: latestTokens } = await admin
      .from('farma_tokens')
      .select('lifetime_earned')
      .eq('user_id', userId)
      .single();

    const lifetime = latestTokens?.lifetime_earned ?? newLifetime;
    const newTier =
      TIER_THRESHOLDS.find((t) => lifetime >= t.min)?.tier ?? 'BRONZE';

    await admin.from('user_tiers').upsert({
      user_id: userId,
      tier: newTier,
      tokens_toward_next_tier: lifetime,
    });

    await writeAudit({
      userId,
      action: 'calculate_via_tokens',
      tableName: 'farma_tokens',
      recordId: userId,
      newData: {
        activityType,
        tokensAwarded: tokensToAward,
        newBalance,
        tier: newTier,
        metadata,
      },
    });

    return ok({
      tokensAwarded: tokensToAward,
      newBalance,
      lifetimeEarned: lifetime,
      tier: newTier,
    });
  } catch (e) {
    return err(
      e instanceof Error ? e.message : 'Internal server error',
      'INTERNAL_ERROR',
      500,
    );
  }
});
