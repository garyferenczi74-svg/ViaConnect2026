# Body Scan v1 Clinical Validation

## Status: PENDING CLINICAL COHORT, NOT YET RUN

This is a placeholder. No clinical validation cohort has been recruited, no data has been collected, and no results exist. Per Prompt #169a section 9 and the acceptance criteria, this document is reserved for the clinical validation study and must NOT contain invented results. Any accuracy number that appears in a customer-facing surface before this study is complete is unsupported and must be removed.

## What this study will be (when run)

A comparison of the ViaConnect Phase 1 anthropometric body composition estimate against a clinical reference method (for example DEXA), across a demographically diverse cohort, to characterize bias, mean absolute error, and limits of agreement.

## Required elements (to be filled in only with real data)

- Reference method and device.
- Cohort size, recruitment, and inclusion and exclusion criteria.
- Demographic coverage: sex, age bands, ancestry, body fat range, BMI range, athletic versus sedentary.
- Capture protocol used (Tier 1, four photos, with or without credit card calibration).
- Primary metric: mean absolute error of body fat percentage versus the reference, with a 95 percent confidence interval.
- Bland-Altman limits of agreement and any systematic bias.
- Subgroup breakdowns (the model card flags skin tone and ancestry as the highest-risk subgroups for the segmentation and equation steps).
- Date of study, analyst, and sign-off by Gary.

## Until this study is complete

- No DEXA-equivalence claim may be made for ViaConnect Body Scan.
- The product remains an FDA General Wellness, Class I, low-risk wellness tracker (see the model card).
- Literature figures for the underlying Navy and CUN-BAE equations are design targets only and must not be presented as ViaConnect's validated accuracy.

## Provenance

- Spec: Prompt #169 / #169a, section 9 (validation) and the acceptance criteria.
- Implementation under validation: `src/lib/arnold/scanning/` on branch `feat/prompt-169-finish`.
- Placeholder only; replace with real study results before making any accuracy claim.
