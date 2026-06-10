-- Prompt 185a slice 8 closeout: record the compliance sign-off (Gary, 2026-06-10).
--
-- compliance_reviewed lives on supplement_timing_rules in Supabase (it is not a
-- Vercel setting), so the sign-off must be recorded here. Gary cleared the
-- softened, disclaimer-backed rule rationale copy after the live production
-- review, so all rule rows move to reviewed. Append only, idempotent.
-- No emojis. No em or en dashes.

UPDATE public.supplement_timing_rules
  SET compliance_reviewed = true, updated_at = now()
  WHERE compliance_reviewed = false;
