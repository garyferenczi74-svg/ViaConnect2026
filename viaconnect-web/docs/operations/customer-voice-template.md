# Customer Voice: Weekly One Page (Template)

Entity: Farmceutica Wellness Ltd. Platform: ViaConnect. Consumer brand: Via Cura.
Tagline: Built For Your Biology.

This is a FILL-IN TEMPLATE (Prompt #171 Section 7.7). The intent is ONE page per
week: copy this file, name the copy for the week (for example
customer-voice-2026-07-06.md), and fill it in. Keep it to a single page so it can
be read in a couple of minutes; it feeds the 30, 60, and 90 day reviews.

Owner of the weekly: Sherlock (analytics aggregation) with Gary as reader.
Status: TEMPLATE.

Sourcing reality (read before filling in):
- NPS: there is NO in app NPS surface built yet, and no app store review
  aggregation tool is adopted (AppFollow, Appbot, and Help Scout are Gary
  decisions, Section 15, not yet made). Until those exist, gather NPS and app
  store highlights MANUALLY from the App Store and Play Store consoles and any ad
  hoc survey. Mark the method you used.
- Support categories and feedback themes: pull from whatever support inbox is in
  use. A dedicated support tool (Help Scout) is not adopted yet; if you are using
  email or another channel, say so.
- Product usage context (to interpret the feedback) comes from the real
  formavision_ analytics events in the Supabase analytics_events table and
  /admin/analytics. Tier slugs are free, gold, platinum, platinum_family.

Week of: (fill in start date) to (fill in end date)
Prepared by: (fill in)
Method note (manual vs tool): (fill in; e.g. "NPS manual from store consoles, no
NPS surface in app yet")

## 1. NPS trend

| This week | Last week | 4 week direction |
| --- | --- | --- |
| (fill in) | (fill in) | (up / flat / down) |

Notes: (fill in: response count, how collected, anything skewing it. NPS surface
in app is not built yet, so note the manual method.)

## 2. App store highlights

Average rating this week: (fill in) Apple, (fill in) Google. Source: store
consoles (no aggregation tool adopted yet).

Notable reviews (paraphrase, do not paste personal data):

- (fill in: a positive theme and a representative paraphrase)
- (fill in: a critical theme and a representative paraphrase)

## 3. Top support categories

| Category | Count this week | Trend vs last week | Notes |
| --- | --- | --- | --- |
| (e.g. capture not completing) | | | |
| (e.g. results question) | | | |
| (e.g. billing / trial) | | | |
| (e.g. account / login) | | | |
| (e.g. privacy / data deletion) | | | |

Source: (fill in the support channel; no dedicated support tool adopted yet.)

## 4. Top feedback themes

The recurring qualitative themes this week, ranked. Tie each to a real surface or
event where possible (for example formavision_capture_abandoned spikes, formavision_quality_check_failed
reasons, paywall reaction at formavision_premium_paywall_shown).

1. (fill in)
2. (fill in)
3. (fill in)

## 5. Recommended sprint priorities

What this week's voice suggests the team should pick up next. Keep it to a few
concrete items; the funnel experiments belong in funnel-optimization-log.md.

| Priority | Rationale (tie to a theme or event) | Suggested owner |
| --- | --- | --- |
| (fill in) | | |
| (fill in) | | |
| (fill in) | | |

Gated or not yet built items to keep in mind when triaging feedback:
- Trial reminder emails (Day 2/5/6) and the auto revert cron are NOT built (gated
  per 169f). Feedback asking "why was I not reminded my trial was ending" maps to
  a known gap, not a bug.
- In app NPS prompt is not built. Requests to rate in app cannot be honored yet.
- PostHog session replay does not exist (PostHog is unwired). "Can you see what I
  did" support requests cannot be answered from replay.
