# FarmCeutica policy decision: Lex G60 counsel countersign (Prompt 227a)

**Decision id:** `lex-g60-227a-counsel-countersign-20260822`  
**Date (UTC):** 2026-08-22  
**Owner:** Gary Ferenczi (FarmCeutica / ViaConnect)  
**Project:** `nnhkcufyqjojdbvdrpky` only  
**Related Lex stamp:** `lex-g60-227a-20260822`  
**Related verdict:** `APPROVED_WITH_CONDITIONS`

---

## Question

Does FarmCeutica policy require a licensed outside counsel countersignature of the Prompt 227a Lex G60 draft before Research Hub signal/evidence sources stamped under `lex-g60-227a-20260822` may remain live?

## Decision

**NOT REQUIRED.**

Under current FarmCeutica policy, **Gary + Lex agent sign-off is sufficient** for Prompt 227a Research Hub lanes covered by stamp `lex-g60-227a-20260822`.

This decision closes the non-blocking follow-up listed in `tmp/PROMPT-227a-COMPLETION-REPORT.md` item 5.

## Scope (in)

- Research Hub evidence lane sources already live under 227a (E-utilities / RSS).
- Research Hub signal lane sources stamped live under `lex-g60-227a-20260822` (including repaired Healthline RSS and YouTube Data API Wave 1).
- Mercola exclusion / blocked status.
- Examine degraded status (no public RSS).
- Paraphrase-only observed claims rules (no dose values, no body text, no person IDs).

## Scope (out)

- Reddit, X, TikTok, Instagram, Facebook, LinkedIn remain `pending_access` until a future Lex clearance (and any counsel review Gary elects at that time).
- MAP enforcement escalation, customs, litigation, IOLTA, or other Lex case-management work.
- Any future change that stores full commercial body text, person-resolving identifiers, or dosing values from social/media.
- Any claim that this memo is legal advice from a licensed attorney. It is an **owner policy decision** recorded for audit.

## Conditions that remain in force

1. Signal lane: headlines / topic paraphrases only; never reproduce article body.
2. Observed claims: no `stores_dose`, no `stores_body_text`, no `stores_person_id`.
3. YouTube Wave 1: official Data API only; no scraping; no channel identity fields stored.
4. Mercola: never wire.
5. Social platforms listed above: stay `pending_access` / inactive until cleared.
6. Examine: stay degraded until an official public feed or Lex-cleared alternate transport.

## Runtime effect

- **No registry demotion.** Live sources stay live.
- **No new migration required** for this policy decision alone.
- Audit pointer: this file + Lex stamp ids on `authorities_sources.lex_review_id`.

## Revisit triggers

Re-open counsel countersign (or escalate to outside counsel) if any of the following occur:

1. Gary changes FarmCeutica policy to require licensed countersign.
2. A platform listed as `pending_access` is proposed for live ingest.
3. A takedown, copyright demand, privacy complaint, or MAP legal escalation touches Research Hub signal content.
4. Storage rules above are proposed to be relaxed.

## Sign-off

| Role | Name / id | Status |
| --- | --- | --- |
| Owner | Gary Ferenczi | Decided: not required (2026-08-22) |
| Lex agent stamp | `lex-g60-227a-20260822` | APPROVED_WITH_CONDITIONS (prior) |
| Licensed counsel countersign | n/a | Waived under current policy |

---

## Drafting disclaimer

Agent-drafted by LEX for Gary's policy record. Not a court filing and not legal advice. Requires licensed counsel review before any external submission, litigation use, or regulatory filing. For this internal Prompt 227a closure only, Gary waived licensed countersign under current FarmCeutica policy.

*This document is an internal FarmCeutica / ViaConnect policy record. It is not a substitute for advice from licensed counsel.*
