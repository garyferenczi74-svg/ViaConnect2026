-- =============================================================================
-- Prompt 210f Task F1: practitioner core ADDITIVE SPLIT migration
-- =============================================================================
-- Gary Decision 1 (2026-07-07): apply the additive parts of the practitioner
-- core tranche now; EVERY destructive statement is deferred per
-- docs/integrity/practitioner-core-drop-evidence.md. This file assembles the
-- additive DDL from the cluster 2 unapplied source migrations, in their
-- original order:
--
--   1. 20260326_three_portal_architecture.sql
--   2. 20260418000060_practitioner_tiers.sql
--   3. 20260418000080_practitioners.sql
--   4. 20260418000090_practitioner_subscriptions.sql
--   5. 20260418000110_practitioner_patients_extension.sql
--   6. 20260418000150_practitioner_patients_invitation_fixes.sql
--   7. 20260418000160_practitioners_schema_reconciliation.sql
--   8. 20260418000180_revised_p91_view_modes_and_constitutional.sql
--   9. 20260418000480_white_label_dispensary_settings.sql (ONLY the
--      practitioners.dispensary_slug slice; the rest of that file is the
--      white label tranche, Task F5)
--
-- DEFERRED (recorded in the evidence pack, NOT carried here):
--   * 20260418000160 line 129: ALTER TABLE practitioners DROP COLUMN status.
--     The backfill UPDATE that fed it IS carried (account_status correctness);
--     the status column stays so admin-guard.ts keeps working.
--   * 20260418000160 line 193: DROP TABLE patient_practitioner_relationships
--     CASCADE (three analytics MVs and two policies hang off it live).
--   * 20260418000160 line 198: DROP POLICY engagement_scores_practitioner_
--     read_with_consent. STALE NAME: live autoheal 20260420045150 merged it
--     into engagement_score_snapshots_select_merged. No bare DROP POLICY is
--     carried anywhere in this file; the recreate lands under the NEW name
--     engagement_scores_practitioner_read_via_pp_210f, dual-name guarded.
--
-- INCLUDED destructive-by-letter statement, per Gary Decision 1 addendum:
--   * 20260418000150: ALTER TABLE practitioner_patients ALTER COLUMN
--     patient_id DROP NOT NULL. The target table is created by this same
--     tranche (does not exist live), so the relax is part of table creation
--     with zero live exposure; excluding it ships a broken invitation flow.
--
-- Conversions applied during extraction (documented in
-- .superpowers/sdd/task-210f-F1-report.md):
--   * Every source DROP POLICY IF EXISTS + CREATE POLICY adjacency pair, and
--     every bare CREATE POLICY, becomes a DO block that creates the policy
--     only when pg_policies has no row for it (no DROP carried).
--   * The source DROP TRIGGER IF EXISTS + CREATE TRIGGER pair becomes a DO
--     block gated on pg_trigger.
--   * Every bare auth.uid() / auth.role() in a policy is wrapped to the
--     initplan form (select auth.uid()) / (select auth.role()), the
--     established repo remediation (see 20260622180000).
--   * practitioner_patients.status CHECK gains the 'invited' value at table
--     creation: the invitation flow (invite-patient route, lookup/accept
--     RPCs shipped below) writes status = 'invited', which the original
--     three-portal CHECK list omitted. Zero live exposure (tranche-created
--     table); purely a domain widening.
--   * herbal_genomic_interactions column "references" is quoted: REFERENCES
--     is a reserved word, so the original unquoted form could never parse.
--   * practitioners.waitlist_id / cohort_id are added WITHOUT their inline
--     REFERENCES clauses: the FK targets (practitioner_waitlist,
--     practitioner_cohorts) are the certification/waitlist tranche (Task F3)
--     and do not exist live yet. A conditional DO block adds the two FK
--     constraints whenever the target tables exist.
--   * The trigger function gains SET search_path = public, pg_temp per the
--     repo function-security posture (zero behavior change).
--   * Duplicate practitioners indexes/policies that appear in both _080 and
--     _160 are emitted once, at the position where their columns exist.
--
-- Shape test: src/lib/__tests__/practitioner-core-migration-shape.test.ts
-- parses this file. DO NOT add destructive statements here; the test fails
-- on any DROP other than the single signed DROP NOT NULL relax.
-- =============================================================================

-- =============================================================================
-- SECTION 1 of 9: from 20260326_three_portal_architecture.sql
-- =============================================================================

-- 1.1 profiles practitioner/naturopath columns (source used DO blocks with
-- duplicate_column exception guards; normalized to ADD COLUMN IF NOT EXISTS).
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS practice_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS license_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS specialty TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS practice_address JSONB;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS accepting_patients BOOLEAN DEFAULT true;

-- 1.2 practitioner_patients. CHECK widened with 'invited' (see header note).
CREATE TABLE IF NOT EXISTS practitioner_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'invited', 'active', 'revoked')),
  consent_granted_at TIMESTAMPTZ,
  consent_revoked_at TIMESTAMPTZ,
  can_view_genetics BOOLEAN DEFAULT false,
  can_view_labs BOOLEAN DEFAULT false,
  can_view_supplements BOOLEAN DEFAULT false,
  can_view_compliance BOOLEAN DEFAULT false,
  can_view_wearables BOOLEAN DEFAULT false,
  can_view_ai_conversations BOOLEAN DEFAULT false,
  can_prescribe_protocols BOOLEAN DEFAULT false,
  can_order_panels BOOLEAN DEFAULT false,
  can_view_medications BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(practitioner_id, patient_id)
);

