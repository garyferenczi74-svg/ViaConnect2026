# Prompt 166 Task 1 Audit Note

Branch: feat/prompt-166-mobile-hero-top at 329227b0. Read-only audit, no code changed.

## 1. Executive summary

Root cause: the mobile dead-band above the H1 "Your Personal Wellness Journey" on `/dashboard` is produced by two compounding layers; the `MobileNavWrapper` shell ships unprefixed `p-4` (16px on all sides) around every consumer/naturopath/admin children, and the dashboard hero tagline div adds `pt-14` (56px) on top of that. There is no shared `PageHero` or `PageHeader` component anywhere in `src/components`; every Section 4 route renders its own header inline using a mix of patterns. The recommended Task 2 shape is twofold: (a) reduce the dashboard hero `pt-14` to `pt-3 md:pt-14` and shrink the H1 from `text-2xl md:text-4xl` to `text-2xl` mobile / preserved `md:text-4xl` desktop, while normalizing the same pair on `/genetics`; (b) treat `MobileNavWrapper`'s `p-4` as load-bearing for non-hero pages and leave it alone, since most Section 4 routes have no hero pattern and would lose their content gutter if `p-4` were dropped. Extracting a shared `PageHero` component is justified but should be a follow-up; for Prompt 166 the fix is local to two consumer pages.

Risk callouts:
- `MobileNavWrapper` `p-4` cannot be removed wholesale, it's the content gutter for every non-hero page (analytics, body-tracker, nutrition, helix, profile, messages, etc.). Mobile-only token changes here break dozens of routes.
- The practitioner portal renders through `PractitionerPortalShell` rather than `MobileNavWrapper`; its pages do not inherit the consumer mobile dead-band and do not need normalization.
- `MobileHeroBackground` is `position: fixed` and contributes zero flow padding; it is not part of the gap chain.

## 2. Root cause paragraph

The §5 candidates that apply, in priority order, are candidate 2 (layout shell unprefixed padding) and candidate 4 (per-page mobile override). Candidate 2: `src/components/MobileNavWrapper.tsx:17` wraps every consumer/naturopath/admin route's children in `<div className="p-4 lg:p-6">{children}</div>`, which contributes 16px of unprefixed top padding on mobile (only the lg breakpoint at 1024px upgrades it to 24px; the `md` breakpoint inherits the mobile `p-4`). Candidate 4: `src/app/(app)/(consumer)/dashboard/page.tsx:104` wraps the H1 tagline in `<div className="w-full px-4 pt-14 pb-6 text-center">`, where `pt-14` (56px) is unprefixed and hits mobile. The two layers stack to roughly 72px of dead space before the H1 renders, plus the sticky `Header` (h-16 = 64px) and the `MobileNavBar` strip (`py-2` plus pill min-h 44px) above the wrapper. Candidate 1 (shared component) does not apply because there is no shared component. Candidate 3 (safe-area inset) does not apply; the chain shows no `pt-safe` or `pt-[env(safe-area-inset-top)]` on any wrapper. Candidate 5 (h-64 + absolute centering) does not apply; `MobileHeroBackground` is `position: fixed` and the flow hero div is height-auto.

## 3. Shared component status

| Filename | Exists | Role |
|---|---|---|
| `src/components/layout/PageHero.tsx` | No | Does not exist; recommended creation deferred to a follow-up prompt |
| `src/components/layout/PageHeader.tsx` | No | Does not exist |
| `src/components/PageTitle.tsx` | No | Does not exist |
| `src/components/landing/HeroSection.tsx` | Yes | Public landing site only; Prompt 166 EXCLUDES |
| `src/components/landing/HeroVariantRenderer.tsx` | Yes | Public landing only |
| `src/components/ui/MobileHeroBackground.tsx` | Yes | Fixed-position background image only; not a hero frame |
| `src/components/ui/MobileHeroVideoBackground.tsx` | Yes | Fixed-position background video; not a hero frame |
| `src/components/dashboard/DashboardHeader.tsx` | Yes | Greeting + quick-access strip; lives BELOW the page hero; not the H1 site |
| `src/components/analytics/ExecutiveSummaryHero.tsx` | Yes | Admin exec-reporting only; not the page-level hero |

Conclusion: the authenticated app has no shared page-hero component; every Section 4 route owns its own header markup.

## 4. Per-route inventory

For brevity, all class lists are reproduced verbatim from the source files. Routes are grouped by Section 4 bucket.

### Personal Wellness tab

