# Heads Up Health competitive teardown

**INTERNAL STRATEGY.** Consumer surfaces get nothing from this material unless a future Gary-approved, Lex-reviewed derivation is commissioned. Zero consumer UI. Evidence grade E (competitive awareness). UNKNOWN is never fabricated. Unverifiable claims are marked claimed-not-verified.

Retrieval timestamp: 2026-08-18 (public HTTP fetch).

## Classification and crawl method

Classification: INTERNAL STRATEGY. Stored rows (later seed) must use `consumer_safe = false` and `practitioner_depth = false` so default `kb_search(p_consumer_only=true)` hides them. Lex is not required for this internal store.

Crawl method: public HTTP only. Firecrawl MCP was rate-limited and returned 0 pages. Public robots.txt allowed all (`Disallow` empty). No login. No paywall circumvention. Marketing prose is summarized in our words. Short verbatim quotes appear only as label, claim, or review data.

Crawl budget actuals versus plan (Prompt 219g):

- Pre-crawl projection: 80-120 pages (sitemap + help + stores).
- Run ceiling: FIRECRAWL_MAX_PAGES_PER_RUN=25 (FIRECRAWL_MAX_CREDITS_PER_DAY=200). Projection exceeded one run ceiling.
- Actual Firecrawl MCP: 0 pages (free rate limit).
- Actual public HTTP: about 20 product, help, and store pages, plus sitemap_index, post-sitemap (historical), robots.txt, and llms.txt (70+ help URLs listed; two fully fetched).
- Failures this crawl: page-sitemap.xml (WordPress critical error); Capterra bot wall; no G2 review set retrieved.

Primary cited surfaces: https://headsuphealth.com/ https://headsuphealth.com/product/ https://headsuphealth.com/about/ https://explore.headsup.health/llms.txt https://headsuphealth.com/pricing-packages/

## Executive summary

Verdict: Heads Up is a practitioner-first clinical-intelligence SaaS that unifies labs, wearables, devices, and EHRs for concierge, longevity, functional, and integrative practices. Halo is the named clinical copilot. ViaConnect should close practitioner-data gaps they already document (wearable OAuth breadth, lab PDF extraction with provider review, cohort outcomes) and press advantages that are absent from their public site (GENEX360 SNP interpretation, Via Cura shop plus formulation engine, consumer-first app with Helix Rewards).

Three biggest adopts (adapt into existing ViaConnect landing plans):

1. Named wearable OAuth breadth (Oura, Garmin, WHOOP, Withings, Dexcom, Fitbit) onto the Prompt 201 / 201b connected-sources registry.
2. Lab PDF extraction plus a provider review queue (their Documents and AI Extraction) onto ViaConnect Upload Labs plus Hannah.
3. Practitioner cohort outcomes reporting (their cohort analysis) as a Prompt 99 deepen in the practitioner portal.

Three biggest advantages to press:

1. GENEX360 SNP interpretation. Absent on their public site.
2. Via Cura shop plus formulation engine. Absent on theirs.
3. Consumer-first ViaConnect app plus Helix Rewards (consumer scope) versus their invite-gated client companion. They market leaderboards; they do not publish a consumer rewards product comparable to Helix.

P0 for Gary (`needs_human` package):

1. Named wearable OAuth breadth on the 201 registry. Effort L. Extends Hound Dog / Arnold connected-sources.
2. Lab PDF extraction plus provider review queue. Effort L. Extends Upload Labs plus Hannah.
3. Practitioner cohort outcomes report. Effort M. Practitioner portal.

Homepage funding claim "Backed By $20M+ In Funding" is claimed-not-verified. Compliance badges (HIPAA, SOC2 Type II, GDPR) are claimed on the pricing page and were not independently verified from public cert directories in this crawl. Public review n is small. Store listings still advertise stale "$299/mth with an annual subscription" and a 25-client starting scale versus July 1, 2026 web pricing that starts Professional at $250/month with 40 clients included.

## Company and positioning

Brand: Heads Up / Heads Up Health LLC. Legal seller on stores: phase2body, Inc., 4400 N Scottsdale Rd Ste 9445, Scottsdale, AZ 85251.

Positioning: practitioner-first "AI-Powered Clinical Intelligence" for concierge, longevity, functional, and integrative practices. The product unifies labs, wearables, devices, and EHRs. Halo is the named clinical copilot.

