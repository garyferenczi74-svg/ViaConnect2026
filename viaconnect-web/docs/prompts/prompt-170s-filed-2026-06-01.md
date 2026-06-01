# Prompt 170s: Photo Library Historical Import (FILED)

**Filed:** 2026-06-01 (launch +0)
**Status:** FILED. NOT YET RATIFIED. NOT YET AUTHORIZED FOR BUILD.
**Spec source:** Gary paste 2026-06-01 with `ultrathink` directive
**Architectural review memorial:** `project_prompt_170s_filed.md` (17 concerns + 8 ratification asks + sequencing recommendation)

Per `[[feedback_no_unsolicited_changes]]` no spec drafting beyond memorialization until Gary ratifies the 8 asks.

## Strategic summary

One-time bulk import of historical food photos from device library, with EXIF capture dates preserved as `meals.captured_at`. 5-stage pipeline: permission → pre-classify (Anthropic Vision lightweight food-vs-non-food filter) → deduplicate (pHash + temporal + location) → batch vision analysis → review-and-confirm. Headline value: new user goes from 0 meals to 60 historical meals spanning 90 days in a single 5-10min session.

Strategic value: unlocks 170h insights, 170q planning, Bio Optimization Score baselines immediately for new users instead of after weeks of fresh logging. Also generates exceptionally high-value 170g corpus rows (user-confirmed labels + EXIF-verified dates).

## Privacy is load-bearing

Most privacy-conscious feature in the 170-series. Photos NEVER persistently stored. Non-food photos NEVER sent to full vision analysis (pre-classifier gates). Fresh permission grant per session (no persistent library access). Permission revocation stops library access immediately. 7 kill switches. Detailed safety mode posture for bulk historical review of ED-flagged users.

## Seventeen architectural concerns flagged

Full detail in memorial. Largest concerns:

1. **Capacitor photo library plugin selection** — NEW package.json dep (first post-launch); 3 candidates; security review + iOS/Android limited-mode + EXIF round-trip testing
2. **"Photos are not stored" framing imprecision** — photos ARE transmitted to Anthropic Vision API; ViaConnect doesn't store but Anthropic standard retention is 30 days unless ZDR
3. **Pre-classifier 1,000-photo curated test set is Gordon long-pole** not sized in spec (~150-200hr estimate)
4. **Cost model $35k-100k annual at scale** ($0.35-0.50 per import × adoption × 100k-200k users)
5. **EXIF date reliability for transferred/edited photos** (~15-25% fallback rate likely; user manual date entry adds 3-5min friction)
6. **iOS/Android version fragmentation** — Android 13+ Photo Picker vs. older READ_MEDIA_IMAGES; plugin choice
7. **Consent funnel 8-9 steps** with compound 22% completion projection (below 15% review trigger)
8. **Dedup pHash threshold (10/64)** needs empirical tuning
9. **Background processing Edge Function timeout** vs. Vercel Pro 300s vs. dedicated worker
10. **170c is HARD prerequisite** (non-negotiable for ED safety mode; no fallback option)
11. **Onboarding timing post-CAQ Phase 1 too early** — safety mode unknowable; move to post-FULL-CAQ
12. **Practitioner redaction vs. clinical transparency trade-off** (spec chose privacy)
13. **30-day draft persistence orphan analysis cost** (60-photo abandoned session = $18 sunk cost)
14. **Helix 10pt event** is highest in platform (lifetime cap so acceptable)
15. **Onboarding-stickiness claim** needs A/B validation at Phase E
16. **Anthropic ZDR enrollment** worth pursuing for cleaner privacy posture across ALL Vision API usage
17. **Pre-classifier edge cases**: food prep, packaging without food visible, partial-food frames, multi-meal photos need explicit Gordon decisions

## Eight ratification asks for Gary

(Full detail in memorial.)

1. **170c ratification calendar** (HARD blocker; non-negotiable per spec)
2. **Capacitor plugin selection mechanism**: Blueprint formal evaluation vs. pre-approve vs. custom-build
3. **Onboarding integration timing**: post-CAQ Phase 1 vs. post-full-CAQ vs. Settings-only
4. **User-facing privacy copy framing**: spec verbatim vs. Kelsey-revised precise vs. defer
5. **Background processing infrastructure**: Vercel Pro 300s vs. sharded Edge Functions vs. dedicated worker
6. **30-day draft persistence**: spec verbatim vs. tighten to 7 days vs. day-7 notification
7. **Phase split**: single phase vs. Phase 1 + supplement-2 vs. defer phase decision to Blueprint
8. **Anthropic ZDR enrollment**: pursue for all Vision API usage vs. don't pursue vs. defer

## Sequencing recommendation

| Option | Phasing | Trade-off |
|---|---|---|
| A | Single Q4 2026 phase per spec | High ship-risk: plugin + Gordon test set + 170c dep + cost validation all on critical path |
| **B** | Phase split: Foundation (5-step consent + plugin + pre-classify + basic dedup + 30-day range + review) Q4 2026 + Extended (180+ day range + location dedup + ED safety opt-in + 170r inline) Q1-Q2 2027 | Reduces single-phase risk; aligns with 170p / 170r precedents |
| C | Defer to Q1-Q2 2027 single phase | Lowest ship-risk; misses winter-holiday cohort opt-in |

## Standing rules

Per spec §22: append-only migrations, ONE new package.json dep (Capacitor photo plugin; explicit Gary approval at Blueprint), no Supabase email touches, Lucide React strokeWidth 1.5, no emojis, Bio Optimization verbatim, Helix Rewards consumer-only, bioavailability "10x to 28x" verbatim, no Semaglutide / Retatrutide injectable only / Tesofensine pending FDA, desktop-mobile simultaneous EXCEPT 170s is mobile-only v1 (web shows redirect message), no em/en dashes, brand tokens (Navy + Card + Teal + Orange), direct push to main no PR, Gordon canonical spelling, photos not persistently stored (non-negotiable), non-food photos never sent for full vision analysis (non-negotiable), permission does not persist across sessions, safety mode opt-in for bulk historical review requires additional friction.

## Related

- `project_prompt_170s_filed.md` (architectural review memorial; primary working doc)
- `project_prompt_170c_filed.md` (HARD blocker non-negotiable)
- `project_prompt_170g_filed.md` (170s provides high-value corpus)
- `project_prompt_170h_filed.md` (170s enables immediate insights)
- `project_prompt_170r_filed.md` (170r inline surfaces compose during review)
- `project_capacitor_setup.md` (Capacitor 6.x approved; photo library plugin extends)
- `project_prompt_170p_phase_split.md` (phase split precedent)
- `feedback_permanent_protections.md` (package.json lock; needs explicit Capacitor photo plugin exception)
- `feedback_jeffery_pre_launch_review.md` (Phase E gate)
- `feedback_no_unsolicited_changes.md` (no draft/build until Gary ratifies)
