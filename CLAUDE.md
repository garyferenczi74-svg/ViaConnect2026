# ViaConnect GeneX360 — React Native + Expo

## Identity
Precision health app by FarmCeutica Wellness LLC (Buffalo, NY).
Three portals: Consumer (Personal Wellness), Practitioner, Naturopath.
Tagline: One Genome. One Formulation. One Life at a Time.

## Stack
- Framework: React Native 0.76+ via Expo SDK 52
- Router: Expo Router v4 (file-based, App Router pattern)
- Language: TypeScript strict mode
- Styling: NativeWind v4 (Tailwind for React Native)
- State: Zustand + React Query (TanStack)
- Backend: Supabase (Auth, PostgreSQL, Edge Functions, Storage)
- AI: Claude (clinical reasoning), Grok (real-time research), GPT-4o (extraction)
- Payments: Stripe + RevenueCat (in-app subscriptions for stores)
- Push: Expo Notifications + Supabase triggers
- Build: EAS Build (cloud CI for iOS + Android binaries)
- OTA: EAS Update for JS-layer hotfixes

## Brand Tokens
Deep Teal #224852 | Burnt Copper #B75F19 | Sage #76866F
Plum #6D597A | Rose #9D5858 | Practitioner Green #4ADE80
Dark BG #111827 | Typography: Inter (UI), JetBrains Mono (data)

## Key Products
27 supplements (MTHFR+, COMT+, FOCUS+, BLAST+, SHRED+, NAD+, etc.)
GENEX360 6-panel genetic test: GENEX-M $288.88 to Complete $988.88
PeptideIQ + CannabisIQ first-mover gene panels
Memberships: Gold $8.88/mo, Platinum $28.88/mo, Practitioner $128.88/mo
ViaTokens gamification: earn tokens for adherence, redeem for discounts

## Architecture Docs (read on demand, not pre-loaded)
- docs/architecture/FULL_CONTEXT.md (V2.2 tech spec)
- docs/design-refs/ (portal design references)
- docs/functions/ (API function bodies)
- docs/formulations/ (56-SKU product catalog JSON)

## Rules
1. NEVER store PHI on device. All health data via Supabase server queries.
2. All AI calls route through Supabase Edge Functions (server-side keys).
3. Every DB mutation writes to audit_logs via trigger.
4. Bioavailability figure is 10–27x (not 5–27x).
5. Semaglutide excluded from peptide strategy. Retatrutide + tirzepatide only.
