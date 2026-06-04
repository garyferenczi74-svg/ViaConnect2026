# Prompt 175: CAQ Supplement Photo AI (Single Vendor, Tiered Claude, Accuracy First)

**Filed:** 2026-06-04
**Owner:** Gary
**Library number:** 175 (skips 174). This is a CAQ Phase 3 feature fix.
**Entity:** Farmceutica Wellness Ltd.

---

## Context and goal

The photo AI on CAQ Phase 3 (Medications, Supplements and Allergies, the "What You Are Currently Taking" block) is failing in production with `ANTHROPIC_API_KEY not set in .env.local`. Root cause is environment configuration, not the model. Two problems solved:

1. Make extraction robust so a missing or failing provider degrades gracefully instead of throwing a red error at the user.
2. Build a clean, tiered, single vendor extraction pipeline that is cheap by default and accurate where it matters, using Claude API only.

**Single vendor (locked).** CAQ-only and onboarding-scale (low volume). No Gemini, Grok, or any third-party model. Per-scan dollar difference is negligible; second provider adds key/SDK/failure mode/data processor; supplement, medication, allergy data must pass through as few processors as possible for a CLIA-adjacent platform.

**Model tiers (Claude API, current rates per 1M tokens):**
- Primary reader: Claude Haiku 4.5 ($1 / $5). High-volume extraction.
- Escalation: Claude Sonnet 4.6 ($3 / $15). Low confidence or failed reads.
- Optional deep escalation: Claude Opus 4.8 ($5 / $25). Behind a config flag, off by default.

**Accuracy principle.** The model proposes; canonical database and user dispose. Biggest accuracy lever is canonical matching + human confirmation, not model choice.

## Hard constraints

- No em-dashes / en-dashes in code, comments, copy, commit messages.
- Desktop + Mobile simultaneous via responsive Tailwind.
- Tokens: Navy `#1A2744`, Card `#1E3054`, Teal `#2DA5A0`, Orange `#B75E18`. Instrument Sans.
- Lucide React only, strokeWidth 1.5.
- "Bio Optimization Score" canonical. Never "Vitality Score".
- Supabase email templates: untouched. package.json: no changes without Gary approval (`@anthropic-ai/sdk` already approved per memory).
- Applied migrations append-only.
- Direct push to main.
- Server-side only for `ANTHROPIC_API_KEY`. NEVER `NEXT_PUBLIC_` prefix.
- CAQ canonical structure preserved: 7 phases, 16 dots, 10 interstitials.

## Part A: Environment + key hardening

- Extraction route reads `process.env.ANTHROPIC_API_KEY` server-side only (API route).
- Vercel project settings hold the key (Production + Preview + Development).
- User-facing error copy replaced. String `ANTHROPIC_API_KEY not set in .env.local` MUST never reach the browser.
- Server guard: if key missing at request time, log with typed error code, return structured response client maps to graceful manual fallback.

## Part B: Provider-agnostic extraction module

Server-side module, one interface so the model is a config choice not a rewrite later.

```ts
interface ExtractedSupplement {
  rawText: string;
  name: string;
  brand: string | null;
  dose: number | null;
  unit: string | null;    // mg, mcg, IU, g, ml
  form: string | null;    // capsule, tablet, softgel, powder, liquid, gummy
  confidence: number;     // 0..1
}

interface ExtractionResult {
  items: ExtractedSupplement[];
  modelTier: 'haiku' | 'sonnet' | 'opus';
  escalated: boolean;
  latencyMs: number;
}
```

Implementation: Claude tool use / JSON-only system instruction; strip code fences; try/catch JSON.parse. Server-side image validation (jpeg/png/webp, max dim + size, strip EXIF). Do NOT persist raw photo; process + discard.

## Part C: Confidence-based escalation router

1. Try Haiku 4.5.
2. Escalate to Sonnet 4.6 if ANY of: Haiku errored/timed-out, any item confidence < 0.7, Haiku returned 0 items for non-empty image.
3. Optional Opus 4.8 if config flag enabled AND Sonnet items still < 0.6. Off by default.
4. If every enabled tier fails, return empty result with typed reason; UI falls back to manual.

Thresholds in config. Router records served tier + escalation.

## Part D: Canonical database match (real accuracy layer)

- Fuzzy match name + brand against existing canonical supplement and medication reference.
- Confident match: attach canonical id, mark chip "matched, pending confirmation".
- No match / ambiguous: chip "needs confirmation", prefill existing manual search with raw text.
- NEVER write free text to CAQ phase tables. Only canonical ids (or explicit user-confirmed custom entry).
- Dose + unit presented for user verify/edit. Treat model dose/unit as suggestion.

## Part E: Human-in-the-loop confirmation UI

- Photo AI pre-fills; user confirms. Nothing commits silently.
- Render items as editable chips reusing existing chip + plus pattern. Show name, dose, unit, match status.
- User can edit dose/unit, remove item, add via existing search.
- "matched" vs "needs confirmation" visual via tokens. Lucide icons (Camera, ScanLine, Check, CircleAlert, Plus, X) at strokeWidth 1.5.
- Commit on explicit confirmation only.
- Graceful degradation: empty/failed extraction quietly reverts to manual search. Photo path is enhancement, not only path. Red error box gone. "Try again" affordance kept; copy neutral, never names internal config.

## Part F: Observability

Log one row per extraction attempt to a NEW append-only table (new migration, do not alter existing). Fields: `user_id`, `model_tier`, `escalated`, `item_count`, `matched_count`, `avg_confidence`, `latency_ms`, `outcome_code`, `created_at`. No raw label text or image bytes.

Surface to 158 analytics framework so Sherlock can watch match rate, escalation rate, latency.

## Acceptance criteria

1. Key set in Vercel + redeployed: photographing a label returns structured items pre-filling as editable chips on Desktop + Mobile.
2. Key missing or provider failing: user sees neutral messaging + manual search field. Never `.env.local`. Never a red box.
3. Low-confidence reads transparently escalate Haiku → Sonnet; served tier + escalation flag appear in observability log.
4. Extracted items matched against canonical reference. Nothing commits without confirmation.
5. No `NEXT_PUBLIC_` prefix on key. No dashes in added code/copy/commits. CAQ phase/dot/interstitial counts unchanged.
6. New logging table via new append-only migration. No existing migration edited. package.json unchanged unless approved.

## Rollback note

Tag commit before this change so a single revert restores prior CAQ Phase 3 state.