Funding claim on the homepage: "Backed By $20M+ In Funding" (claimed, not independently verified).

Help center branded "Heads Up | Nicoya" at https://explore.headsup.health/llms.txt. Related public app listing: Nicoya Health (Apple). Relationship claimed-not-verified beyond co-listing.

Public vertical pages: functional medicine, longevity, concierge medicine.

- https://headsuphealth.com/functional-medicine-platform/
- https://headsuphealth.com/longevity-platform/
- https://headsuphealth.com/concierge-medicine-platform/

Additional use-case mentions on those surfaces: RPM, sports/high performance, clinical research, integrative/precision medicine.

About page is thin (no team roster) at https://headsuphealth.com/about/. Careers board is https://careers.kula.ai/headsuphealth (roles not enumerated this crawl).

Sources also include https://headsuphealth.com/ and https://headsuphealth.com/product/.

## Complete offering map

Practitioner web plus tablet exam-room app plus client iOS/Android companion.

SaaS tiers on https://headsuphealth.com/pricing-packages/ (effective July 1, 2026):

1. Professional: $250/month, 40 clients included, $6/client after, $1,000 onboarding (up to 5 hours CS). Branding. Professional AI Community Agents.
2. Premier: $1,000/month, 100 clients included, $10/client after, $3,500 onboarding (up to 15 hours). Advanced branding. Premier AI Community Agents. Add-on Premier bundle for Professional: $14/client/month (claimed on FAQ).
3. Enterprise: custom, from $7,000 onboarding. White-label, SSO, APIs and webhooks, Mobile SDK ($2,500 setup), managed white-label mobile app ($5,000 setup + $10,000/month), custom integrations, premium support.

Month to month. No long-term contract claimed.

AI tokens extra (pass-through LLM): lab/diagnostic extraction avg $0.07/page (high $0.60); community agents avg $0.03/action; custom agents avg $0.04/action. Professional services $200/hour.

All tiers claim HIPAA, SOC2 Type II, GDPR, 2FA, data residency. Certifications not independently verified from public cert directories in this crawl.

Store listings still say "$299/mth with an annual subscription" and 25-client starting scale. Treat as stale versus July 1, 2026 web pricing.

Mobile:

- iOS 2.0: https://apps.apple.com/us/app/heads-up-health/id6754039108
- iOS Legacy 1.0: https://apps.apple.com/us/app/heads-up-health-1-0-legacy/id1399133678 (consumer-style IAP on 1.0 legacy listing only: Monthly $8.99, Yearly $78.99)
- Android: https://play.google.com/store/apps/details?id=health.headsup.p

Partner surface: https://api.headsup.health Swagger. Iframe widgets. Swift HealthKit SDK. Documented at https://explore.headsup.health/docs/developers/api-documentation/README.md.

Program management is marked Coming Soon on the pricing matrix.

## Feature inventory matrix

Depth ratings use only the three spec grades: deeply documented, documented (marketing plus help index), marketing mention only.

Deeply documented (help center workflows):

- Integrations connect/sync
- Elation / Cerbo / AdvancedMD setup
- InBody upload vs API
- Apple Health via iOS app only
- Documents and AI extraction with provider approval
- Patient Today page
- Labs and biomarkers
- Notes
- Secure messaging
- Programs
- Cohorts and reference ranges
- AI assistant chat
- AI insights
- Oura Insights custom view
- Weekly key metric trends
- iOS tabs: Insights, Chat, Progress, My Care, Profile

Documented on marketing plus help index:

- Halo copilot
- Custom AI agents
- Health score card
- Alerts
- Journal / symptoms
- Nutrition (AI food analysis)
- Medications and supplements
- Assessments
- File storage
- White-label branding
- Partner API
- Iframe widgets
- Swift HealthKit SDK
- Program management (Coming Soon on pricing matrix)

Marketing mention only:

- "30,000 organizations" one-click records (longevity and functional pages)
- 1upHealth named in help as the health-system connector
- Athena EHR named on longevity FAQ as integrable (claimed; dedicated setup doc not fetched)
- BioStrap and Healthie Coming Soon