-- 1.3 collaborative_care
CREATE TABLE IF NOT EXISTS collaborative_care (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  naturopath_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  practitioner_can_view_naturopath_notes BOOLEAN DEFAULT false,
  naturopath_can_view_practitioner_notes BOOLEAN DEFAULT false,
  practitioner_can_view_naturopath_protocols BOOLEAN DEFAULT false,
  naturopath_can_view_practitioner_protocols BOOLEAN DEFAULT false,
  patient_consent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.4 supplement_protocols
CREATE TABLE IF NOT EXISTS supplement_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prescribed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prescribed_by_role TEXT NOT NULL,
  protocol_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'active', 'completed', 'rejected')),
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.5 supplement_protocol_items
CREATE TABLE IF NOT EXISTS supplement_protocol_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id UUID NOT NULL REFERENCES supplement_protocols(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_id TEXT,
  dosage TEXT NOT NULL,
  timing TEXT NOT NULL,
  frequency TEXT NOT NULL,
  duration_days INTEGER,
  rationale TEXT,
  genetic_context JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.6 clinical_notes
CREATE TABLE IF NOT EXISTS clinical_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_role TEXT NOT NULL,
  note_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT false,
  referenced_snps JSONB,
  referenced_labs JSONB,
  referenced_protocol_id UUID REFERENCES supplement_protocols(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.7 panel_orders
CREATE TABLE IF NOT EXISTS panel_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ordered_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ordered_by_role TEXT NOT NULL,
  panel_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  batch_id TEXT,
  stripe_payment_id TEXT,
  kit_tracking_number TEXT,
  results_received_at TIMESTAMPTZ,
  results_reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.8 portal_messages
CREATE TABLE IF NOT EXISTS portal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  attached_protocol_id UUID REFERENCES supplement_protocols(id) ON DELETE SET NULL,
  attached_note_id UUID REFERENCES clinical_notes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.9 herbal_genomic_interactions ("references" quoted; reserved word)
CREATE TABLE IF NOT EXISTS herbal_genomic_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  herb_name TEXT NOT NULL,
  herb_latin_name TEXT,
  gene TEXT NOT NULL,
  variant TEXT,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('synergistic', 'antagonistic', 'modifying', 'caution')),
  description TEXT NOT NULL,
  mechanism TEXT,
  evidence_level TEXT NOT NULL CHECK (evidence_level IN ('strong', 'moderate', 'preliminary', 'traditional')),
  "references" JSONB,
  related_supplement TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.10 patient_intake_forms
CREATE TABLE IF NOT EXISTS patient_intake_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  form_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  form_data JSONB,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.11 consultations
CREATE TABLE IF NOT EXISTS consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_sid TEXT,
  practitioner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  naturopath_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  notes_id UUID REFERENCES clinical_notes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.12 Enable RLS on all three-portal tables
ALTER TABLE practitioner_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborative_care ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplement_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplement_protocol_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE herbal_genomic_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_intake_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

-- 1.13 RLS policies (source bare CREATE POLICY converted to pg_policies
-- guarded DO blocks; auth calls initplan-wrapped)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'practitioner_patients'
      AND policyname = 'Users see own practitioner_patients'
  ) THEN
    CREATE POLICY "Users see own practitioner_patients" ON practitioner_patients
      FOR SELECT USING ((select auth.uid()) = practitioner_id OR (select auth.uid()) = patient_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'practitioner_patients'
      AND policyname = 'Practitioners insert practitioner_patients'
  ) THEN
    CREATE POLICY "Practitioners insert practitioner_patients" ON practitioner_patients
      FOR INSERT WITH CHECK ((select auth.uid()) = practitioner_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'practitioner_patients'
      AND policyname = 'Users update own practitioner_patients'
  ) THEN
    CREATE POLICY "Users update own practitioner_patients" ON practitioner_patients
      FOR UPDATE USING ((select auth.uid()) = practitioner_id OR (select auth.uid()) = patient_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'collaborative_care'
      AND policyname = 'Users see own collaborative_care'
  ) THEN
    CREATE POLICY "Users see own collaborative_care" ON collaborative_care
      FOR SELECT USING ((select auth.uid()) = patient_id OR (select auth.uid()) = practitioner_id OR (select auth.uid()) = naturopath_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'supplement_protocols'
      AND policyname = 'Patients see own protocols'
  ) THEN
    CREATE POLICY "Patients see own protocols" ON supplement_protocols
      FOR SELECT USING ((select auth.uid()) = patient_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'supplement_protocols'
      AND policyname = 'Prescribers see own protocols'
  ) THEN
    CREATE POLICY "Prescribers see own protocols" ON supplement_protocols
      FOR SELECT USING ((select auth.uid()) = prescribed_by);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'supplement_protocols'
      AND policyname = 'Practitioners see patient protocols'
  ) THEN
    CREATE POLICY "Practitioners see patient protocols" ON supplement_protocols
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM practitioner_patients
          WHERE practitioner_patients.practitioner_id = (select auth.uid())
            AND practitioner_patients.patient_id = supplement_protocols.patient_id
            AND practitioner_patients.status = 'active'
            AND practitioner_patients.can_view_supplements = true
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'supplement_protocols'
      AND policyname = 'Prescribers insert protocols'
  ) THEN
    CREATE POLICY "Prescribers insert protocols" ON supplement_protocols
      FOR INSERT WITH CHECK ((select auth.uid()) = prescribed_by);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'supplement_protocols'
      AND policyname = 'Prescribers update own protocols'
  ) THEN
    CREATE POLICY "Prescribers update own protocols" ON supplement_protocols
      FOR UPDATE USING ((select auth.uid()) = prescribed_by OR (select auth.uid()) = patient_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'supplement_protocol_items'
      AND policyname = 'Users see protocol items via protocol'
  ) THEN
    CREATE POLICY "Users see protocol items via protocol" ON supplement_protocol_items
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM supplement_protocols
          WHERE supplement_protocols.id = supplement_protocol_items.protocol_id
            AND (supplement_protocols.patient_id = (select auth.uid()) OR supplement_protocols.prescribed_by = (select auth.uid()))
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'supplement_protocol_items'
      AND policyname = 'Practitioners see protocol items'
  ) THEN
    CREATE POLICY "Practitioners see protocol items" ON supplement_protocol_items
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM supplement_protocols
          JOIN practitioner_patients ON practitioner_patients.patient_id = supplement_protocols.patient_id
          WHERE supplement_protocols.id = supplement_protocol_items.protocol_id
            AND practitioner_patients.practitioner_id = (select auth.uid())
            AND practitioner_patients.status = 'active'
            AND practitioner_patients.can_view_supplements = true
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'supplement_protocol_items'
      AND policyname = 'Prescribers manage protocol items'
  ) THEN
    CREATE POLICY "Prescribers manage protocol items" ON supplement_protocol_items
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM supplement_protocols
          WHERE supplement_protocols.id = supplement_protocol_items.protocol_id
            AND supplement_protocols.prescribed_by = (select auth.uid())
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'clinical_notes'
      AND policyname = 'Authors see own notes'
  ) THEN
    CREATE POLICY "Authors see own notes" ON clinical_notes
      FOR SELECT USING ((select auth.uid()) = author_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'clinical_notes'
      AND policyname = 'Patients see non-private notes'
  ) THEN
    CREATE POLICY "Patients see non-private notes" ON clinical_notes
      FOR SELECT USING ((select auth.uid()) = patient_id AND is_private = false);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'clinical_notes'
      AND policyname = 'Practitioners see patient notes'
  ) THEN
    CREATE POLICY "Practitioners see patient notes" ON clinical_notes
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM practitioner_patients
          WHERE practitioner_patients.practitioner_id = (select auth.uid())
            AND practitioner_patients.patient_id = clinical_notes.patient_id
            AND practitioner_patients.status = 'active'
        )
        AND is_private = false
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'clinical_notes'
      AND policyname = 'Authors insert notes'
  ) THEN
    CREATE POLICY "Authors insert notes" ON clinical_notes
      FOR INSERT WITH CHECK ((select auth.uid()) = author_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'clinical_notes'
      AND policyname = 'Authors update own notes'
  ) THEN
    CREATE POLICY "Authors update own notes" ON clinical_notes
      FOR UPDATE USING ((select auth.uid()) = author_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'panel_orders'
      AND policyname = 'Patients see own panel orders'
  ) THEN
    CREATE POLICY "Patients see own panel orders" ON panel_orders
      FOR SELECT USING ((select auth.uid()) = patient_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'panel_orders'
      AND policyname = 'Orderers see own panel orders'
  ) THEN
    CREATE POLICY "Orderers see own panel orders" ON panel_orders
      FOR SELECT USING ((select auth.uid()) = ordered_by);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'panel_orders'
      AND policyname = 'Practitioners see patient panel orders'
  ) THEN
    CREATE POLICY "Practitioners see patient panel orders" ON panel_orders
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM practitioner_patients
          WHERE practitioner_patients.practitioner_id = (select auth.uid())
            AND practitioner_patients.patient_id = panel_orders.patient_id
            AND practitioner_patients.status = 'active'
            AND practitioner_patients.can_view_labs = true
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'panel_orders'
      AND policyname = 'Orderers insert panel orders'
  ) THEN
    CREATE POLICY "Orderers insert panel orders" ON panel_orders
      FOR INSERT WITH CHECK ((select auth.uid()) = ordered_by);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'portal_messages'
      AND policyname = 'Users see own messages'
  ) THEN
    CREATE POLICY "Users see own messages" ON portal_messages
      FOR SELECT USING ((select auth.uid()) = sender_id OR (select auth.uid()) = recipient_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'portal_messages'
      AND policyname = 'Users send messages'
  ) THEN
    CREATE POLICY "Users send messages" ON portal_messages
      FOR INSERT WITH CHECK ((select auth.uid()) = sender_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'portal_messages'
      AND policyname = 'Recipients update messages'
  ) THEN
    CREATE POLICY "Recipients update messages" ON portal_messages
      FOR UPDATE USING ((select auth.uid()) = recipient_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'herbal_genomic_interactions'
      AND policyname = 'Authenticated users read herbal interactions'
  ) THEN
    CREATE POLICY "Authenticated users read herbal interactions" ON herbal_genomic_interactions
      FOR SELECT USING ((select auth.role()) = 'authenticated');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'patient_intake_forms'
      AND policyname = 'Patients see own intake forms'
  ) THEN
    CREATE POLICY "Patients see own intake forms" ON patient_intake_forms
      FOR SELECT USING ((select auth.uid()) = patient_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'patient_intake_forms'
      AND policyname = 'Practitioners see assigned intake forms'
  ) THEN
    CREATE POLICY "Practitioners see assigned intake forms" ON patient_intake_forms
      FOR SELECT USING ((select auth.uid()) = practitioner_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'patient_intake_forms'
      AND policyname = 'Practitioners insert intake forms'
  ) THEN
    CREATE POLICY "Practitioners insert intake forms" ON patient_intake_forms
      FOR INSERT WITH CHECK ((select auth.uid()) = practitioner_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'patient_intake_forms'
      AND policyname = 'Users update own intake forms'
  ) THEN
    CREATE POLICY "Users update own intake forms" ON patient_intake_forms
      FOR UPDATE USING ((select auth.uid()) = patient_id OR (select auth.uid()) = practitioner_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'consultations'
      AND policyname = 'Users see own consultations'
  ) THEN
    CREATE POLICY "Users see own consultations" ON consultations
      FOR SELECT USING (
        (select auth.uid()) = practitioner_id OR (select auth.uid()) = patient_id OR (select auth.uid()) = naturopath_id
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'consultations'
      AND policyname = 'Practitioners insert consultations'
  ) THEN
    CREATE POLICY "Practitioners insert consultations" ON consultations
      FOR INSERT WITH CHECK ((select auth.uid()) = practitioner_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'consultations'
      AND policyname = 'Practitioners update consultations'
  ) THEN
    CREATE POLICY "Practitioners update consultations" ON consultations
      FOR UPDATE USING ((select auth.uid()) = practitioner_id);
  END IF;
