-- Prompt 226 Wave 1: Lex clearance of disclaimer 226-v1.
-- Copy is verbatim from Prompt 226 Section 7 / Appendix A (Lex-controlled).
-- Gary Wave 1 continue authorization. G20 satisfied for Module A UI ship.

UPDATE public.converter_disclaimer_versions
SET
  lex_status = 'cleared',
  marshall_status = 'approved',
  effective_at = COALESCE(effective_at, now()),
  updated_at = now()
WHERE version = '226-v1';