Sources: https://explore.headsup.health/llms.txt https://explore.headsup.health/docs/platform/documentation/web/integrations.md https://headsuphealth.com/product/ https://explore.headsup.health/docs/developers/api-documentation/README.md

## Integration inventory

Wearables/apps (documented): Apple Health, Health Connect (Android), Oura, Fitbit, Garmin, WHOOP, Withings, Dexcom (org enable), Cronometer (org enable), InBody (upload or API+webhook), Strava (marketing page; help integrations.md did not list a setup block in the fetched doc).

Labs/pharmacies named on the marketing integrations page (PDF import, not live API unless stated): LabCorp, Quest Diagnostics, Dutch Test, Cleveland Heart Lab, CVS Minute Clinic, Walgreens, Rite Aid, Walmart Pharmacy, Innoquest Diagnostics, Great Plains Organic Acids Test, Enzo Clinical Labs, Parkway Clinical Laboratories, BioReference Laboratories (page spelling "BioReferece"), SpectreCell Laboratories, Doctors Data, GDX, Everlywell, Duane Reade.

EHRs documented: Elation, Cerbo, AdvancedMD. Health systems via 1upHealth patient-authorized search. Athena claimed on FAQ.

Coming soon: BioStrap, Healthie.

Named only on store or release notes (not treated as current help-documented setup): Keto-Mojo on app store copy; Mira fertility in legacy iOS release notes; Cardiomood in legacy 2024.06 notes.