END $$;

-- 1.14 Indexes
CREATE INDEX IF NOT EXISTS idx_practitioner_patients_practitioner_status
  ON practitioner_patients(practitioner_id, status);

CREATE INDEX IF NOT EXISTS idx_practitioner_patients_patient
  ON practitioner_patients(patient_id);

CREATE INDEX IF NOT EXISTS idx_supplement_protocols_patient
  ON supplement_protocols(patient_id);

CREATE INDEX IF NOT EXISTS idx_clinical_notes_patient_created
  ON clinical_notes(patient_id, created_at);

CREATE INDEX IF NOT EXISTS idx_panel_orders_ordered_by
  ON panel_orders(ordered_by);

CREATE INDEX IF NOT EXISTS idx_portal_messages_conversation_created
  ON portal_messages(conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_herbal_genomic_interactions_herb
  ON herbal_genomic_interactions(herb_name);

CREATE INDEX IF NOT EXISTS idx_herbal_genomic_interactions_gene
  ON herbal_genomic_interactions(gene);

-- 1.15 Seed: herbal_genomic_interactions (source INSERT had no conflict
-- handling; wrapped in an empty-table guard so re-runs cannot duplicate)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.herbal_genomic_interactions) THEN
    INSERT INTO public.herbal_genomic_interactions (herb_name, herb_latin_name, gene, variant, interaction_type, description, mechanism, evidence_level, "references", related_supplement)
    VALUES
      (
        'St. John''s Wort',
        'Hypericum perforatum',
        'CYP2D6',
        '*1/*4',
        'caution',
        'St. John''s Wort induces CYP2D6 enzyme activity, potentially altering metabolism of medications processed by this pathway.',
        'Induces CYP2D6 expression via PXR activation, increasing metabolic clearance of CYP2D6 substrates.',
        'strong',
        '["PMID:12648025", "PMID:15089812"]',
        'Hypericum extract'
      ),
      (
        'Turmeric / Curcumin',
        'Curcuma longa',
        'COMT',
        'Val158Met',
        'synergistic',
        'Curcumin inhibits COMT enzyme activity, synergistically supporting catecholamine balance in slow COMT variants.',
        'Competitive inhibition of COMT enzyme; supports dopamine and estrogen metabolism modulation.',
        'moderate',
        '["PMID:19442862", "PMID:21428901"]',
        'Curcumin extract'
      ),
      (
        'Ashwagandha',
        'Withania somnifera',
        'GAD1',
        'rs3749034',
        'synergistic',
        'Ashwagandha supports GABAergic activity, synergistically beneficial for individuals with GAD1 variants affecting GABA synthesis.',
        'Withanolides support GABA-A receptor modulation and may upregulate GAD1 expression for GABA synthesis.',
        'moderate',
        '["PMID:23439798", "PMID:28471731"]',
        'Ashwagandha root extract (KSM-66)'
      ),
      (
        'Milk Thistle',
        'Silybum marianum',
        'CYP3A4',
        '*1/*22',
        'caution',
        'Silymarin inhibits CYP3A4 activity, potentially increasing drug concentrations for medications metabolized by this enzyme.',
        'Competitive and mechanism-based inhibition of CYP3A4 by silybin A and silybin B.',
        'moderate',
        '["PMID:16415089", "PMID:19505216"]',
        'Silymarin / Milk Thistle extract'
      ),
      (
        'Ginkgo Biloba',
        'Ginkgo biloba',
        'CYP2C19',
        '*2/*2',
        'caution',
        'Ginkgo inhibits CYP2C19, which may compound poor-metabolizer phenotype effects and alter drug clearance.',
        'Ginkgolides and bilobalide inhibit CYP2C19 enzymatic activity, reducing clearance of CYP2C19 substrates.',
        'moderate',
        '["PMID:12383232", "PMID:16618019"]',
        'Ginkgo leaf extract (EGb 761)'
      ),
      (
        'Valerian',
        'Valeriana officinalis',
        'GABA-A receptor',
        'GABRA1 rs2279020',
        'synergistic',
        'Valerian enhances GABAergic transmission at GABA-A receptors, synergistic for variants affecting receptor sensitivity.',
        'Valerenic acid and isovaleric acid modulate GABA-A receptor subunit activity, enhancing inhibitory neurotransmission.',
        'moderate',
        '["PMID:15895713", "PMID:20042323"]',
        'Valerian root extract'
      ),
      (
        'Echinacea',
        'Echinacea purpurea',
        'TNF-alpha',
        'rs1800629',
        'modifying',
        'Echinacea modulates TNF-alpha expression, potentially modifying inflammatory response in TNF-alpha promoter variants.',
        'Alkamides and polysaccharides modulate NF-kB pathway, altering TNF-alpha transcription and cytokine balance.',
        'preliminary',
        '["PMID:17221569", "PMID:19504465"]',
        'Echinacea purpurea extract'
      ),
      (
        'Green Tea / EGCG',
        'Camellia sinensis',
        'COMT',
        'Val158Met',
        'antagonistic',
        'EGCG is a potent COMT inhibitor; in slow COMT variants, this may further reduce catecholamine clearance, causing adverse effects.',
        'EGCG acts as a high-affinity COMT substrate/inhibitor, competing with endogenous catechol compounds for enzyme binding.',
        'strong',
        '["PMID:17522597", "PMID:20304568"]',
        'Green Tea Extract (standardized EGCG)'
      );
  END IF;