| Route | File path : line | H1 class list verbatim | Wrapper class list verbatim | md:/lg: classes to preserve | Mobile classes to normalize |
|---|---|---|---|---|---|
| Dashboard | `src/app/(app)/(consumer)/dashboard/page.tsx:104,105` | `text-2xl font-semibold tracking-tight text-white md:text-4xl` | `w-full px-4 pt-14 pb-6 text-center` | `md:text-4xl` (font) | `pt-14`, `text-center` (per §3, mobile is left-aligned) |
| Analytics | `src/app/(app)/(consumer)/analytics/page.tsx:697` | `text-2xl font-bold text-white flex items-center gap-2` | `p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto` (on `PageTransition` at line 694) | `lg:p-8` | `p-6` is not the defect since it predates `MobileNavWrapper`'s `p-4`; out of scope unless §3 mobile-left-align requires it |
| Hannah AI (wellness/advisor) | `src/app/(app)/(consumer)/wellness/advisor/page.tsx:51-65` | none at page level; H1 lives inside `AdvisorChat.tsx:129` as `text-base md:text-lg font-semibold text-white truncate` | `flex items-center gap-3 px-4 md:px-6 py-4 border-b border-white/[0.08]` (AdvisorChat:121) | `md:px-6`, `md:text-lg` | None; the chat shell already top-anchors the H1 |
| Nutrition | `src/app/(app)/(consumer)/nutrition/page.tsx:89` | `text-xl font-bold text-white sm:text-2xl` | `mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 md:py-8` (line 87) | `md:px-6 md:py-8`, `sm:text-2xl` | `py-6` contributes 24px top, mild; no `pt-14` issue here |
| Body Tracker (parent layout) | `src/app/(app)/(consumer)/body-tracker/layout.tsx:240,244` | none in layout | sticky tabs `sticky top-[124px] z-30 md:top-[60px]`; content wrapper `mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8` | `md:top-[60px]`, `md:px-6 md:py-8` | `py-6`; no unprefixed `pt-` over 12px |
| Body Tracker dashboard | `src/app/(app)/(consumer)/body-tracker/page.tsx` | No H1 at page-top; renders tile grid | n/a | n/a | n/a |
| Body Tracker Composition / Muscle / Weight / Photos / Connections / Metabolic / Milestones / Journey | various under `/body-tracker/*` | each has its own section H1 but no hero frame | uses layout's tabs+content wrapper | inherited from layout | none |
| Helix Rewards (consumer) parent | `src/app/(app)/(consumer)/helix/layout.tsx:364-381` | `font-extrabold tracking-[-1.5px]` with inline `style={{ fontSize: 'clamp(36px, 5vw, 62px)' }}` | outer `relative z-10 px-4 lg:px-8 py-8` (line 355) + inner `max-w-6xl mx-auto flex flex-col gap-8` | `lg:px-8` | `py-8` is the defect-class top-padding; `clamp(36px, 5vw, 62px)` font already responsive |
| Helix child routes | `/helix/arena|challenges|earn|redeem|refer|research/page.tsx` | none; render through the parent layout | n/a | n/a | n/a |
| Genetics | `src/app/(app)/(consumer)/genetics/page.tsx:144,146` | `text-2xl font-semibold tracking-tight text-white md:text-4xl` | `w-full px-4 pt-14 pb-8 text-center` | `md:text-4xl` | `pt-14`, `text-center` |
| Genetics upload | `src/app/(app)/(consumer)/genetics/upload/page.tsx` | not audited; not in §1 defect scope | | | |
| Genetics panel detail | `src/app/(app)/(consumer)/genetics/[panelId]/page.tsx` | not audited; not in §1 defect scope | | | |
| CAQ entry / landings | `src/app/(app)/(consumer)/profile/assessment/page.tsx` | uses `PageTransition` + inline grid; no shared hero pattern | n/a | n/a | n/a |

### Practitioner tab

| Route | File path : line | H1 class list verbatim | Wrapper class list verbatim | md:/lg: to preserve | Mobile defect classes |
|---|---|---|---|---|---|
| Practitioner Dashboard | `src/app/(app)/practitioner/dashboard/page.tsx:71` | `text-heading-2 text-[#B75E18]` | `min-h-screen bg-dark-bg p-4 md:p-8` (line 67) + `max-w-7xl mx-auto space-y-6` (68) | `md:p-8` | `p-4` is content gutter, not hero gap; renders through `PractitionerPortalShell` so it does NOT inherit `MobileNavWrapper`'s `p-4` |
| Practitioner Patients list | `src/app/(app)/practitioner/patients/page.tsx` | renders inside `PageTransition`; not a page-hero H1 | n/a | n/a | n/a |
| Practitioner Patient detail header | `src/app/(app)/practitioner/patients/[id]/page.tsx` | not audited; not in §1 defect scope | | | |
| Practitioner Analytics (engagement aggregate) | `src/app/(app)/practitioner/analytics/engagement/page.tsx` | not audited | | | |

