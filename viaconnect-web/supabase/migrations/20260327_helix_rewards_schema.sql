-- ============================================================
-- Helix Rewards System — Complete Schema Migration
-- ViaConnect 2026
-- Created: 2026-03-27
-- ============================================================

-- 1. helix_balances
CREATE TABLE IF NOT EXISTS helix_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  lifetime_earned INTEGER NOT NULL DEFAULT 0,
  lifetime_redeemed INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  level_name TEXT NOT NULL DEFAULT 'Newcomer',
  xp_to_next_level INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX idx_helix_balances_user_id ON helix_balances(user_id);
CREATE INDEX idx_helix_balances_level ON helix_balances(level);
CREATE INDEX idx_helix_balances_lifetime_earned ON helix_balances(lifetime_earned DESC);

-- 2. helix_transactions
CREATE TABLE IF NOT EXISTS helix_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'earn_supplement', 'earn_steps', 'earn_meal', 'earn_checkin',
    'earn_workout', 'earn_sleep', 'earn_weight', 'earn_biomarker',
    'earn_referral', 'earn_friend_bonus', 'earn_subscription',
    'earn_research', 'earn_challenge', 'earn_streak_bonus',
    'redeem', 'admin_adjust', 'expire'
  )),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  challenge_id UUID,
  referral_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_helix_transactions_user_id ON helix_transactions(user_id);
CREATE INDEX idx_helix_transactions_type ON helix_transactions(type);
CREATE INDEX idx_helix_transactions_created_at ON helix_transactions(created_at DESC);
CREATE INDEX idx_helix_transactions_user_created ON helix_transactions(user_id, created_at DESC);
CREATE INDEX idx_helix_transactions_challenge_id ON helix_transactions(challenge_id);

-- 3. helix_challenges
CREATE TABLE IF NOT EXISTS helix_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'individual',
  reward_helix INTEGER NOT NULL DEFAULT 0,
  target_value NUMERIC NOT NULL DEFAULT 1,
  target_unit TEXT NOT NULL DEFAULT 'count',
  duration_days INTEGER NOT NULL DEFAULT 7,
  max_participants INTEGER,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_helix_challenges_is_active ON helix_challenges(is_active);
CREATE INDEX idx_helix_challenges_starts_at ON helix_challenges(starts_at);
CREATE INDEX idx_helix_challenges_type ON helix_challenges(type);

-- 4. helix_challenge_participants
CREATE TABLE IF NOT EXISTS helix_challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES helix_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  progress NUMERIC NOT NULL DEFAULT 0,
  progress_percent NUMERIC NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  rank INTEGER,
  helix_earned INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, user_id)
);

CREATE INDEX idx_helix_challenge_participants_user_id ON helix_challenge_participants(user_id);
CREATE INDEX idx_helix_challenge_participants_challenge_id ON helix_challenge_participants(challenge_id);
CREATE INDEX idx_helix_challenge_participants_completed ON helix_challenge_participants(completed_at);

-- 5. helix_squads
CREATE TABLE IF NOT EXISTS helix_squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  avatar_color TEXT NOT NULL DEFAULT '#6366F1',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  max_members INTEGER NOT NULL DEFAULT 20,
  is_public BOOLEAN NOT NULL DEFAULT true,
  invite_code TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_helix_squads_created_by ON helix_squads(created_by);
CREATE INDEX idx_helix_squads_invite_code ON helix_squads(invite_code);
CREATE INDEX idx_helix_squads_is_public ON helix_squads(is_public);

-- 6. helix_squad_members
CREATE TABLE IF NOT EXISTS helix_squad_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES helix_squads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (squad_id, user_id)
);

CREATE INDEX idx_helix_squad_members_squad_id ON helix_squad_members(squad_id);
CREATE INDEX idx_helix_squad_members_user_id ON helix_squad_members(user_id);

-- 7. helix_messages
CREATE TABLE IF NOT EXISTS helix_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES helix_squads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'achievement', 'system')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_helix_messages_squad_id ON helix_messages(squad_id);
CREATE INDEX idx_helix_messages_squad_created ON helix_messages(squad_id, created_at DESC);
CREATE INDEX idx_helix_messages_user_id ON helix_messages(user_id);