END $$;

-- =============================================================================
-- SECTION 2 of 9: from 20260418000060_practitioner_tiers.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.practitioner_tiers (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  monthly_price_cents INTEGER NOT NULL CHECK (monthly_price_cents >= 0),
  annual_price_cents INTEGER NOT NULL CHECK (annual_price_cents >= 0),
  annual_savings_cents INTEGER GENERATED ALWAYS AS (monthly_price_cents * 12 - annual_price_cents) STORED,
  description TEXT,
  co_branding_level TEXT NOT NULL CHECK (co_branding_level IN ('medium', 'heavy_white_label')),
  wholesale_discount_percent INTEGER NOT NULL DEFAULT 50 CHECK (wholesale_discount_percent BETWEEN 0 AND 100),
  stripe_product_id TEXT,
  stripe_monthly_price_id TEXT,
  stripe_annual_price_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.practitioner_tiers IS
  'Practitioner subscription tiers: Standard Portal and White-Label Platform.';

ALTER TABLE public.practitioner_tiers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'practitioner_tiers'
      AND policyname = 'practitioner_tiers_read_all'
  ) THEN
    CREATE POLICY practitioner_tiers_read_all
      ON public.practitioner_tiers FOR SELECT
      TO authenticated, anon
      USING (is_active = true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'practitioner_tiers'
      AND policyname = 'practitioner_tiers_admin_write'
  ) THEN
    CREATE POLICY practitioner_tiers_admin_write
      ON public.practitioner_tiers FOR ALL
      TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'));
  END IF;
END $$;

INSERT INTO public.practitioner_tiers (
  id, display_name, monthly_price_cents, annual_price_cents,
  description, co_branding_level, wholesale_discount_percent, sort_order
) VALUES
  ('standard', 'Standard Practitioner Portal',
    12888, 128880,
    'Full practitioner portal access. Medium co-branded patient experience. Level 1 Foundation certification included. Wholesale pricing at 50 percent off MSRP. Patient panel management, protocol tools, integrated messaging.',
    'medium', 50, 1),
  ('white_label', 'White-Label Platform',
    28888, 288880,
    'Premium practitioner tier. Heavy white-label patient experience with custom domain option. Minimal ViaCura branding. Dedicated account management. Priority feature requests. Qualifying criteria: Level 3 Master Practitioner certification, 500+ active patients, or $50K+ annual wholesale.',
    'heavy_white_label', 50, 2)
ON CONFLICT (id) DO UPDATE SET
  display_name              = EXCLUDED.display_name,
  monthly_price_cents       = EXCLUDED.monthly_price_cents,
  annual_price_cents        = EXCLUDED.annual_price_cents,
  description               = EXCLUDED.description,
  co_branding_level         = EXCLUDED.co_branding_level,
  wholesale_discount_percent= EXCLUDED.wholesale_discount_percent,
  sort_order                = EXCLUDED.sort_order,
  updated_at                = NOW();

-- =============================================================================
-- SECTION 3 of 9: from 20260418000080_practitioners.sql
-- =============================================================================
-- Live practitioners is the 20260418000050 six-column stub, so this CREATE is
-- a no-op live (the section 7 ADD COLUMN pack reconciles the live shape). On
-- a fresh full replay the original _010/_020 files run first, so the two FK
-- targets referenced below exist there.

