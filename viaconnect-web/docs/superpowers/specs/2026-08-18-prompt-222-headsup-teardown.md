# Prompt 222: Heads Up Health competitive teardown (internal strategy)

**Classification:** INTERNAL STRATEGY. Consumer surfaces get nothing from this material unless a future Gary-approved, Lex-reviewed derivation is commissioned.

**Retrieval timestamp:** 2026-08-18 (public HTTP fetch). Firecrawl MCP was rate-limited; public robots.txt allowed all (`Disallow` empty). No login, no paywall circumvention.

**Goal:** Store a cited competitive teardown of https://headsuphealth.com so ViaConnect can close practitioner-data gaps and press consumer/genetics/commerce advantages.

## 1. Storage and retrieval

1. Append-only migration adds `competitor_app` to `kb_items.payload_type`.
2. New collection slug `competitor_platforms` (13th collection). Owning agent `hounddog`. Co-owners `sherlock`, `jeffery`. Gate profile `standard`. Cadence `weekly`. Seeding phase `2`.
3. All teardown `kb_items` MUST set `consumer_safe = false` and `practitioner_depth = false` so authenticated RLS and default `kb_search(p_consumer_only=true)` hide them.
4. Agent/internal retrieval uses `kb_search` with `p_consumer_only=false` (or `kbSearch(..., { consumerOnly: false })`).
5. Provenance jsonb MUST include `classification: "internal_strategy"`, `source_class: "public_http"`, `retrieval_timestamp`, and source URLs. Marketing prose is summarized in our words. Short verbatim quotes only as label, claim, or review data.
6. Evidence grade E (competitive awareness). UNKNOWN never fabricated. Unverifiable claims marked claimed-not-verified.
7. Lex is not required for this internal store. Do not expose on consumer or practitioner UI.

## 2. Report document

Create `docs/superpowers/reports/2026-08-18-prompt-222-headsup-teardown.md` and a US Letter DOCX sibling.

Required sections in order:

1. Classification banner and crawl method / budget actuals
2. Executive summary (one page: verdict, three biggest adopts, three biggest advantages to press, P0 list)
3. Company and positioning
4. Complete offering map
5. Feature inventory matrix (depth ratings: marketing / documented / deeply documented)
6. Integration inventory (named, categorized)
7. Pricing and packaging teardown
8. Design and UX audit
9. Voice of customer (theme counts + short quotes)
10. Head-to-head three lists (adopt/adapt, do better, missing) with ViaConnect landing plans
11. Threat assessment
12. Prioritized P0/P1/P2 recommendations mapped to existing prompts, packaged needs_human
13. Appendices: crawl coverage, Jeffery review, remaining work

Copy rules: no em dash, no en dash, no unicode bullets in DOCX (use numbering config). ASCII hyphen-minus only.

## 3. Verified public facts (do not invent beyond these)

Use these facts. If a later crawl updates them, supersede the KB row. Do not add capabilities not listed here unless you re-fetch the cited URL in the same task and record the timestamp.

### Company and positioning

- Brand: Heads Up / Heads Up Health LLC. Legal seller on stores: phase2body, Inc., 4400 N Scottsdale Rd Ste 9445, Scottsdale, AZ 85251.
- Positioning: practitioner-first "AI-Powered Clinical Intelligence" for concierge, longevity, functional, and integrative practices. Unifies labs, wearables, devices, and EHRs. Halo is the named clinical copilot.
- Funding claim on homepage: "Backed By $20M+ In Funding" (claimed, not independently verified).
- Help center branded "Heads Up | Nicoya" at https://explore.headsup.health/llms.txt
- Related public app listing: Nicoya Health (Apple). Relationship claimed-not-verified beyond co-listing.

Sources: https://headsuphealth.com/ https://headsuphealth.com/product/ https://headsuphealth.com/about/ https://explore.headsup.health/llms.txt

### Verticals

Public vertical pages: functional medicine, longevity, concierge medicine. Additional use-case mentions: RPM, sports/high performance, clinical research, integrative/precision medicine.

Sources: https://headsuphealth.com/functional-medicine-platform/ https://headsuphealth.com/longevity-platform/ https://headsuphealth.com/concierge-medicine-platform/

### Offering and tiers (pricing page effective July 1, 2026)