-- 8. helix_referrals
CREATE TABLE IF NOT EXISTS helix_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_email TEXT NOT NULL,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed_up', 'qualified', 'rewarded', 'expired')),
  referrer_helix_awarded INTEGER NOT NULL DEFAULT 0,
  referred_helix_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_helix_referrals_referrer_id ON helix_referrals(referrer_id);
CREATE INDEX idx_helix_referrals_referral_code ON helix_referrals(referral_code);
CREATE INDEX idx_helix_referrals_referred_email ON helix_referrals(referred_email);
CREATE INDEX idx_helix_referrals_status ON helix_referrals(status);

-- 9. helix_research_consent
CREATE TABLE IF NOT EXISTS helix_research_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_biomarkers BOOLEAN NOT NULL DEFAULT false,
  consent_supplements BOOLEAN NOT NULL DEFAULT false,
  consent_lifestyle BOOLEAN NOT NULL DEFAULT false,
  consent_anonymized_sharing BOOLEAN NOT NULL DEFAULT false,
  is_enrolled BOOLEAN NOT NULL DEFAULT false,
  monthly_helix_rate INTEGER NOT NULL DEFAULT 200,
  enrolled_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX idx_helix_research_consent_user_id ON helix_research_consent(user_id);
CREATE INDEX idx_helix_research_consent_is_enrolled ON helix_research_consent(is_enrolled);

-- 10. helix_rewards_catalog
CREATE TABLE IF NOT EXISTS helix_rewards_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  cost_helix INTEGER NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  is_active BOOLEAN NOT NULL DEFAULT true,
  stock INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_helix_rewards_catalog_is_active ON helix_rewards_catalog(is_active);
CREATE INDEX idx_helix_rewards_catalog_category ON helix_rewards_catalog(category);
CREATE INDEX idx_helix_rewards_catalog_cost ON helix_rewards_catalog(cost_helix);

-- 11. helix_redemptions
CREATE TABLE IF NOT EXISTS helix_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES helix_rewards_catalog(id) ON DELETE CASCADE,
  helix_spent INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'fulfilled', 'cancelled', 'refunded')),
  fulfilled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_helix_redemptions_user_id ON helix_redemptions(user_id);
CREATE INDEX idx_helix_redemptions_reward_id ON helix_redemptions(reward_id);
CREATE INDEX idx_helix_redemptions_status ON helix_redemptions(status);

-- 12. helix_daily_actions
CREATE TABLE IF NOT EXISTS helix_daily_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_date DATE NOT NULL DEFAULT CURRENT_DATE,
  action_type TEXT NOT NULL,
  helix_awarded INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, action_date, action_type)
);

CREATE INDEX idx_helix_daily_actions_user_id ON helix_daily_actions(user_id);
CREATE INDEX idx_helix_daily_actions_date ON helix_daily_actions(action_date);
CREATE INDEX idx_helix_daily_actions_user_date ON helix_daily_actions(user_id, action_date);
CREATE INDEX idx_helix_daily_actions_action_type ON helix_daily_actions(action_type);

-- 13. helix_leaderboard_weekly
CREATE TABLE IF NOT EXISTS helix_leaderboard_weekly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  helix_earned INTEGER NOT NULL DEFAULT 0,
  challenges_completed INTEGER NOT NULL DEFAULT 0,
  streak_days INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

CREATE INDEX idx_helix_leaderboard_weekly_week ON helix_leaderboard_weekly(week_start);
CREATE INDEX idx_helix_leaderboard_weekly_rank ON helix_leaderboard_weekly(week_start, rank);
CREATE INDEX idx_helix_leaderboard_weekly_user ON helix_leaderboard_weekly(user_id);
CREATE INDEX idx_helix_leaderboard_weekly_helix ON helix_leaderboard_weekly(week_start, helix_earned DESC);