CREATE TABLE IF NOT EXISTS public.practitioners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  waitlist_id UUID REFERENCES public.practitioner_waitlist(id),
  cohort_id UUID REFERENCES public.practitioner_cohorts(id),
  display_name TEXT NOT NULL,
  professional_title TEXT,
  credential_type TEXT NOT NULL CHECK (credential_type IN (
    'md', 'do', 'nd', 'dc', 'np', 'pa', 'rd', 'lac', 'other'
  )),
  credential_type_other TEXT,
  bio TEXT,
  headshot_url TEXT,
  practice_name TEXT NOT NULL,
  practice_url TEXT,
  practice_logo_url TEXT,
  practice_street_address TEXT,
  practice_city TEXT,
  practice_state TEXT,
  practice_postal_code TEXT,
  practice_country TEXT DEFAULT 'US',
  practice_phone TEXT,
  practice_email TEXT,
  license_state TEXT,
  license_number TEXT,
  license_verified BOOLEAN NOT NULL DEFAULT false,
  license_verified_at TIMESTAMPTZ,
  license_verified_by UUID REFERENCES auth.users(id),
  npi_number TEXT,
  primary_clinical_focus TEXT,
  specialties TEXT[] DEFAULT ARRAY[]::TEXT[],
  years_in_practice INTEGER CHECK (years_in_practice IS NULL OR years_in_practice BETWEEN 0 AND 80),
  active_patient_panel_size INTEGER NOT NULL DEFAULT 0 CHECK (active_patient_panel_size >= 0),
  co_branding_enabled BOOLEAN NOT NULL DEFAULT true,
  custom_domain TEXT UNIQUE,
  brand_primary_color TEXT,
  brand_accent_color TEXT,
  patient_facing_display_name TEXT,
  account_status TEXT NOT NULL DEFAULT 'pending_onboarding' CHECK (account_status IN (
    'pending_onboarding', 'onboarding', 'active', 'suspended', 'terminated'
  )),
  onboarded_at TIMESTAMPTZ,
  suspended_reason TEXT,
  suspended_at TIMESTAMPTZ,
  prefers_email_notifications BOOLEAN DEFAULT true,
  prefers_sms_notifications BOOLEAN DEFAULT false,
  timezone TEXT DEFAULT 'America/New_York',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.practitioners IS
  'Practitioner account records. Linked 1:1 to auth.users via UNIQUE user_id. credential_type in (nd, dc, lac) triggers the naturopath sidebar feature flag.';

-- idx_practitioners_user targets a live column and stays here. The _080
-- indexes on account_status, credential_type, cohort_id, and custom_domain
-- depend on columns the section 7 pack adds, and section 7 creates
-- equivalent indexes on those columns, so they are emitted there instead.
CREATE INDEX IF NOT EXISTS idx_practitioners_user ON public.practitioners(user_id);

ALTER TABLE public.practitioners ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'practitioners'
      AND policyname = 'practitioners_self_read'
  ) THEN
    CREATE POLICY practitioners_self_read
      ON public.practitioners FOR SELECT
      TO authenticated
      USING (user_id = (select auth.uid()));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'practitioners'
      AND policyname = 'practitioners_self_update'
  ) THEN
    CREATE POLICY practitioners_self_update
      ON public.practitioners FOR UPDATE
      TO authenticated
      USING (user_id = (select auth.uid()))
      WITH CHECK (user_id = (select auth.uid()));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'practitioners'
      AND policyname = 'practitioners_admin_all'
  ) THEN
    CREATE POLICY practitioners_admin_all
      ON public.practitioners FOR ALL
      TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'practitioners'
      AND policyname = 'practitioners_patient_read_public'
  ) THEN
    CREATE POLICY practitioners_patient_read_public
      ON public.practitioners FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.practitioner_patients pp
          WHERE pp.practitioner_id = practitioners.user_id
            AND pp.patient_id = (select auth.uid())
            AND pp.status = 'active'
        )
      );
  END IF;
END $$;

-- =============================================================================
-- SECTION 4 of 9: from 20260418000090_practitioner_subscriptions.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.practitioner_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  tier_id TEXT NOT NULL REFERENCES public.practitioner_tiers(id),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  started_at TIMESTAMPTZ NOT NULL,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'paused', 'trialing')),
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  paypal_subscription_id TEXT,
  payment_method TEXT CHECK (payment_method IS NULL OR payment_method IN ('stripe', 'paypal', 'complimentary', 'invoice')),
  is_annual_prepay BOOLEAN NOT NULL DEFAULT false,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  canceled_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.practitioner_subscriptions IS
  'Practitioner subscription state (Standard $128.88 or White-Label $288.88 monthly). Separate from consumer memberships.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_practitioner_subs_one_active
  ON public.practitioner_subscriptions(practitioner_id)
  WHERE status IN ('active', 'trialing', 'past_due');

CREATE INDEX IF NOT EXISTS idx_practitioner_subs_practitioner
  ON public.practitioner_subscriptions(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_practitioner_subs_period_end
  ON public.practitioner_subscriptions(current_period_end)
  WHERE status IN ('active', 'trialing');

ALTER TABLE public.practitioner_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'practitioner_subscriptions'
      AND policyname = 'practitioner_subs_self_read'
  ) THEN
    CREATE POLICY practitioner_subs_self_read
      ON public.practitioner_subscriptions FOR SELECT
      TO authenticated
      USING (
        practitioner_id IN (
          SELECT id FROM public.practitioners WHERE user_id = (select auth.uid())
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'practitioner_subscriptions'
      AND policyname = 'practitioner_subs_admin_all'
  ) THEN
    CREATE POLICY practitioner_subs_admin_all
      ON public.practitioner_subscriptions FOR ALL
      TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'));
  END IF;
END $$;

-- =============================================================================
-- SECTION 5 of 9: from 20260418000110_practitioner_patients_extension.sql
-- =============================================================================

ALTER TABLE public.practitioner_patients
  ADD COLUMN IF NOT EXISTS invitation_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invitation_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invitation_note TEXT,
  ADD COLUMN IF NOT EXISTS first_visit_date DATE,
  ADD COLUMN IF NOT EXISTS chief_complaint TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS practitioner_notes TEXT,
  ADD COLUMN IF NOT EXISTS consent_share_caq BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_share_engagement_score BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS consent_share_protocols BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS consent_share_nutrition BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS relationship_ended_at TIMESTAMPTZ;

COMMENT ON COLUMN public.practitioner_patients.invitation_token IS
  'Single-use token sent to a patient who has not yet linked. Becomes NULL after acceptance.';
COMMENT ON COLUMN public.practitioner_patients.consent_share_caq IS
  'Phase 2 consent flag: patient permits practitioner to read CAQ assessment_results. Default false; patient must explicitly grant.';
COMMENT ON COLUMN public.practitioner_patients.consent_share_engagement_score IS
  'Aggregate engagement score (0-100) only. Helix internals (balance, transactions, achievements) are NEVER shared regardless of this flag.';

CREATE INDEX IF NOT EXISTS idx_pp_invitation_token
  ON public.practitioner_patients(invitation_token)
  WHERE invitation_token IS NOT NULL;

-- Trigger: bump consent_updated_at whenever any consent_share_* flag changes.
-- search_path pinned per the repo function-security posture.
CREATE OR REPLACE FUNCTION public.tg_practitioner_patients_consent_touch()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (NEW.consent_share_caq IS DISTINCT FROM OLD.consent_share_caq)
     OR (NEW.consent_share_engagement_score IS DISTINCT FROM OLD.consent_share_engagement_score)
     OR (NEW.consent_share_protocols IS DISTINCT FROM OLD.consent_share_protocols)
     OR (NEW.consent_share_nutrition IS DISTINCT FROM OLD.consent_share_nutrition) THEN
    NEW.consent_updated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

-- Source DROP TRIGGER + CREATE TRIGGER pair converted to a pg_trigger guard.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'practitioner_patients_consent_touch'
      AND tgrelid = 'public.practitioner_patients'::regclass
  ) THEN
    CREATE TRIGGER practitioner_patients_consent_touch
      BEFORE UPDATE ON public.practitioner_patients
      FOR EACH ROW EXECUTE FUNCTION public.tg_practitioner_patients_consent_touch();
  END IF;
