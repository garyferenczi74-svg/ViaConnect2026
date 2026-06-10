-- Prompt 185a slice 8: compliance copy revision per Hannah's review (2026-06-10).
--
-- Softens four rationale_short lines flagged as borderline structure/function
-- (sleep-quality / sleep-supporting / disturbing-sleep phrasing) to routine and
-- preference framing, ahead of the Kelsey + Marshall FDA / Health Canada
-- sign-off. compliance_reviewed stays false until that sign-off clears the rows.
-- Append only, idempotent (keyed by match_key). No emojis. No em or en dashes.

UPDATE public.supplement_timing_rules
  SET rationale_short = 'B vitamins can feel energizing, so morning timing fits daytime energy and an easy evening.', updated_at = now()
  WHERE match_key = 'b_complex';

UPDATE public.supplement_timing_rules
  SET rationale_short = 'A gentle, well absorbed form many people prefer in the evening as part of a calming routine.', updated_at = now()
  WHERE match_key = 'magnesium_glycinate';

UPDATE public.supplement_timing_rules
  SET rationale_short = 'Often taken in the evening as part of an evening routine; morning is fine for daytime use.', updated_at = now()
  WHERE match_key = 'ashwagandha';

UPDATE public.supplement_timing_rules
  SET rationale_short = 'Many people take it in the evening as part of a wind down routine.', updated_at = now()
  WHERE match_key = 'glycine';