-- 14. helix_levels
CREATE TABLE IF NOT EXISTS helix_levels (
  level INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  min_lifetime_helix INTEGER NOT NULL DEFAULT 0,
  badge_icon TEXT,
  perks JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_helix_levels_min_helix ON helix_levels(min_lifetime_helix);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE helix_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE helix_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE helix_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE helix_challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE helix_squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE helix_squad_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE helix_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE helix_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE helix_research_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE helix_rewards_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE helix_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE helix_daily_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE helix_leaderboard_weekly ENABLE ROW LEVEL SECURITY;
ALTER TABLE helix_levels ENABLE ROW LEVEL SECURITY;

-- helix_balances: users see own data
CREATE POLICY "helix_balances_select_own" ON helix_balances
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "helix_balances_insert_own" ON helix_balances
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "helix_balances_update_own" ON helix_balances
  FOR UPDATE USING (auth.uid() = user_id);

-- helix_transactions: users see own data
CREATE POLICY "helix_transactions_select_own" ON helix_transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "helix_transactions_insert_own" ON helix_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- helix_challenges: all authenticated can read
CREATE POLICY "helix_challenges_select_all" ON helix_challenges
  FOR SELECT USING (auth.role() = 'authenticated');

-- helix_challenge_participants: users see own data
CREATE POLICY "helix_challenge_participants_select_own" ON helix_challenge_participants
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "helix_challenge_participants_insert_own" ON helix_challenge_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "helix_challenge_participants_update_own" ON helix_challenge_participants
  FOR UPDATE USING (auth.uid() = user_id);

-- helix_squads: all authenticated can read public squads
CREATE POLICY "helix_squads_select_public" ON helix_squads
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "helix_squads_insert_own" ON helix_squads
  FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "helix_squads_update_own" ON helix_squads
  FOR UPDATE USING (auth.uid() = created_by);

-- helix_squad_members: users see own memberships
CREATE POLICY "helix_squad_members_select_own" ON helix_squad_members
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "helix_squad_members_insert_own" ON helix_squad_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "helix_squad_members_delete_own" ON helix_squad_members
  FOR DELETE USING (auth.uid() = user_id);

-- helix_messages: readable by squad members
CREATE POLICY "helix_messages_select_squad_members" ON helix_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM helix_squad_members
      WHERE helix_squad_members.squad_id = helix_messages.squad_id
        AND helix_squad_members.user_id = auth.uid()
    )
  );
CREATE POLICY "helix_messages_insert_squad_members" ON helix_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM helix_squad_members
      WHERE helix_squad_members.squad_id = helix_messages.squad_id
        AND helix_squad_members.user_id = auth.uid()
    )
  );

-- helix_referrals: users see own referrals
CREATE POLICY "helix_referrals_select_own" ON helix_referrals
  FOR SELECT USING (auth.uid() = referrer_id);
CREATE POLICY "helix_referrals_insert_own" ON helix_referrals
  FOR INSERT WITH CHECK (auth.uid() = referrer_id);

-- helix_research_consent: users see own data
CREATE POLICY "helix_research_consent_select_own" ON helix_research_consent
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "helix_research_consent_insert_own" ON helix_research_consent
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "helix_research_consent_update_own" ON helix_research_consent
  FOR UPDATE USING (auth.uid() = user_id);

-- helix_rewards_catalog: all authenticated can read
CREATE POLICY "helix_rewards_catalog_select_all" ON helix_rewards_catalog
  FOR SELECT USING (auth.role() = 'authenticated');

-- helix_redemptions: users see own data
CREATE POLICY "helix_redemptions_select_own" ON helix_redemptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "helix_redemptions_insert_own" ON helix_redemptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- helix_daily_actions: users see own data
CREATE POLICY "helix_daily_actions_select_own" ON helix_daily_actions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "helix_daily_actions_insert_own" ON helix_daily_actions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- helix_leaderboard_weekly: all authenticated can read
CREATE POLICY "helix_leaderboard_weekly_select_all" ON helix_leaderboard_weekly
  FOR SELECT USING (auth.role() = 'authenticated');

-- helix_levels: all authenticated can read
CREATE POLICY "helix_levels_select_all" ON helix_levels
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================
-- SEED DATA
-- ============================================================