END $$;

-- =============================================================================
-- SECTION 6 of 9: from 20260418000150_practitioner_patients_invitation_fixes.sql
-- =============================================================================
-- The DROP NOT NULL relax is INCLUDED per Gary Decision 1: practitioner_patients
-- is created by this same tranche, so the relax is part of table creation with
-- zero live exposure, and excluding it ships a broken invitation flow
-- (evidence pack section 3).

ALTER TABLE public.practitioner_patients
  ALTER COLUMN patient_id DROP NOT NULL;

ALTER TABLE public.practitioner_patients
  ADD COLUMN IF NOT EXISTS invited_email      TEXT,
  ADD COLUMN IF NOT EXISTS invited_first_name TEXT,
  ADD COLUMN IF NOT EXISTS invited_last_name  TEXT;

CREATE INDEX IF NOT EXISTS idx_pp_invited_email
  ON public.practitioner_patients(invited_email)
  WHERE invited_email IS NOT NULL;

COMMENT ON COLUMN public.practitioner_patients.invited_email IS
  'Patient email captured at invitation time. Used for resend flow + admin audit. patient_id is null until the patient accepts.';

CREATE OR REPLACE FUNCTION public.lookup_practitioner_invitation(p_token TEXT)
RETURNS TABLE (
  ok BOOLEAN,
  invitation_note TEXT,
  practitioner_user_id UUID,
  practitioner_display_name TEXT,
  practice_name TEXT,
  practice_logo_url TEXT,
  consent_share_caq BOOLEAN,
  consent_share_engagement_score BOOLEAN,
  consent_share_protocols BOOLEAN,
  consent_share_nutrition BOOLEAN,
  can_view_genetics BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  rec RECORD;
BEGIN
  SELECT
    pp.invitation_note, pp.practitioner_id,
    pp.consent_share_caq, pp.consent_share_engagement_score,
    pp.consent_share_protocols, pp.consent_share_nutrition, pp.can_view_genetics,
    p.display_name, p.practice_name, p.practice_logo_url
  INTO rec
  FROM public.practitioner_patients pp
  LEFT JOIN public.practitioners p ON p.user_id = pp.practitioner_id
  WHERE pp.invitation_token = p_token
    AND pp.status = 'invited'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      false, NULL::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT,
      NULL::BOOLEAN, NULL::BOOLEAN, NULL::BOOLEAN, NULL::BOOLEAN, NULL::BOOLEAN;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    true,
    rec.invitation_note,
    rec.practitioner_id,
    rec.display_name,
    rec.practice_name,
    rec.practice_logo_url,
    rec.consent_share_caq,
    rec.consent_share_engagement_score,
    rec.consent_share_protocols,
    rec.consent_share_nutrition,
    rec.can_view_genetics;
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_practitioner_invitation(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.lookup_practitioner_invitation(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.accept_practitioner_invitation(
  p_token                          TEXT,
  p_consent_share_caq              BOOLEAN,
  p_consent_share_engagement_score BOOLEAN,
  p_consent_share_protocols        BOOLEAN,
  p_consent_share_nutrition        BOOLEAN,
  p_can_view_genetics              BOOLEAN
)
RETURNS TABLE (
  ok BOOLEAN,
  relationship_id UUID,
  practitioner_user_id UUID,
  error_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_id   UUID;
  v_pract UUID;
  v_rows INTEGER;
BEGIN
  IF v_user IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, 'unauthenticated'::TEXT;
    RETURN;
  END IF;

  UPDATE public.practitioner_patients
     SET patient_id              = v_user,
         status                  = 'active',
         consent_granted_at      = now(),
         invitation_accepted_at  = now(),
         invitation_token        = NULL,
         consent_share_caq              = p_consent_share_caq,
         consent_share_engagement_score = p_consent_share_engagement_score,
         consent_share_protocols        = p_consent_share_protocols,
         consent_share_nutrition        = p_consent_share_nutrition,
         can_view_genetics              = p_can_view_genetics,
         updated_at = now()
   WHERE invitation_token = p_token
     AND status = 'invited'
   RETURNING id, practitioner_id INTO v_id, v_pract;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, 'invalid_or_used'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_id, v_pract, NULL::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_practitioner_invitation(
  TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN
) FROM public;
GRANT EXECUTE ON FUNCTION public.accept_practitioner_invitation(
  TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN
) TO authenticated;

-- =============================================================================
-- SECTION 7 of 9: from 20260418000160_practitioners_schema_reconciliation.sql
-- =============================================================================
-- waitlist_id and cohort_id are added WITHOUT their inline FK clauses: the
-- targets (practitioner_waitlist, practitioner_cohorts) belong to the
-- certification/waitlist tranche (Task F3) and do not exist live yet. The DO
-- block after the pack attaches both FKs whenever the targets exist.

ALTER TABLE public.practitioners
  ADD COLUMN IF NOT EXISTS waitlist_id                 UUID,
  ADD COLUMN IF NOT EXISTS cohort_id                   UUID,
  ADD COLUMN IF NOT EXISTS professional_title          TEXT,
  ADD COLUMN IF NOT EXISTS credential_type             TEXT,
  ADD COLUMN IF NOT EXISTS credential_type_other       TEXT,
  ADD COLUMN IF NOT EXISTS bio                         TEXT,
  ADD COLUMN IF NOT EXISTS headshot_url                TEXT,
  ADD COLUMN IF NOT EXISTS practice_name               TEXT,
  ADD COLUMN IF NOT EXISTS practice_url                TEXT,
  ADD COLUMN IF NOT EXISTS practice_logo_url           TEXT,
  ADD COLUMN IF NOT EXISTS practice_street_address     TEXT,
  ADD COLUMN IF NOT EXISTS practice_city               TEXT,
  ADD COLUMN IF NOT EXISTS practice_state              TEXT,
  ADD COLUMN IF NOT EXISTS practice_postal_code        TEXT,
  ADD COLUMN IF NOT EXISTS practice_country            TEXT DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS practice_phone              TEXT,
  ADD COLUMN IF NOT EXISTS practice_email              TEXT,
  ADD COLUMN IF NOT EXISTS license_state               TEXT,
  ADD COLUMN IF NOT EXISTS license_number              TEXT,
  ADD COLUMN IF NOT EXISTS license_verified            BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS license_verified_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS license_verified_by         UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS npi_number                  TEXT,
  ADD COLUMN IF NOT EXISTS primary_clinical_focus      TEXT,
  ADD COLUMN IF NOT EXISTS specialties                 TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS years_in_practice           INTEGER,
  ADD COLUMN IF NOT EXISTS active_patient_panel_size   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS co_branding_enabled         BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS custom_domain               TEXT,
  ADD COLUMN IF NOT EXISTS brand_primary_color         TEXT,
  ADD COLUMN IF NOT EXISTS brand_accent_color          TEXT,
  ADD COLUMN IF NOT EXISTS patient_facing_display_name TEXT,
  ADD COLUMN IF NOT EXISTS account_status              TEXT,
  ADD COLUMN IF NOT EXISTS onboarded_at                TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_reason            TEXT,
  ADD COLUMN IF NOT EXISTS suspended_at                TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS prefers_email_notifications BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS prefers_sms_notifications   BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS timezone                    TEXT DEFAULT 'America/New_York',
  ADD COLUMN IF NOT EXISTS metadata                    JSONB DEFAULT '{}'::jsonb;

-- Deferred-FK attach: fires only when the waitlist/cohorts tranche exists.
DO $$
BEGIN
  IF to_regclass('public.practitioner_waitlist') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conname = 'practitioners_waitlist_id_fkey'
         AND conrelid = 'public.practitioners'::regclass
     ) THEN
    ALTER TABLE public.practitioners
      ADD CONSTRAINT practitioners_waitlist_id_fkey
      FOREIGN KEY (waitlist_id) REFERENCES public.practitioner_waitlist(id);
  END IF;

  IF to_regclass('public.practitioner_cohorts') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conname = 'practitioners_cohort_id_fkey'
         AND conrelid = 'public.practitioners'::regclass
     ) THEN
    ALTER TABLE public.practitioners
      ADD CONSTRAINT practitioners_cohort_id_fkey
      FOREIGN KEY (cohort_id) REFERENCES public.practitioner_cohorts(id);
  END IF;
END $$;

-- Tighten credential_type with a CHECK constraint matching the spec's 9 values.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'practitioners_credential_type_check'
  ) THEN
    ALTER TABLE public.practitioners
      ADD CONSTRAINT practitioners_credential_type_check
      CHECK (credential_type IS NULL OR credential_type IN (
        'md', 'do', 'nd', 'dc', 'np', 'pa', 'rd', 'lac', 'other'
      ));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS practitioners_custom_domain_uq
  ON public.practitioners(custom_domain) WHERE custom_domain IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_practitioners_status_legacy
  ON public.practitioners(account_status);
CREATE INDEX IF NOT EXISTS idx_practitioners_credential
  ON public.practitioners(credential_type);
CREATE INDEX IF NOT EXISTS idx_practitioners_cohort
  ON public.practitioners(cohort_id) WHERE cohort_id IS NOT NULL;

-- Backfill account_status from the legacy status column. The source DO block
-- ended with ALTER TABLE practitioners DROP COLUMN status; that statement is
-- DEFERRED (evidence pack section 1) and the status column stays live so
-- admin-guard.ts keeps working until its repoint ships.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'practitioners'
      AND column_name  = 'status'
  ) THEN
    UPDATE public.practitioners
       SET account_status = CASE status
         WHEN 'pending'   THEN 'pending_onboarding'
         WHEN 'active'    THEN 'active'
         WHEN 'suspended' THEN 'suspended'
         WHEN 'revoked'   THEN 'terminated'
         ELSE 'pending_onboarding'
       END
     WHERE account_status IS NULL;
  END IF;