- Professional: $250/month, 40 clients included, $6/client after, $1,000 onboarding (up to 5 hours CS). Branding. Professional AI Community Agents.
- Premier: $1,000/month, 100 clients included, $10/client after, $3,500 onboarding (up to 15 hours). Advanced branding. Premier AI Community Agents. Add-on Premier bundle for Professional: $14/client/month (claimed on FAQ).
- Enterprise: custom, from $7,000 onboarding. White-label, SSO, APIs and webhooks, Mobile SDK ($2,500 setup), managed white-label mobile app ($5,000 setup + $10,000/month), custom integrations, premium support.
- Month to month. No long-term contract claimed.
- AI tokens extra (pass-through LLM): lab/diagnostic extraction avg $0.07/page (high $0.60); community agents avg $0.03/action; custom agents avg $0.04/action.
- Professional services $200/hour.
- All tiers claim HIPAA, SOC2 Type II, GDPR, 2FA, data residency. Certifications not independently verified from public cert directories in this crawl.
- Store listings still say "$299/mth with an annual subscription" and 25-client starting scale. Treat as stale versus July 1, 2026 web pricing.

Source: https://headsuphealth.com/pricing-packages/

Play listing: https://play.google.com/store/apps/details?id=health.headsup.p
Legacy iOS IAP: Monthly $8.99, Yearly $78.99 (consumer-style IAP on 1.0 legacy listing only).

### Features (depth)

Deeply documented (help center workflows): integrations connect/sync, Elation/Cerbo/AdvancedMD setup, InBody upload vs API, Apple Health via iOS app only, documents and AI extraction with provider approval, patient Today page, labs and biomarkers, notes, secure messaging, programs, cohorts and reference ranges, AI assistant chat, AI insights, Oura Insights custom view, weekly key metric trends, iOS tabs (Insights, Chat, Progress, My Care, Profile).

Documented on marketing + help index: Halo copilot, custom AI agents, health score card, alerts, journal/symptoms, nutrition (AI food analysis), medications and supplements, assessments, file storage, white-label branding, Partner API, iframe widgets, Swift HealthKit SDK, program management (Coming Soon on pricing matrix).

Marketing mention only: "30,000 organizations" one-click records (longevity/functional pages); 1upHealth named in help as the health-system connector; Athena EHR named on longevity FAQ as integrable (claimed; dedicated setup doc not fetched); BioStrap and Healthie Coming Soon.

Sources: https://explore.headsup.health/llms.txt https://explore.headsup.health/docs/platform/documentation/web/integrations.md https://headsuphealth.com/product/ https://explore.headsup.health/docs/developers/api-documentation/README.md

### Integrations (enumerate)

Wearables/apps (documented): Apple Health, Health Connect (Android), Oura, Fitbit, Garmin, WHOOP, Withings, Dexcom (org enable), Cronometer (org enable), InBody (upload or API+webhook), Strava (marketing page; help integrations.md did not list a setup block in the fetched doc).

Labs/pharmacies named on marketing integrations page (PDF import, not live API unless stated): LabCorp, Quest Diagnostics, Dutch Test, Cleveland Heart Lab, CVS Minute Clinic, Walgreens, Rite Aid, Walmart Pharmacy, Innoquest Diagnostics, Great Plains Organic Acids Test, Enzo Clinical Labs, Parkway Clinical Laboratories, BioReference Laboratories (page spelling "BioReferece"), SpectreCell Laboratories, Doctors Data, GDX, Everlywell, Duane Reade.

EHRs documented: Elation, Cerbo, AdvancedMD. Health systems via 1upHealth patient-authorized search. Athena claimed on FAQ.

Coming soon: BioStrap, Healthie.

Keto-Mojo named on app store copy. Mira fertility named in legacy iOS release notes. Cardiomood named in legacy 2024.06 notes.

### Partner API (documented)

https://api.headsup.health Swagger. OAuth client_id/secret + Clerk publishable key. Headless patient provision. Iframe widgets. Server-to-server reads via admin JWT and X-On-Behalf-Of. Rate limits "not currently enforced" (build defensively). Swift HealthKit SDK.

### Mobile apps

- iOS 2.0: https://apps.apple.com/us/app/heads-up-health/id6754039108 — 3.5/5 from 4 ratings, free, iOS 17+, 234 MB, seller phase2body, Inc. Version 2.26.0. Invite-gated complaint (1 public 1-star theme). Accessibility features not indicated.
- iOS Legacy 1.0: https://apps.apple.com/us/app/heads-up-health-1-0-legacy/id1399133678 — 4.3/5 from 20 ratings, IAP $8.99/$78.99, 18+.
- Android: https://play.google.com/store/apps/details?id=health.headsup.p — 100+ downloads, Data Safety: "Data can't be deleted", encrypted in transit, no data shared with third parties (developer declaration). Support dave@headsuphealth.com.

