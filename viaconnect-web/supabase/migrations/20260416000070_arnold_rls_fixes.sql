-- Prompt #85 RLS fix: add missing INSERT/UPDATE policies identified by Jeffery audit.
-- These tables had SELECT-only policies but are written to by the Arnold ecosystem.

-- arnold_recommendations: recommender inserts; users update (viewed_at, dismissed_at, outcome)
CREATE POLICY "Service inserts recommendations"
  ON arnold_recommendations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- body_tracker_reconciliation_log: reconciler inserts audit trail
CREATE POLICY "Service inserts reconciliation log"
  ON body_tracker_reconciliation_log
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- arnold_user_profiles: users need to create and update their coaching profile
CREATE POLICY "Users insert own arnold profile"
  ON arnold_user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own arnold profile"
  ON arnold_user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- agent_messages: agents insert messages; agents update status
CREATE POLICY "Service inserts agent messages"
  ON agent_messages
  FOR INSERT
  WITH CHECK (true);  -- agents write on behalf of system, user_id may be null

CREATE POLICY "Service updates agent messages"
  ON agent_messages
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