END $$;

-- Default + NOT NULL + CHECK on account_status now that backfill is complete.
ALTER TABLE public.practitioners
  ALTER COLUMN account_status SET DEFAULT 'pending_onboarding';

UPDATE public.practitioners
   SET account_status = 'pending_onboarding'
 WHERE account_status IS NULL;

ALTER TABLE public.practitioners
  ALTER COLUMN account_status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'practitioners_account_status_check'
  ) THEN
    ALTER TABLE public.practitioners
      ADD CONSTRAINT practitioners_account_status_check
      CHECK (account_status IN (
        'pending_onboarding', 'onboarding', 'active', 'suspended', 'terminated'
      ));
  END IF;
END $$;

-- The _160 practitioners policy recreates (practitioners_self_update,
-- practitioners_admin_all, practitioners_patient_read_public) are textually
-- identical to the _080 versions already guarded in section 3 and are not
-- re-emitted.

-- Engagement-score practitioner read, re-anchored on practitioner_patients.
-- The source pair was DROP POLICY engagement_scores_practitioner_read_with_
-- consent + CREATE POLICY of the same name, but that name is STALE live
-- (autoheal 20260420045150 merged it into engagement_score_snapshots_select_
-- merged, which stays untouched). Choice: CREATE POLICY under the NEW
-- distinct name engagement_scores_practitioner_read_via_pp_210f, guarded on
-- BOTH the old and the new name so it can never double-create either form.
-- Semantics are additive: it grants the practitioner-consent read arm through
-- the canonical practitioner_patients table alongside the live merged policy.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'engagement_score_snapshots'
      AND policyname IN ('engagement_scores_practitioner_read_with_consent', 'engagement_scores_practitioner_read_via_pp_210f')
  ) THEN
    CREATE POLICY engagement_scores_practitioner_read_via_pp_210f
      ON public.engagement_score_snapshots FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.practitioner_patients pp
          WHERE pp.patient_id = engagement_score_snapshots.user_id
            AND pp.practitioner_id = (select auth.uid())
            AND pp.status = 'active'
            AND pp.consent_share_engagement_score = true
        )
      );
  END IF;
END $$;

-- =============================================================================
-- SECTION 8 of 9: from 20260418000180_revised_p91_view_modes_and_constitutional.sql
-- =============================================================================