### Voice of customer (public, small n)

Praise themes (count of distinct public reviews supporting):
- Lab trend tracking (2): Carl Lipp 2025-07-28; Unsmoothie 2025-07-28 (legacy listing).
- Multi-device unification (2): Unsmoothie (KetoMojo, Stelo, Oura, MyFitnessPal); KelShae 2024-07-11.
- Practice appointment flow and concierge/CS (1): KelShae.

Complaint themes:
- Invite required, unexplained on public App Store (2 copies of same 2.0 review, 2026-03-16).
- Integration lag vs MyFitnessPal fasting, Apple Ultra, Renpho (1, IceBear2144 2023-01-24, said will not renew).
- Play Data Safety cannot delete data (1 listing declaration, not a star review).

G2/Capterra: Capterra listing exists but was bot-walled this crawl. No public G2 review set retrieved. Do not invent scores.

Case-study customers (marketing, not reviews): Jigsaw Health, Beacon40, Proactive Health, Nexus Medicine, Jyzen, BlueWave Medicine, RMI, Living Proof Institute, RootCauses, AndHealth, Mode+Method, Ciba Health, GladdMD.

### Design and UX (public)

- Marketing site: WordPress/Divi, dark navy AI-2.0 refresh (2025-12 assets), vertical landing pages share near-identical FAQ and feature grids. page-sitemap.xml returned a WordPress critical error at crawl time. About page is thin (no team roster). Careers board is https://careers.kula.ai/headsuphealth (roles not enumerated this crawl).
- Product: practitioner web + tablet exam-room app + client iOS/Android. Help documents Today page widgets, custom views, pinned labs, My Care tab (2.11 notes). Brand voice: clinic-efficiency, outcomes marketing, "medical super-intelligence" claim on product page.
- Polished: 2.0 visual system, public pricing calculator, deep help taxonomy.
- Dated/weak: WordPress marketing stack vs product 2.0, thin About, invite-gated public app, dual app listings (legacy vs 2.0), help branded Nicoya.

### ViaConnect landing map (use these names)

- Lab import: ViaConnect Upload Labs vs their PDF AI extraction + 1upHealth + named lab logos.
- Wearables: Prompt 201 / 201b connected sources (Apple Health, Google Health) vs their OAuth device list.
- Practitioner analytics: Prompt 99 vs their cohort/outcomes reporting.
- White-label / API: existing white_label tables vs their Partner API + iframe widgets + managed mobile app.
- RPM / wearables loop: Hannah compile + connected sources vs their alerts + RPM pages.
- AI: Hannah KB-grounded answers vs Halo/generic LLM tokens.
- Genetics: GENEX360 SNP interpretation (absent on their public site).
- Commerce / formulation: Via Cura shop + formulation engine (absent on theirs).
- Peptides: Thanos peptide education (they have a 2023 PepCalc podcast, not a product layer).
- Engagement: Helix Rewards consumer scope (they have leaderboards on marketing pages).
- Consumer-first: ViaConnect consumer app vs their invite-gated client companion.

### P0/P1/P2 (needs_human for Gary)

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

## 4. Crawl budget (219g)

Pre-crawl projection: 80 to 120 pages (sitemap + help + stores). Ceiling: FIRECRAWL_MAX_PAGES_PER_RUN=25, FIRECRAWL_MAX_CREDITS_PER_DAY=200. Projection exceeded one run ceiling; intended multi-run or HTTP fallback.

Actual: Firecrawl MCP 0 pages (free rate limit). Public HTTP successful fetches about 20 product/help/store pages plus sitemap_index, post-sitemap (historical), robots.txt, llms.txt (70+ help URLs listed, two fully fetched). page-sitemap.xml failed (WordPress error). Capterra bot wall. No account creation.

## 5. Jeffery 221a

Artifact type `completion_report` (class d / hard-block). Verdict `needs_human` while live KB apply and ACC insert are pending production, and while Firecrawl did not run. produced_by_agent must not be `jeffery` if recording an approval.

## 6. Out of scope

No package.json changes. No email templates. No consumer UI. No live Firecrawl spend without a key. No disparagement in stored summaries.
