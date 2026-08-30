-- Prompt 231 follow-up: Lex clearance of scan consent 231-scan-v1.
-- Lex signed 2026-08-30. Replaces shared-care-record language.
-- No auto-grant of practitioner view on the scan clickwrap.
-- R5 share control is separate (PhotoShareGrantModal already cleared).
-- Gating query in scanConsentGate.ts serves only lex_status = cleared.
--
-- Append-only follow-up to 20260829130000_prompt_231_scan_consent.sql.
-- Works whether or not the pending seed row already exists, as long as
-- table scan_consent_versions exists. Does not edit the original seed.

INSERT INTO public.scan_consent_versions (version, body_markdown, lex_status, effective_at)
VALUES (
  '231-scan-v1',
  $c1$FormaVision guides you through four photos (front, right, back, left) so ViaConnect can track your body composition over time.

This is educational tracking, not a diagnosis and not medical advice. ViaConnect is not your doctor.

Your scan photos are stored privately in your account. If you have a linked practitioner and you share body photos with them, they can view your scan photos the same way they can view your other body-tracker photos.

You can retake or discard any photo before you finish, and you can delete a scan afterward.

By continuing, you agree to take these photos and store them in your ViaConnect account for educational body tracking.$c1$,
  'cleared',
  now()
)
ON CONFLICT (version) DO UPDATE SET
  body_markdown = EXCLUDED.body_markdown,
  lex_status = 'cleared',
  effective_at = now();