-- Seed 10 levels
INSERT INTO helix_levels (level, name, min_lifetime_helix, badge_icon, perks) VALUES
  (1,  'Newcomer',      0,      '🌱', '{"description": "Welcome to ViaConnect Helix Rewards"}'),
  (2,  'Explorer',      100,    '🧭', '{"description": "Unlocks daily streak bonuses"}'),
  (3,  'Achiever',      500,    '⭐', '{"description": "Unlocks challenge participation"}'),
  (4,  'Specialist',    1500,   '🔬', '{"description": "Unlocks squad creation"}'),
  (5,  'Champion',      3500,   '🏆', '{"description": "Unlocks premium challenges"}'),
  (6,  'Visionary',     7500,   '👁️', '{"description": "Unlocks exclusive rewards tier"}'),
  (7,  'Luminary',      15000,  '💡', '{"description": "2x streak multiplier cap raised"}'),
  (8,  'Pioneer',       30000,  '🚀', '{"description": "Early access to new features"}'),
  (9,  'Legend',        60000,  '🌟', '{"description": "Dedicated support & priority fulfillment"}'),
  (10, 'Transcendent', 100000,  '🧬', '{"description": "Maximum perks, lifetime VIP status"}');

-- Seed 8 rewards catalog items
INSERT INTO helix_rewards_catalog (name, description, icon, cost_helix, category, is_active, stock) VALUES
  ('GeneX360 Retest',       'A complimentary GeneX360 genetic retest to track your progress.',   '🧬', 5000, 'testing',    true, NULL),
  ('Free Month Supply',     'One month of your personalized supplement stack, on us.',            '💊', 3500, 'supplements', true, NULL),
  ('Product Upgrade',       'Upgrade your current supplement plan to the next tier.',             '⬆️', 2000, 'supplements', true, NULL),
  ('Naturopath Consult',    'A 30-minute private consultation with a certified naturopath.',      '🩺', 4000, 'services',   true, 50),
  ('Merch Drop',            'Exclusive ViaConnect branded merchandise.',                          '👕', 1500, 'merchandise', true, 200),
  ('VIP Early Access',      'Get early access to upcoming ViaConnect features and products.',     '🔑', 2500, 'access',     true, NULL),
  ('15% Discount',          '15% off your next order across the ViaConnect store.',               '🏷️', 3000, 'discounts',  true, NULL),
  ('Partner Bundle',        'A curated wellness bundle from ViaConnect partner brands.',          '🎁', 4500, 'bundles',    true, 100);

-- Seed 6 sample challenges
INSERT INTO helix_challenges (title, description, type, reward_helix, target_value, target_unit, duration_days, is_recurring, is_active, starts_at, ends_at, metadata) VALUES
  ('Steps 10K',        'Hit 10,000 steps every day for 7 days.',           'individual', 300,  70000, 'steps',      7,  true,  true, now(), now() + INTERVAL '7 days',  '{"category": "fitness",   "difficulty": "medium"}'),
  ('Supplement Streak', 'Log your supplements daily for 14 consecutive days.', 'individual', 500,  14,    'days',       14, true,  true, now(), now() + INTERVAL '14 days', '{"category": "nutrition", "difficulty": "easy"}'),
  ('Meal Log',         'Log at least one meal every day for 21 days.',     'individual', 400,  21,    'meals',      21, true,  true, now(), now() + INTERVAL '21 days', '{"category": "nutrition", "difficulty": "medium"}'),
  ('Workout Week',     'Complete 5 workouts in one week.',                 'individual', 250,  5,     'workouts',   7,  true,  true, now(), now() + INTERVAL '7 days',  '{"category": "fitness",   "difficulty": "medium"}'),
  ('Sleep Champion',   'Achieve 7+ hours of sleep every night for 10 days.', 'individual', 350,  10,    'nights',     10, false, true, now(), now() + INTERVAL '10 days', '{"category": "recovery", "difficulty": "hard"}'),
  ('Biomarker Hit',    'Record improved biomarkers after your next retest.', 'individual', 750,  1,     'improvement', 90, false, true, now(), now() + INTERVAL '90 days', '{"category": "testing",  "difficulty": "hard"}');

-- Seed 1 demo squad (uses a placeholder UUID for created_by — update after first user signup)
-- NOTE: This insert will only work if you have at least one user in auth.users.
-- Uncomment and replace the UUID with a real user ID when ready:
-- INSERT INTO helix_squads (name, description, avatar_color, created_by, max_members, is_public, invite_code)
-- VALUES ('Wellness Warriors', 'The original ViaConnect wellness squad. All levels welcome!', '#6366F1', '<REAL_USER_UUID>', 50, true, 'WARRIORS2026');
