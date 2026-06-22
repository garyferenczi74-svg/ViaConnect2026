-- Prompt 208a Module I: expanded safety gates + clinical governance. Append-only.
-- secondary_findings_exclusions: ACMG SF gene set that must be HARD-EXCLUDED from any
-- supplement/protocol context and routed to genetic counseling (never a protocol item).
-- rule_killswitch: per-rule instant disable with rollback.

CREATE TABLE IF NOT EXISTS public.secondary_findings_exclusions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gene text NOT NULL,
  variant text NOT NULL DEFAULT '*',
  condition_class text CHECK (condition_class IN ('hereditary_cancer','cardiac','aortic','metabolic','malignant_hyperthermia','other')),
  routing_action text NOT NULL DEFAULT 'genetic_counseling',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gene, variant)
);
ALTER TABLE public.secondary_findings_exclusions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS secondary_findings_exclusions_select ON public.secondary_findings_exclusions;
CREATE POLICY secondary_findings_exclusions_select ON public.secondary_findings_exclusions
  FOR SELECT TO authenticated USING (true);

-- Seed the published ACMG secondary-findings gene set (representative core; the human
-- clinical gate expands it). variant '*' = any variant in the gene. Idempotent.
INSERT INTO public.secondary_findings_exclusions (gene, variant, condition_class) VALUES
  ('BRCA1','*','hereditary_cancer'), ('BRCA2','*','hereditary_cancer'),
  ('TP53','*','hereditary_cancer'), ('MLH1','*','hereditary_cancer'),
  ('MSH2','*','hereditary_cancer'), ('MSH6','*','hereditary_cancer'),
  ('PMS2','*','hereditary_cancer'), ('APC','*','hereditary_cancer'),
  ('MUTYH','*','hereditary_cancer'), ('PTEN','*','hereditary_cancer'),
  ('STK11','*','hereditary_cancer'), ('CDH1','*','hereditary_cancer'),
  ('RET','*','hereditary_cancer'), ('VHL','*','hereditary_cancer'),
  ('MEN1','*','hereditary_cancer'), ('RB1','*','hereditary_cancer'),
  ('KCNQ1','*','cardiac'), ('KCNH2','*','cardiac'), ('SCN5A','*','cardiac'),
  ('MYH7','*','cardiac'), ('MYBPC3','*','cardiac'), ('TNNT2','*','cardiac'),
  ('LMNA','*','cardiac'), ('RYR2','*','cardiac'), ('PKP2','*','cardiac'),
  ('DSP','*','cardiac'),
  ('FBN1','*','aortic'), ('TGFBR1','*','aortic'), ('TGFBR2','*','aortic'),
  ('COL3A1','*','aortic'),
  ('LDLR','*','metabolic'), ('APOB','*','metabolic'), ('PCSK9','*','metabolic'),
  ('OTC','*','metabolic'),
  ('RYR1','*','malignant_hyperthermia'), ('CACNA1S','*','malignant_hyperthermia')
ON CONFLICT (gene, variant) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.rule_killswitch (
  rule_id uuid PRIMARY KEY,
  disabled boolean NOT NULL DEFAULT true,
  disabled_by text,
  reason text,
  disabled_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rule_killswitch ENABLE ROW LEVEL SECURITY;
-- No authenticated policy: reads/writes are service-role only (admin toggles, synthesis reads server-side).