### Naturopath tab

| Route | File path : line | H1 class list verbatim | Wrapper class list verbatim | md:/lg: to preserve | Mobile defect classes |
|---|---|---|---|---|---|
| Naturopath Dashboard | `src/app/(app)/naturopath/dashboard/page.tsx:74-79` | `text-heading-2` with inline `style={{ color: '#C4944A' }}` | `min-h-screen px-4 md:px-6 lg:px-8 py-6 md:py-10` (line 68) inline gradient | `md:px-6 lg:px-8 md:py-10` | `py-6` mild; no `pt-14` issue. Renders through `MobileNavWrapper` so inherits `p-4` on top |
| Naturopath Protocol authoring landing | `src/app/(app)/naturopath/protocols/page.tsx` | renders through `PageTransition`; no hero block | n/a | n/a | n/a |
| Naturopath Client list | `src/app/(app)/naturopath/patients/page.tsx` | not audited; not in §1 defect scope | | | |

### Admin tab

| Route | File path : line | H1 class list verbatim | Wrapper class list verbatim | md:/lg: to preserve | Mobile defect classes |
|---|---|---|---|---|---|
| Admin Dashboard | `src/app/(app)/admin/page.tsx:123` | `text-2xl font-bold text-white` | `p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto` on `PageTransition` (line 119) | `sm:p-6 lg:p-8` | `p-4` is content gutter, not hero defect |
| Admin User management | not a single page; multiple admin routes; out of audit scope unless §1 defect surfaces | | | | |
| Admin MAP Pricing Enforcement console | `src/app/(app)/admin/map/page.tsx:58` | `text-xl sm:text-2xl font-semibold mt-2 flex items-center gap-2` | `max-w-6xl mx-auto p-4 sm:p-6 space-y-5` (line 53) | `sm:p-6 sm:text-2xl` | `p-4` content gutter |
| Admin LEX litigation case management | `src/app/(app)/admin/legal/page.tsx:59` | inside `<header className="mb-6">` (line 60); H1 itself rendered subsequently; no page hero block | `min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10` (line 59) | `md:px-8 md:py-10` | `py-6` mild |
| Admin Kelsey regulatory compliance | `src/app/(app)/admin/compliance/layout.tsx:514` | `text-2xl sm:text-3xl font-semibold tracking-tight` | `mx-auto max-w-7xl px-4 sm:px-6 md:px-8 py-6` (line 512) + `header mb-6` (513) | `sm:px-6 md:px-8 sm:text-3xl` | `py-6` mild |

### Home / Hot

| Route | File path : line | Notes |
|---|---|---|
| `/` (home) | `src/app/page.tsx` | Public landing; explicitly EXCLUDED per §1 |
| Authenticated Home | none distinct from `/dashboard` | The Personal Wellness Dashboard IS the authenticated home; same defect as Dashboard row above |

### Settings and account

| Route | File path : line | H1 / wrapper notes | Mobile defect |
|---|---|---|---|
| Account (parent layout) | `src/app/(app)/(consumer)/account/layout.tsx:99-108` | H1 `text-2xl sm:text-3xl font-bold tracking-tight`; wrapper `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6`; `mb-6` after H1 | None; `py-6` mild |
| Account / Orders, Notifications, Profile, Addresses, Prescriptions | render through parent layout | inherit layout's `py-6` | none |
| Settings shared-access | `src/app/(app)/(consumer)/settings/shared-access/page.tsx` | not audited deeply; no hero pattern | none expected |
| Profile (legacy) | `src/app/(app)/(consumer)/profile/page.tsx` | uses `PageTransition`; no shared hero | none |

### Modal-style standalone routes

| Route | Notes |
|---|---|
| Onboarding interstitials | `src/app/(auth)/onboarding/[step]/page.tsx`; live in `(auth)` group, NOT under `(app)`, so do NOT render through `MobileNavWrapper`; out of scope |
| CAQ phase landings | `src/app/(app)/(consumer)/profile/assessment/page.tsx` only; no shared hero pattern; out of scope |

## 5. Layout shell audit