ALTER TABLE public.practitioners
  ADD COLUMN IF NOT EXISTS default_patient_view_mode TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS default_active_tab        TEXT NOT NULL DEFAULT 'practice';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'practitioners_default_view_mode_check'
  ) THEN
    ALTER TABLE public.practitioners
      ADD CONSTRAINT practitioners_default_view_mode_check
      CHECK (default_patient_view_mode IN ('standard', 'naturopathic'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'practitioners_default_active_tab_check'
  ) THEN
    ALTER TABLE public.practitioners
      ADD CONSTRAINT practitioners_default_active_tab_check
      CHECK (default_active_tab IN ('practice', 'naturopath'));
  END IF;
END $$;

COMMENT ON COLUMN public.practitioners.default_patient_view_mode IS
  'Default patient detail view: standard or naturopathic. Practitioner can override per-patient via patient_view_mode_override on practitioner_patients.';
COMMENT ON COLUMN public.practitioners.default_active_tab IS
  'Default tab on portal entry. Only meaningful for credential types that show the Naturopath tab (nd, dc, lac).';

ALTER TABLE public.practitioner_patients
  ADD COLUMN IF NOT EXISTS patient_view_mode_override TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'practitioner_patients_view_mode_override_check'
  ) THEN
    ALTER TABLE public.practitioner_patients
      ADD CONSTRAINT practitioner_patients_view_mode_override_check
      CHECK (patient_view_mode_override IS NULL
             OR patient_view_mode_override IN ('standard', 'naturopathic'));
  END IF;
END $$;

COMMENT ON COLUMN public.practitioner_patients.patient_view_mode_override IS
  'When NULL, the patient detail page falls back to the practitioner default. When set, this specific patient is always rendered in the chosen mode for this practitioner.';

CREATE TABLE IF NOT EXISTS public.constitutional_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  practitioner_id UUID REFERENCES public.practitioners(id),
  framework TEXT NOT NULL CHECK (framework IN ('ayurveda', 'tcm', 'homeopathic')),
  primary_dosha   TEXT CHECK (primary_dosha   IS NULL OR primary_dosha   IN ('vata', 'pitta', 'kapha')),
  secondary_dosha TEXT CHECK (secondary_dosha IS NULL OR secondary_dosha IN ('vata', 'pitta', 'kapha')),
  vata_score  INTEGER,
  pitta_score INTEGER,
  kapha_score INTEGER,
  questionnaire_responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  practitioner_notes TEXT,
  recommendations TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.constitutional_assessments IS
  'Patient constitutional assessment results. Naturopathic patient view reads this to surface the constitutional type prominently. Ayurveda fully functional Q1; TCM and Homeopathic placeholders.';

CREATE INDEX IF NOT EXISTS idx_constitutional_patient
  ON public.constitutional_assessments(patient_user_id);
CREATE INDEX IF NOT EXISTS idx_constitutional_practitioner
  ON public.constitutional_assessments(practitioner_id) WHERE practitioner_id IS NOT NULL;

ALTER TABLE public.constitutional_assessments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'constitutional_assessments'
      AND policyname = 'constitutional_patient_read'
  ) THEN
    CREATE POLICY constitutional_patient_read
      ON public.constitutional_assessments FOR SELECT
      TO authenticated
      USING (patient_user_id = (select auth.uid()));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'constitutional_assessments'
      AND policyname = 'constitutional_practitioner_read'
  ) THEN
    CREATE POLICY constitutional_practitioner_read
      ON public.constitutional_assessments FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.practitioner_patients pp
          WHERE pp.patient_id = constitutional_assessments.patient_user_id
            AND pp.practitioner_id = (select auth.uid())
            AND pp.status = 'active'
            AND pp.consent_share_caq = true
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'constitutional_assessments'
      AND policyname = 'constitutional_practitioner_write'
  ) THEN
    CREATE POLICY constitutional_practitioner_write
      ON public.constitutional_assessments FOR INSERT
      TO authenticated
      WITH CHECK (
        practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = (select auth.uid()))
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'constitutional_assessments'
      AND policyname = 'constitutional_practitioner_update'
  ) THEN
    CREATE POLICY constitutional_practitioner_update
      ON public.constitutional_assessments FOR UPDATE
      TO authenticated
      USING (
        practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = (select auth.uid()))
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'constitutional_assessments'
      AND policyname = 'constitutional_admin_all'
  ) THEN
    CREATE POLICY constitutional_admin_all
      ON public.constitutional_assessments FOR ALL
      TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'));
  END IF;
END $$;

ALTER TABLE public.supplement_protocols
  ADD COLUMN IF NOT EXISTS protocol_type             TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS constitutional_framework  TEXT,
  ADD COLUMN IF NOT EXISTS lifestyle_interventions   JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS energetic_notes           TEXT,
  ADD COLUMN IF NOT EXISTS botanical_components      JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'supplement_protocols_protocol_type_check'
  ) THEN
    ALTER TABLE public.supplement_protocols
      ADD CONSTRAINT supplement_protocols_protocol_type_check
      CHECK (protocol_type IN ('standard', 'natural_protocol', 'functional_medicine'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'supplement_protocols_constitutional_framework_check'
  ) THEN
    ALTER TABLE public.supplement_protocols
      ADD CONSTRAINT supplement_protocols_constitutional_framework_check
      CHECK (constitutional_framework IS NULL
             OR constitutional_framework IN ('ayurveda', 'tcm', 'homeopathic', 'none'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_supplement_protocols_type
  ON public.supplement_protocols(protocol_type)
  WHERE protocol_type <> 'standard';

COMMENT ON COLUMN public.supplement_protocols.protocol_type IS
  'standard (default), natural_protocol (built in /naturopath/natural-protocols), or functional_medicine. Naturopathic patient view renders natural_protocol with its botanical_components and lifestyle_interventions broken out distinctly.';

-- =============================================================================
-- SECTION 9 of 9: from 20260418000480_white_label_dispensary_settings.sql
-- =============================================================================
-- ONLY the practitioners.dispensary_slug slice rides here (P1-S verified
-- column; the white label route selects, filters, and updates it). The rest
-- of _480 belongs to the white label tranche (Task F5); its own
-- ADD COLUMN IF NOT EXISTS no-ops against this one when F5 applies.

ALTER TABLE public.practitioners
  ADD COLUMN IF NOT EXISTS dispensary_slug TEXT UNIQUE;

COMMENT ON COLUMN public.practitioners.dispensary_slug IS
  'URL-safe identifier for /dispensary/[slug]. Generated from practice_name with falback to first segment of practitioner.id when practice_name collides. Null until first published dispensary item.';

CREATE INDEX IF NOT EXISTS idx_practitioners_dispensary_slug
  ON public.practitioners(dispensary_slug)
  WHERE dispensary_slug IS NOT NULL;
