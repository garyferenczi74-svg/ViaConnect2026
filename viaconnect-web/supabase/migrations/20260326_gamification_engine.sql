-- ============================================================================
-- ViaConnect Gamification Engine
-- Migration: 20260326_gamification_engine.sql
-- Created: 2026-03-26
-- Description: Complete gamification system including ViaTokens, achievements,
--              compliance streaks, health levels, challenges, reward store,
--              referrals, peer benchmarks, and genetic cohorts.
-- ============================================================================

-- ============================================================================
-- 1. viatokens_ledger — Immutable transaction log
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.viatokens_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earn', 'redeem', 'bonus', 'adjustment', 'referral', 'streak', 'challenge', 'achievement')),
    source TEXT NOT NULL,
    source_id TEXT,
    description TEXT,
    multiplier FLOAT DEFAULT 1.0,
    base_amount INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. viatokens_balance — Cached balance per user
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.viatokens_balance (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 0,
    lifetime_earned INTEGER NOT NULL DEFAULT 0,
    lifetime_redeemed INTEGER NOT NULL DEFAULT 0,
    current_multiplier FLOAT NOT NULL DEFAULT 1.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. achievements — Definition table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.achievements (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('compliance', 'genetic', 'social', 'milestone', 'challenge')),
    icon TEXT,
    tier TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
    tokens_reward INTEGER NOT NULL DEFAULT 0,
    requirement_type TEXT NOT NULL,
    requirement_value INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    shareable BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4. user_achievements — Progress tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'unlocked', 'claimed')),
    progress INTEGER NOT NULL DEFAULT 0,
    unlocked_at TIMESTAMPTZ,
    shared_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, achievement_id)
);

-- ============================================================================
-- 5. compliance_streaks
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.compliance_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_checkin_date DATE,
    streak_started_at DATE,
    recovery_available BOOLEAN NOT NULL DEFAULT false,
    recovery_used_at TIMESTAMPTZ,
    current_multiplier FLOAT NOT NULL DEFAULT 1.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 6. health_levels — Level definitions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.health_levels (
    level INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    min_xp INTEGER NOT NULL DEFAULT 0,
    icon TEXT,
    perks JSONB DEFAULT '[]',
    color TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 7. user_health_levels — User XP tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_health_levels (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    current_level INTEGER NOT NULL DEFAULT 1 REFERENCES public.health_levels(level),
    current_xp INTEGER NOT NULL DEFAULT 0,
    xp_to_next_level INTEGER NOT NULL DEFAULT 500,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 8. challenges
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    challenge_type TEXT NOT NULL CHECK (challenge_type IN ('individual', 'team', 'community')),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    goal_type TEXT NOT NULL,
    goal_value FLOAT NOT NULL,
    goal_unit TEXT,
    tokens_reward INTEGER NOT NULL DEFAULT 0,
    badge_id TEXT REFERENCES public.achievements(id),
    max_participants INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 9. user_challenges
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'withdrawn')),
    progress FLOAT NOT NULL DEFAULT 0,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, challenge_id)
);

-- ============================================================================
-- 10. reward_store_items
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.reward_store_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('discount', 'product', 'experience', 'donation', 'digital', 'subscription')),
    token_cost INTEGER NOT NULL,
    reward_type TEXT NOT NULL CHECK (reward_type IN ('code', 'physical', 'digital', 'donation', 'subscription')),
    reward_value TEXT,
    image_url TEXT,
    stock INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT true,
    min_level INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 11. reward_redemptions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.reward_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.reward_store_items(id) ON DELETE CASCADE,
    tokens_spent INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'cancelled', 'expired')),
    reward_code TEXT,
    fulfilled_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 12. referrals
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referred_email TEXT NOT NULL,
    referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed_up', 'qualified', 'rewarded')),
    referral_code TEXT NOT NULL UNIQUE,
    rewarded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 13. peer_benchmarks
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.peer_benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric TEXT NOT NULL,
    cohort_type TEXT NOT NULL,
    cohort_value TEXT NOT NULL,
    percentile_10 FLOAT,
    percentile_25 FLOAT,
    percentile_50 FLOAT,
    percentile_75 FLOAT,
    percentile_90 FLOAT,
    sample_size INTEGER NOT NULL DEFAULT 0,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 14. genetic_cohorts
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.genetic_cohorts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cohort_name TEXT NOT NULL,
    defining_variants JSONB NOT NULL DEFAULT '[]',
    member_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 15. user_cohort_memberships
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_cohort_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cohort_id UUID NOT NULL REFERENCES public.genetic_cohorts(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    anonymous_alias TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, cohort_id)
);