| Layout file | Immediate parent classes around `{children}` | Unprefixed `pt-*` flagged? |
|---|---|---|
| `src/app/layout.tsx` | `body className="font-sans antialiased bg-dark-bg text-foreground"` | No |
| `src/app/(app)/layout.tsx` | Delegates to `PortalShellRouter` (server component does not wrap in padding) | No |
| `src/components/practitioner/PortalShellRouter.tsx` | Routes either to `PractitionerPortalShell` (no `MobileNavWrapper`) or to `AppShell` + `MobileNavWrapper` | No direct padding |
| `src/components/app-shell.tsx:85` | `<main className="flex-1 overflow-y-auto overflow-x-hidden">{children}</main>` | No padding |
| `src/components/MobileNavWrapper.tsx:17` | `<div className="p-4 lg:p-6">{children}</div>` | **YES**: unprefixed `p-4` (16px top on mobile, retained until lg:1024px upgrades to `p-6`). This is load-bearing for the secondary scrollable tab strip immediately above it (`sticky top-16 z-30 bg-[#1A2744] md:relative md:top-auto md:z-auto md:bg-transparent` on the wrapper's first child) and for content gutter on routes that have no hero of their own |
| `src/components/practitioner/PractitionerPortalShell.tsx:165` | `<div className="flex-1 overflow-auto">{children}</div>` | No padding |
| `src/app/(app)/(consumer)/account/layout.tsx:100` | `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6` | `py-6` mild, no `pt-(8-32)` hit |
| `src/app/(app)/(consumer)/body-tracker/layout.tsx:244` | `mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8` | `py-6` mild |
| `src/app/(app)/(consumer)/helix/layout.tsx:355` | `relative z-10 px-4 lg:px-8 py-8` | `py-8` is on the immediate hero wrapper; soft-flag |
| `src/app/(app)/(consumer)/plugins/layout.tsx:478` | `max-w-3xl mx-auto px-4 lg:px-6 py-6` | `py-6` mild |
| `src/app/(app)/admin/compliance/layout.tsx:512` | `mx-auto max-w-7xl px-4 sm:px-6 md:px-8 py-6` | `py-6` mild |
| `src/app/(app)/admin/international/layout.tsx:610` | `mx-auto max-w-7xl px-4 sm:px-6 md:px-8 py-6` | `py-6` mild |
| `src/app/(app)/admin/notifications/layout.tsx:660` | `mx-auto max-w-7xl px-4 sm:px-6 md:px-8 py-6` | `py-6` mild |
| `src/app/(app)/practitioner/notifications/layout.tsx:847` | `mx-auto max-w-5xl px-4 sm:px-6 md:px-8 py-6` | `py-6` mild |
| `src/app/(auth)/layout.tsx` | not audited; auth group is unauthenticated | N/A |

Conclusion: `MobileNavWrapper:17` is the ONLY layout-shell-level unprefixed top-padding that affects every Section 4 consumer/naturopath/admin route. Its 16px top padding is load-bearing for the secondary nav strip spacing on mobile and CANNOT be removed wholesale.

## 6. Per-page override sweep results

Unprefixed `pt-(8|10|12|14|16|20|24|32)` and `mt-(8|10|12|14|16|20|24)` on hero / header / page-title containers across `src/app/(app)`:

Hero-frame hits (in scope for Prompt 166):
- `src/app/(app)/(consumer)/dashboard/page.tsx:104` -- `pt-14` on hero tagline div
- `src/app/(app)/(consumer)/genetics/page.tsx:144` -- `pt-14` on hero tagline div
- `src/app/(app)/(consumer)/wearables/page.tsx:202` -- `pt-8` on content container that wraps the H1 header (line 205)
- `src/app/(app)/(consumer)/plugins/page.tsx:142` -- `pt-8 md:pt-12` on content wrapper (gap above first content card; mild but visible)
- `src/app/(app)/(consumer)/helix/layout.tsx:355` -- `py-8` (8 top, 8 bottom) on the hero wrapper

False positives (mid-page or footer; OUT of scope):
- `src/app/(app)/(consumer)/helix/layout.tsx:213` -- `pt-10` on footer divider
- `src/app/(app)/(consumer)/shop/stacks/page.tsx:115` -- `mt-12` on footer disclaimer
- `src/app/(app)/(consumer)/body-tracker/connections/page.tsx:147,173` -- `scroll-mt-24` anchor offset
- `src/app/(app)/(consumer)/shop/product/[slug]/full/page.tsx:158,172,207,219,231` -- `mt-12 ... md:mt-16` on mid-page section anchors
- `src/app/(app)/admin/legal/customs/page.tsx:172`, `src/app/(app)/admin/legal/cases/[caseId]/enforce/page.tsx:260` -- `mt-8` on mid-page sections
- `src/app/(app)/practitioner/white-label/enroll/enroll-client.tsx:121,179` -- `mt-8` on mid-page sections

## 7. Recommended Task 2 shape

Because no shared `PageHero` component exists and the §1 defect surfaces only on two consumer routes (dashboard, genetics) with a near-identical pattern, the smallest correct fix is in-place normalization of those two pages. A shared component extraction is justified as a separate prompt; doing it inside Prompt 166 risks scope creep across 200+ Section 4 routes.

### Option A (RECOMMENDED): in-place mobile normalization, two files only

**File 1**: `src/app/(app)/(consumer)/dashboard/page.tsx`

Line 104, change:
```
<div className="w-full px-4 pt-14 pb-6 text-center">
```
to:
```
<div className="w-full px-4 pt-3 pb-6 text-left md:pt-14 md:text-center">
```

Line 105, change:
```
<h1 className="text-2xl font-semibold tracking-tight text-white md:text-4xl">
```
Leave unchanged. The H1 already satisfies §3's "mobile font size text-2xl" because the unprefixed class is already `text-2xl`. The `md:text-4xl` desktop branch is preserved.

Line 108, change `<p className="mt-2 text-sm text-white/90 md:text-base">` only if §3 mobile-left-align requires the subhead to also left-align; the subhead currently inherits the parent's `text-center` which is overridden by the new `text-left` mobile-only. If the desired result is that the subhead also left-aligns on mobile and centers on desktop, no per-element change is needed; the parent's `text-left md:text-center` cascades.

**File 2**: `src/app/(app)/(consumer)/genetics/page.tsx`

Line 144, change:
```
<div className="w-full px-4 pt-14 pb-8 text-center">
```
to:
```
<div className="w-full px-4 pt-3 pb-8 text-left md:pt-14 md:text-center">
```

Line 146, the H1 already has `text-2xl ... md:text-4xl`; preserve.
Line 145 has `<div className="mx-auto mb-3 h-0.5 w-10 rounded-full bg-[#2DA5A0]" />` (the decorative teal underline); on mobile-left-align this should become `mx-0 md:mx-auto`, otherwise the underline floats centered above a left-aligned title.

No other Section 4 routes need changes for Prompt 166. The defect is local to dashboard + genetics.

### Option B: extract a shared `PageHero` component

Deferred. If pursued in a follow-up prompt, the signature would be:

```
// src/components/layout/PageHero.tsx
interface PageHeroProps {
  title: string;
  subtitle?: string;
  mobileAlign?: 'left' | 'center';  // defaults to 'left'
  desktopAlign?: 'left' | 'center'; // defaults to 'center'
  accentRule?: boolean;             // teal underline like genetics
}
```

with mobile classes `w-full px-4 pt-3 pb-6` (or `pb-8` if accentRule) and `md:pt-14 md:text-center` desktop branch. Then dashboard + genetics call sites would shrink to one JSX element each. Extraction is justified by DRY, but is not blocking for Prompt 166.

## 8. Open questions for the controller

1. Does Task 2 want the subhead `<p>` element to also left-align on mobile, or stay centered? §3 says "H1 left-aligned on mobile" but is silent on the subhead. Default assumption: subhead follows H1 alignment via parent `text-left md:text-center` cascade.
2. Does Task 2 want to normalize `/genetics` at the same time as `/dashboard`? §4 lists "Genetics / SNP results" under Personal Wellness tab and `/genetics` has the identical `pt-14` defect, so the answer is almost certainly yes; confirming here so it's not a scope-creep surprise.
3. The helix layout has `py-8` on the hero wrapper (consumer Helix Rewards landing). The mobile H1 uses inline `style={{ fontSize: 'clamp(36px, 5vw, 62px)' }}` rather than `text-2xl/3xl`; it does not match the dashboard pattern. Should Task 2 leave `/helix` untouched (its pattern is its own), or normalize it too? Default assumption: leave untouched, since the visual treatment is intentionally custom for the Helix Rewards landing and §1's "approximately 110px to 140px" measurement was specifically taken on `/dashboard`.
4. The wearables page (`/wearables`, line 202) has `pt-8` and an `<h1 className="text-heading-1">`; this is one of the consumer routes reachable from the MobileNavBar but not explicitly named in §4. Out of scope for Task 2 unless explicitly added.
5. The `MobileNavWrapper` `p-4` is the layout shell's contribution. Task 2 should NOT touch it; doing so would shift every non-hero page's content gutter. Confirming this is the controller's expectation.