Partner API (documented at https://api.headsup.health and https://explore.headsup.health/docs/developers/api-documentation/README.md):

- Swagger at https://api.headsup.health
- OAuth client_id/secret plus Clerk publishable key
- Headless patient provision
- Iframe widgets
- Server-to-server reads via admin JWT and X-On-Behalf-Of
- Rate limits "not currently enforced" (build defensively)
- Swift HealthKit SDK

Help integrations index: https://explore.headsup.health/docs/platform/documentation/web/integrations.md

## Pricing and packaging

Source of record for this teardown: https://headsuphealth.com/pricing-packages/ effective July 1, 2026. Do not publish these competitor prices on consumer pages.

| Tier | Recurring | Included clients | Overage | Onboarding | Notes |
| --- | --- | --- | --- | --- | --- |
| Professional | $250/month | 40 | $6/client | $1,000 (up to 5 hours CS) | Branding. Professional AI Community Agents. |
| Premier | $1,000/month | 100 | $10/client | $3,500 (up to 15 hours) | Advanced branding. Premier AI Community Agents. |
| Enterprise | custom | custom | custom | from $7,000 | White-label, SSO, APIs and webhooks, premium support. |

Add-ons and extras (web pricing page / FAQ):

- Premier bundle add-on for Professional: $14/client/month (claimed on FAQ).
- Mobile SDK: $2,500 setup (Enterprise).
- Managed white-label mobile app: $5,000 setup + $10,000/month (Enterprise).
- Custom integrations (Enterprise).
- AI tokens extra (pass-through LLM): lab/diagnostic extraction avg $0.07/page (high $0.60); community agents avg $0.03/action; custom agents avg $0.04/action.
- Professional services $200/hour.
- Month to month. No long-term contract claimed.

Stale store copy: Play and related listings still say "$299/mth with an annual subscription" and a 25-client starting scale. Treat as stale versus the July 1, 2026 web table.

Legacy iOS 1.0 IAP only: Monthly $8.99, Yearly $78.99. Not treated as current practitioner SaaS packaging.

Compliance claims on all tiers: HIPAA, SOC2 Type II, GDPR, 2FA, data residency. Not independently verified this crawl.

Play listing cited: https://play.google.com/store/apps/details?id=health.headsup.p

## Design and UX audit

Marketing site: WordPress/Divi, dark navy AI-2.0 refresh (2025-12 assets). Vertical landing pages share near-identical FAQ and feature grids. page-sitemap.xml returned a WordPress critical error at crawl time. About page is thin (no team roster) at https://headsuphealth.com/about/. Careers board is https://careers.kula.ai/headsuphealth (roles not enumerated this crawl).

Product: practitioner web plus tablet exam-room app plus client iOS/Android. Help documents Today page widgets, custom views, pinned labs, My Care tab (2.11 notes). Brand voice: clinic-efficiency, outcomes marketing, "medical super-intelligence" claim on https://headsuphealth.com/product/.

Polished: 2.0 visual system, public pricing calculator on https://headsuphealth.com/pricing-packages/, deep help taxonomy at https://explore.headsup.health/llms.txt.

Dated/weak: WordPress marketing stack vs product 2.0, thin About, invite-gated public app, dual app listings (legacy vs 2.0), help branded Nicoya.

Mobile public facts:

- iOS 2.0 (https://apps.apple.com/us/app/heads-up-health/id6754039108): 3.5/5 from 4 ratings, free, iOS 17+, 234 MB, seller phase2body, Inc. Version 2.26.0. Invite-gated complaint (1 public 1-star theme). Accessibility features not indicated.
- iOS Legacy 1.0 (https://apps.apple.com/us/app/heads-up-health-1-0-legacy/id1399133678): 4.3/5 from 20 ratings, IAP $8.99/$78.99, 18+.
- Android (https://play.google.com/store/apps/details?id=health.headsup.p): 100+ downloads. Data Safety: "Data can't be deleted", encrypted in transit, no data shared with third parties (developer declaration). Support dave@headsuphealth.com.

## Voice of customer

Public, small n. G2/Capterra: Capterra listing exists but was bot-walled this crawl. No public G2 review set retrieved. Do not invent scores.

Praise themes (count of distinct public reviews supporting):

1. Lab trend tracking (2): Carl Lipp 2025-07-28; Unsmoothie 2025-07-28 (legacy listing).
2. Multi-device unification (2): Unsmoothie (KetoMojo, Stelo, Oura, MyFitnessPal); KelShae 2024-07-11.
3. Practice appointment flow and concierge/CS (1): KelShae.

Complaint themes:

1. Invite required, unexplained on public App Store (2 copies of same 2.0 review, 2026-03-16).
2. Integration lag vs MyFitnessPal fasting, Apple Ultra, Renpho (1, IceBear2144 2023-01-24, said will not renew).
3. Play Data Safety cannot delete data (1 listing declaration, not a star review) at https://play.google.com/store/apps/details?id=health.headsup.p.

Case-study customers (marketing, not reviews): Jigsaw Health, Beacon40, Proactive Health, Nexus Medicine, Jyzen, BlueWave Medicine, RMI, Living Proof Institute, RootCauses, AndHealth, Mode+Method, Ciba Health, GladdMD.

## Head to head adopt or adapt

Adopt or adapt their documented practitioner-data motions into existing ViaConnect landing plans. Do not copy marketing claims. Do not invent extra connectors.

1. Wearables. Their documented OAuth device list (Apple Health, Health Connect, Oura, Fitbit, Garmin, WHOOP, Withings, Dexcom org-enable, Cronometer org-enable, InBody upload or API+webhook; Strava on marketing only). ViaConnect landing: Prompt 201 / 201b connected sources (Apple Health, Google Health). Plan: extend the 201 registry with the named wearable OAuth breadth (P0).
2. Lab import. Their PDF AI extraction plus provider approval, plus 1upHealth as the health-system connector, plus named lab logos on the marketing integrations page (PDF import, not live API unless stated). ViaConnect landing: Upload Labs. Plan: lab PDF extraction plus provider review queue (P0).
3. Practitioner analytics. Their cohort analysis, reference ranges, and weekly key metric trends (deeply documented). ViaConnect landing: Prompt 99. Plan: practitioner cohort outcomes report (P0).
4. White-label / API. Their Partner API, iframe widgets, Swift HealthKit SDK, and Enterprise managed white-label mobile app ($5,000 setup + $10,000/month). ViaConnect landing: existing white_label tables. Plan: white-label client app packaging (P1) and Partner API / iframe embed (P2).
5. RPM / wearables loop. Their alerts plus RPM use-case pages. ViaConnect landing: Hannah compile plus connected sources. Plan: alerts on biomarker drift between visits (P1).
6. One-click records. Marketing mention of "30,000 organizations" (claimed-not-verified count) via a 1upHealth-class records network. ViaConnect landing: none shipped as a records network. Plan: evaluate a records-network connector (P1). Do not repeat the 30k figure as a ViaConnect claim.

## Head to head do better

Press ViaConnect advantages that are absent from their public site or that we already ground differently.

1. AI. Hannah KB-grounded answers versus Halo / generic pass-through LLM tokens (their AI tokens are extra: extraction avg $0.07/page, community agents avg $0.03/action, custom agents avg $0.04/action). Do not claim Halo internals beyond the public copilot name and token pass-through.
2. Genetics. GENEX360 SNP interpretation is absent on their public site.
3. Commerce / formulation. Via Cura shop plus formulation engine is absent on theirs.
4. Peptides. Thanos peptide education versus their 2023 PepCalc podcast (not a product layer).
5. Engagement. Helix Rewards remain consumer-scope. They have leaderboards on marketing pages. Do not treat their leaderboards as a rewards wallet.
6. Consumer-first. ViaConnect consumer app versus their invite-gated client companion (public 2.0 App Store complaint theme: invite required, unexplained). Dual listings (legacy 1.0 vs 2.0) and Nicoya-branded help add friction they do not resolve on the public site.

## Head to head missing

Missing on their public site (ViaConnect can press; do not invent a Heads Up product that was not fetched):

1. Genetics / SNP interpretation (GENEX360).
2. Commerce shop plus formulation engine (Via Cura).
3. Peptide product layer (Thanos education). They have a 2023 PepCalc podcast only.
4. Consumer-open companion (theirs is invite-gated on the public 2.0 listing).
5. Consumer rewards comparable to Helix Rewards.

Missing or thin on ViaConnect relative to their documented surface (close via P0-P2; facts only):

1. Named wearable OAuth breadth beyond Apple Health / Google Health (their Oura, Garmin, WHOOP, Withings, Dexcom, Fitbit list).
2. Lab PDF AI extraction with provider approval queue.
3. Practitioner cohort / outcomes report depth (Prompt 99).
4. 1upHealth-class records network. Their "30,000 organizations" figure is claimed-not-verified.
5. White-label client app packaging and Partner API / iframe embed.
6. Alerts on biomarker drift between visits.
7. Custom protocol-trained agents (they sell Custom Agents).
8. Public pricing calculator for practitioner SaaS. Effort S if built. Do not publish competitor prices.

Dedicated Athena setup documentation was not fetched. BioStrap and Healthie are Coming Soon on their side. Strava lacked a setup block in the fetched integrations.md.

## Threat assessment

Practitioner overlap is the material threat. They sell into concierge, longevity, functional, and integrative practices with a documented EHR trio (Elation, Cerbo, AdvancedMD), a named Halo copilot, wearable OAuth breadth, and lab PDF extraction. That is the same clinic workflow ViaConnect must not cede while we deepen Prompt 99, Upload Labs, and connected sources.

Consumer threat is limited on public evidence: iOS 2.0 is 3.5/5 from 4 ratings and invite-gated; Android is 100+ downloads; Play Data Safety states data cannot be deleted. Dual listings (legacy 1.0 at 4.3/5 from 20 ratings with consumer-style IAP $8.99/$78.99 versus practitioner SaaS on the web) show a product transition, not a consumer franchise.

Funding ("Backed By $20M+ In Funding") and "30,000 organizations" one-click records are claimed-not-verified. Compliance badges are claimed, not directory-verified. Review n is too small to score product-market fit. Case-study names are marketing, not reviews.

Their 2023 PepCalc podcast is not a peptide product. Genetics and formulation commerce do not appear on the public site. Those remain ViaConnect pressure points, not current Heads Up public offers.

Evidence grade E. Do not escalate this assessment without a later crawl that supersedes these facts.

## Prioritized recommendations

Packaged `needs_human` for Gary. Mapped to existing prompts. Effort letters from the spec. Do not publish competitor prices.

P0:

1. Named wearable OAuth breadth (Oura, Garmin, WHOOP, Withings, Dexcom, Fitbit) on the 201 registry. Effort L. Extends Hound Dog/Arnold connected-sources.
2. Lab PDF extraction + provider review queue (their Documents and AI Extraction). Effort L. Extends Upload Labs + Hannah.
3. Practitioner cohort outcomes report (their cohort analysis / Prompt 99 deepen). Effort M. Practitioner portal.

P1:

4. One-click records via a records network (1upHealth-class). Effort L. Claimed 30k orgs not independently counted.
5. White-label client app packaging (branding already partial). Effort L. White-label module.
6. Alerts on biomarker drift between visits. Effort M. Hannah/Arnold.

P2:

7. Partner API / iframe embed for clinics. Effort L.
8. Custom protocol-trained agents (they sell Custom Agents). Effort M. Hannah.
9. Public pricing calculator for practitioner SaaS. Effort S. Do not publish competitor prices.

## Appendix crawl coverage

Pre-crawl projection: 80-120 pages (sitemap + help + stores). Ceiling: FIRECRAWL_MAX_PAGES_PER_RUN=25, FIRECRAWL_MAX_CREDITS_PER_DAY=200. Projection exceeded one run ceiling; intended multi-run or HTTP fallback.

Actual: Firecrawl MCP 0 pages (free rate limit). Public HTTP successful fetches about 20 product/help/store pages plus sitemap_index, post-sitemap (historical), robots.txt, llms.txt (70+ help URLs listed, two fully fetched). page-sitemap.xml failed (WordPress error). Capterra bot wall. No account creation.

Cited URLs used in this report:

1. https://headsuphealth.com/
2. https://headsuphealth.com/product/
3. https://headsuphealth.com/about/
4. https://explore.headsup.health/llms.txt
5. https://headsuphealth.com/functional-medicine-platform/
6. https://headsuphealth.com/longevity-platform/
7. https://headsuphealth.com/concierge-medicine-platform/
8. https://headsuphealth.com/pricing-packages/
9. https://play.google.com/store/apps/details?id=health.headsup.p
10. https://explore.headsup.health/docs/platform/documentation/web/integrations.md
11. https://explore.headsup.health/docs/developers/api-documentation/README.md
12. https://api.headsup.health
13. https://apps.apple.com/us/app/heads-up-health/id6754039108
14. https://apps.apple.com/us/app/heads-up-health-1-0-legacy/id1399133678
15. https://careers.kula.ai/headsuphealth

## Appendix Jeffery review

Artifact type `completion_report` (class d / hard-block). Verdict `needs_human` while live KB apply and ACC insert are pending production, and while Firecrawl did not run. producedByAgent is `hounddog` (must not be `jeffery` if recording an approval).

artifactRef: `docs/superpowers/reports/2026-08-18-prompt-222-headsup-teardown.md`

Builder: `buildPrompt222JefferyInput()` in `src/lib/jeffery/reviews/prompt222Review.ts`. Checks cover citations_present (pass), consumer_isolation (pass), facts_only (pass), crawl_fallback (warn), and live_kb_apply_pending (fail). The fail forces hard-block `needs_human` via `deriveJefferyVerdict`.

ACC link copy: `docs/superpowers/reports/2026-08-18-prompt-222-jeffery-review.md`. After production apply, ACC surfaces this via `/admin/jeffery` Review Desk on `jeffery_reviews`. No live Jeffery POST in this task.

needs_human P0/P1/P2 for Gary (full package in the Jeffery review doc):

P0: (1) Named wearable OAuth breadth on the 201 registry. (2) Lab PDF extraction plus provider review queue. (3) Practitioner cohort outcomes report (Prompt 99 deepen).

P1: (4) One-click records network. (5) White-label client app packaging. (6) Alerts on biomarker drift.

P2: (7) Partner API / iframe embed. (8) Custom protocol-trained agents. (9) Public pricing calculator (do not publish competitor prices).

## Appendix remaining work

1. Live Firecrawl spend when a key is available (0 pages this crawl). Stay under FIRECRAWL_MAX_PAGES_PER_RUN=25 per run; projection 80-120 needs multi-run or continued HTTP fallback.
2. Fetch page-sitemap.xml after the WordPress critical error is gone.
3. Capterra (bot-walled) and G2 (no public review set retrieved). Do not invent scores.
4. Athena dedicated setup doc (claimed on longevity FAQ; not fetched).
5. Careers roles on https://careers.kula.ai/headsuphealth (not enumerated).
6. Independent verification of HIPAA / SOC2 Type II / GDPR claims.
7. Nicoya Health Apple-listing relationship beyond co-listing (claimed-not-verified).
8. Task 3: seed `competitor_app` KB rows (`consumer_safe = false`). Do not seed in this task.
9. Task 4: Jeffery 221a `needs_human` review row and ACC copy.
10. Task 5: US Letter DOCX sibling. Do not generate DOCX in this task.