-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_viatokens_ledger_user_created
    ON public.viatokens_ledger(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_viatokens_ledger_user_source
    ON public.viatokens_ledger(user_id, source);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_status
    ON public.user_achievements(user_id, status);

CREATE INDEX IF NOT EXISTS idx_user_challenges_user_status
    ON public.user_challenges(user_id, status);

CREATE INDEX IF NOT EXISTS idx_peer_benchmarks_metric_cohort
    ON public.peer_benchmarks(metric, cohort_type);

CREATE INDEX IF NOT EXISTS idx_referrals_code
    ON public.referrals(referral_code);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer
    ON public.referrals(referrer_id);


-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.viatokens_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viatokens_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_health_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_store_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peer_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.genetic_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_cohort_memberships ENABLE ROW LEVEL SECURITY;

-- viatokens_ledger: users see own transactions
CREATE POLICY "Users can view own token transactions"
    ON public.viatokens_ledger FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "System can insert token transactions"
    ON public.viatokens_ledger FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- viatokens_balance: users see own balance
CREATE POLICY "Users can view own token balance"
    ON public.viatokens_balance FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own token balance"
    ON public.viatokens_balance FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own token balance"
    ON public.viatokens_balance FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- achievements: readable by all authenticated users (definition table)
CREATE POLICY "Authenticated users can view achievements"
    ON public.achievements FOR SELECT
    USING (auth.role() = 'authenticated');

-- user_achievements: users see own progress
CREATE POLICY "Users can view own achievements"
    ON public.user_achievements FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
    ON public.user_achievements FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own achievements"
    ON public.user_achievements FOR UPDATE
    USING (auth.uid() = user_id);

-- compliance_streaks: users see own data
CREATE POLICY "Users can view own compliance streak"
    ON public.compliance_streaks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own compliance streak"
    ON public.compliance_streaks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own compliance streak"
    ON public.compliance_streaks FOR UPDATE
    USING (auth.uid() = user_id);

-- health_levels: readable by all authenticated users (definition table)
CREATE POLICY "Authenticated users can view health levels"
    ON public.health_levels FOR SELECT
    USING (auth.role() = 'authenticated');

-- user_health_levels: users see own data
CREATE POLICY "Users can view own health level"
    ON public.user_health_levels FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own health level"
    ON public.user_health_levels FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own health level"
    ON public.user_health_levels FOR UPDATE
    USING (auth.uid() = user_id);

-- challenges: readable by all authenticated users
CREATE POLICY "Authenticated users can view challenges"
    ON public.challenges FOR SELECT
    USING (auth.role() = 'authenticated');

-- user_challenges: users see own data
CREATE POLICY "Users can view own challenges"
    ON public.user_challenges FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own challenges"
    ON public.user_challenges FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own challenges"
    ON public.user_challenges FOR UPDATE
    USING (auth.uid() = user_id);

-- reward_store_items: readable by all authenticated users
CREATE POLICY "Authenticated users can view reward store items"
    ON public.reward_store_items FOR SELECT
    USING (auth.role() = 'authenticated');

-- reward_redemptions: users see own data
CREATE POLICY "Users can view own redemptions"
    ON public.reward_redemptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own redemptions"
    ON public.reward_redemptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- referrals: users see own referrals
CREATE POLICY "Users can view own referrals"
    ON public.referrals FOR SELECT
    USING (auth.uid() = referrer_id);

CREATE POLICY "Users can insert own referrals"
    ON public.referrals FOR INSERT
    WITH CHECK (auth.uid() = referrer_id);

-- peer_benchmarks: readable by all authenticated users
CREATE POLICY "Authenticated users can view peer benchmarks"
    ON public.peer_benchmarks FOR SELECT
    USING (auth.role() = 'authenticated');

-- genetic_cohorts: readable by all authenticated users
CREATE POLICY "Authenticated users can view genetic cohorts"
    ON public.genetic_cohorts FOR SELECT
    USING (auth.role() = 'authenticated');

-- user_cohort_memberships: users see own data
CREATE POLICY "Users can view own cohort memberships"
    ON public.user_cohort_memberships FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cohort memberships"
    ON public.user_cohort_memberships FOR INSERT
    WITH CHECK (auth.uid() = user_id);


-- ============================================================================
-- SEED DATA: Health Levels
-- ============================================================================
INSERT INTO public.health_levels (level, name, title, min_xp, icon, perks, color) VALUES
(1, 'Novice',     'Health Novice',     0,     '🌱', '["Access to basic insights"]', '#A0AEC0'),
(2, 'Explorer',   'Health Explorer',   500,   '🔍', '["Unlock peer benchmarks", "Basic AI chat"]', '#48BB78'),
(3, 'Optimizer',  'Health Optimizer',  1500,  '⚡', '["Advanced AI recommendations", "Custom dashboards"]', '#2DA5A0'),
(4, 'Biohacker',  'Health Biohacker',  3500,  '🧬', '["Genetic deep-dives", "Priority support", "1.25x token multiplier"]', '#B75E18'),
(5, 'Advocate',   'Health Advocate',   7000,  '🌟', '["Community challenges", "Exclusive webinars", "1.5x token multiplier"]', '#D69E2E'),
(6, 'Champion',   'Health Champion',   12000, '🏆', '["Beta features", "VIP support", "1.75x token multiplier"]', '#E53E3E'),
(7, 'Legend',     'Health Legend',      20000, '💎', '["All perks unlocked", "2x token multiplier", "Legend badge"]', '#805AD5')
ON CONFLICT (level) DO NOTHING;


-- ============================================================================
-- SEED DATA: Achievements (25 total across 5 categories)
-- ============================================================================
INSERT INTO public.achievements (id, name, description, category, icon, tier, tokens_reward, requirement_type, requirement_value, sort_order, shareable) VALUES

-- Compliance achievements (5)
('compliance_first_checkin',     'First Check-In',          'Complete your first daily compliance check-in',                     'compliance', '✅', 'bronze',   10,  'checkin_count',        1,    1,  true),
('compliance_7day_streak',       'Week Warrior',            'Maintain a 7-day compliance streak',                                'compliance', '🔥', 'bronze',   25,  'streak_days',          7,    2,  true),
('compliance_30day_streak',      'Monthly Master',          'Maintain a 30-day compliance streak',                               'compliance', '🏅', 'silver',   100, 'streak_days',          30,   3,  true),
('compliance_90day_streak',      'Quarter Champion',        'Maintain a 90-day compliance streak',                               'compliance', '💪', 'gold',     300, 'streak_days',          90,   4,  true),
('compliance_365day_streak',     'Year of Commitment',      'Maintain a 365-day compliance streak',                              'compliance', '👑', 'diamond',  1000,'streak_days',          365,  5,  true),

-- Genetic achievements (5)
('genetic_first_upload',         'Gene Pioneer',            'Upload your first genetic data file',                               'genetic',    '🧬', 'bronze',   50,  'genetic_uploads',      1,    10, true),
('genetic_full_profile',         'Fully Sequenced',         'Complete your full genetic profile with all data points',            'genetic',    '🔬', 'silver',   150, 'profile_completeness', 100,  11, true),
('genetic_variant_explorer',     'Variant Explorer',        'Review 10 genetic variant insights',                                'genetic',    '🔍', 'bronze',   30,  'variants_reviewed',    10,   12, false),
('genetic_pathway_master',       'Pathway Master',          'Explore all major metabolic pathways in your profile',               'genetic',    '🗺️', 'gold',     200, 'pathways_explored',    8,    13, true),
('genetic_data_donor',           'Data Contributor',        'Opt in to anonymous genetic research cohorts',                       'genetic',    '🤝', 'silver',   100, 'cohorts_joined',       1,    14, true),

-- Social achievements (5)
('social_first_referral',        'Friend Finder',           'Successfully refer your first friend to ViaConnect',                'social',     '👋', 'bronze',   50,  'referrals_completed',  1,    20, true),
('social_5_referrals',           'Community Builder',       'Refer 5 friends who complete onboarding',                           'social',     '🏘️', 'silver',   200, 'referrals_completed',  5,    21, true),
('social_first_share',           'Achievement Sharer',      'Share an achievement on social media',                              'social',     '📣', 'bronze',   15,  'achievements_shared',  1,    22, true),
('social_cohort_contributor',    'Cohort Contributor',      'Contribute insights to 3 genetic cohort discussions',               'social',     '💬', 'silver',   75,  'cohort_contributions', 3,    23, false),
('social_10_referrals',          'Ambassador',              'Refer 10 friends who complete onboarding',                          'social',     '🌐', 'gold',     500, 'referrals_completed',  10,   24, true),

-- Milestone achievements (5)
('milestone_profile_complete',   'Profile Complete',        'Fill out 100% of your health profile',                              'milestone',  '📋', 'bronze',   25,  'profile_completeness', 100,  30, false),
('milestone_first_ai_chat',     'AI Explorer',             'Have your first conversation with the AI health assistant',          'milestone',  '🤖', 'bronze',   10,  'ai_conversations',     1,    31, false),
('milestone_100_tokens',         'Token Collector',         'Earn your first 100 ViaTokens',                                     'milestone',  '🪙', 'bronze',   0,   'tokens_earned',        100,  32, true),
('milestone_1000_tokens',        'Token Hoarder',           'Earn 1,000 ViaTokens lifetime',                                     'milestone',  '💰', 'silver',   0,   'tokens_earned',        1000, 33, true),
('milestone_level_5',            'Top Tier',                'Reach Health Level 5 (Advocate)',                                   'milestone',  '⭐', 'gold',     250, 'health_level',         5,    34, true),

-- Challenge achievements (5)
('challenge_first_complete',     'Challenge Accepted',      'Complete your first challenge',                                     'challenge',  '🎯', 'bronze',   25,  'challenges_completed', 1,    40, true),
('challenge_5_complete',         'Challenge Veteran',       'Complete 5 challenges',                                             'challenge',  '🏆', 'silver',   100, 'challenges_completed', 5,    41, true),
('challenge_team_player',        'Team Player',             'Join and complete a team challenge',                                'challenge',  '🤝', 'silver',   75,  'team_challenges',      1,    42, true),
('challenge_perfect_month',      'Perfect Month',           'Complete all challenges in a single month',                         'challenge',  '🌟', 'gold',     300, 'monthly_all_complete', 1,    43, true),
('challenge_10_complete',        'Challenge Legend',        'Complete 10 challenges',                                            'challenge',  '💎', 'platinum', 500, 'challenges_completed', 10,   44, true)

ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- SEED DATA: Reward Store Items (15 total)
-- ============================================================================
INSERT INTO public.reward_store_items (name, description, category, token_cost, reward_type, reward_value, image_url, stock, is_active, min_level) VALUES

-- Discounts
('10% Supplement Discount',       'Get 10% off your next FarmCeutica supplement order',                       'discount',     100,  'code',         '10_PCT_OFF',         NULL, NULL,  true, 1),
('25% Supplement Discount',       'Get 25% off your next FarmCeutica supplement order',                       'discount',     225,  'code',         '25_PCT_OFF',         NULL, NULL,  true, 2),
('Free Shipping',                 'Free shipping on your next FarmCeutica order',                             'discount',     75,   'code',         'FREE_SHIP',          NULL, NULL,  true, 1),
('$10 Store Credit',              'Redeem for $10 credit on FarmCeutica products',                            'discount',     200,  'code',         '10_CREDIT',          NULL, NULL,  true, 2),

-- Products
('GENEX360 Booster Pack',         'One-month supply of personalized supplement booster pack',                 'product',      500,  'physical',     'BOOSTER_PACK',       NULL, 100,   true, 3),
('ViaConnect Water Bottle',       'Premium branded stainless steel water bottle',                             'product',      300,  'physical',     'WATER_BOTTLE',       NULL, 200,   true, 1),
('Supplement Starter Kit',        'Curated 2-week supplement starter kit based on your genetics',             'product',      750,  'physical',     'STARTER_KIT',        NULL, 50,    true, 3),

-- Digital
('Advanced Report Unlock',        'Unlock one advanced genetic pathway report',                               'digital',      150,  'digital',      'ADV_REPORT',         NULL, NULL,  true, 2),
('AI Consultation Boost',         'Get 50 additional AI health assistant conversations this month',           'digital',      200,  'digital',      'AI_BOOST_50',        NULL, NULL,  true, 2),
('Custom Dashboard Theme',        'Unlock a premium dashboard theme for your health portal',                  'digital',      100,  'digital',      'DASH_THEME',         NULL, NULL,  true, 1),
('Priority Support - 1 Month',    'Get priority customer support for one month',                              'digital',      400,  'digital',      'PRIORITY_SUPPORT',   NULL, NULL,  true, 4),

-- Experience
('1-on-1 Genetic Consult',        'Book a 30-minute session with a genetic counselor',                        'experience',   1000, 'digital',      'GENETIC_CONSULT',    NULL, 20,    true, 4),
('Wellness Webinar VIP Access',   'VIP access to an exclusive wellness and genetics webinar',                 'experience',   250,  'digital',      'WEBINAR_VIP',        NULL, 50,    true, 3),

-- Donation
('Plant a Tree',                   'We plant a tree in your name through our reforestation partner',          'donation',     50,   'donation',     'TREE_PLANT',         NULL, NULL,  true, 1),
('Donate to Health Research',      'Contribute to open-source genetic health research',                       'donation',     100,  'donation',     'HEALTH_RESEARCH',    NULL, NULL,  true, 1)

ON CONFLICT DO NOTHING;


-- ============================================================================
-- SEED DATA: Genetic Cohorts (5)
-- ============================================================================
INSERT INTO public.genetic_cohorts (cohort_name, defining_variants, member_count, is_active) VALUES
('MTHFR Optimizers',    '["MTHFR C677T", "MTHFR A1298C"]',                          0, true),
('COMT Warriors',       '["COMT V158M", "COMT H62H"]',                              0, true),
('Recovery Optimizers', '["CYP1A2 *1F", "TNF-alpha G308A", "IL-6 G174C"]',          0, true),
('Detox Support',       '["GSTT1 deletion", "GSTM1 deletion", "SOD2 A16V"]',        0, true),
('Sleep Architects',    '["CLOCK T3111C", "PER2 C111G", "ADA G22A"]',               0, true)
ON CONFLICT DO NOTHING;


-- ============================================================================
-- SEED DATA: Active Challenges (3)
-- ============================================================================
INSERT INTO public.challenges (name, description, challenge_type, start_date, end_date, goal_type, goal_value, goal_unit, tokens_reward, badge_id, max_participants, is_active) VALUES
(
    'Compliance Champion',
    'Maintain a perfect 30-day compliance streak. Check in with your supplement protocol every single day for a month to earn the reward.',
    'individual',
    '2026-03-01T00:00:00Z',
    '2026-03-31T23:59:59Z',
    'streak_days',
    30,
    'days',
    200,
    'compliance_30day_streak',
    NULL,
    true
),
(
    'Sleep Optimization Challenge',
    'Average at least 7 hours of sleep per night for 30 days. Connect your sleep tracker and let your data do the talking.',
    'individual',
    '2026-03-01T00:00:00Z',
    '2026-03-31T23:59:59Z',
    'sleep_avg_hours',
    7,
    'hours',
    150,
    NULL,
    NULL,
    true
),
(
    'AI Explorer Month',
    'Have 30 meaningful conversations with the AI health assistant this month. Ask about your genetics, supplements, lifestyle optimizations, and more.',
    'individual',
    '2026-03-01T00:00:00Z',
    '2026-03-31T23:59:59Z',
    'ai_conversations',
    30,
    'conversations',
    100,
    'milestone_first_ai_chat',
    NULL,
    true
)
ON CONFLICT DO NOTHING;


-- ============================================================================
-- Done. Gamification engine migration complete.
-- ============================================================================
