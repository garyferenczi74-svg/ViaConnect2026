# Prompt 207a: Custom Beverages (My Beverages) + Gordon-Owned Beverage Catalog Admin - Design

**Status:** Validated, ready for implementation planning.
**Owner agent:** Gordon (nutrition data and scoring). Compliance flags route to Kelsey and Marshall.
**Depends on:** Prompt 207 (hydration day-log page). 207a extends that page.
**Base spec:** Gary's filed Prompt 207a. This document adopts that spec verbatim as the source of truth and records the decisions resolved during brainstorming plus two factual corrections. Where this document and the raw 207a text differ, the differences are called out explicitly in "Resolved deltas" below.

---

## Goal

1. A new `user_beverages` table so a user can save their own PRIVATE custom beverages, plus a nullable `user_beverage_id` link column on `hydration_log_sessions`.
2. Consumer UI on the Hydration detail page: create a custom beverage and re-log it from a My Beverages shelf with one-tap immediate logging, uniform with recents.
3. Admin UI at `/admin/nutrition/beverages` (Gordon-owned) to manage the global `beverage_catalog` directly, writing through an admin-gated server action.

Custom beverages are **private only**. There is **no** user-to-global promotion pipeline. If Gordon decides a beverage belongs in the global catalog, he adds it himself via the admin page. (This is the confirmed model; it overrides the earlier brainstorming idea of auto-promoting user submissions, so there are no provenance/submission-review columns and no changes to `beverage_catalog`'s columns.)

## Standing rules (binding)

- No em-dashes (U+2014) or en-dashes (U+2013) anywhere, including comments and copy. Hyphens are fine. Grep for both before finishing.
- Lucide React icons only, strokeWidth 1.5. No emojis in code.
- Design tokens: Deep Navy #1A2744, Card #1E3054, Teal #2DA5A0, Orange #B75E18, Instrument Sans.
- Desktop and mobile developed together with responsive Tailwind. No desktop-first patching.
- Migrations are append-only. This prompt adds exactly ONE new migration file. Do not edit any existing applied migration. Do not touch Supabase email templates or package.json.
- Resilience hardening: every Supabase call in new and edited paths uses a Promise.race timeout of 3 to 5 seconds, a try/catch that fails open, and structured logging (safeLog).
- Use getDisplayName() for any client-facing agent name reference.
- Direct push to main; localhost sign-off before any live push (Gary's standing rule).

## Verified production state (build against this)

- No custom/user beverage table exists today. `user_beverages` is net-new.
- `hydration_log_sessions` has RLS with a four-policy own-row pattern keyed on `user_hash = caq_compute_user_hash(auth.uid())`. The new table mirrors this exactly.
- `beverage_catalog` has RLS with a single authenticated-read policy and NO write policy. Client writes are blocked. Do not add a public write policy. Catalog edits run through a privileged admin server path (service-role).
- Nine `hydration_source_kind` values: pure_water, coffee_tea, juice_smoothie, dairy, soda, alcohol_low, alcohol_high, sports_drink, high_water_food. `high_water_food` is a foods kind with no drinks and is NOT offered in any beverage picker.
- Nine `category` values: water, coffee, tea, juice, pop, sports_energy, milk, functional, alcohol.
- `hydration_log_sessions` already has `beverage_catalog_slug` (nullable) and `beverage_kind` (nullable). It has no custom-beverage reference; this prompt adds one.
- **Correction to the raw 207a text:** Prompt 207 did NOT introduce a "My Beverages" shelf. The BeveragePicker today has `FavoritesRow` and `RecentsRow`. 207a CREATES the My Beverages shelf (custom beverages unified with recents).
- **Reconciliation (verified in 207):** `hydration_log_sessions` is a 20%-sampled TELEMETRY table (`quick-log/route.ts`). The daily ml total and hydration score are computed from `meals` + `meal_items` (the `/api/nutrition/hydration/today` endpoint sums `meal_items.hydration_ml`). Therefore custom-beverage logging MUST go through the existing quick-log path (writes `meals` + `meal_items`) for the total/score to be correct. See Section "Logging path".

---

## Resolved deltas (decisions made during brainstorming)

1. **Logging path (reconciliation):** A custom-beverage log reuses the existing quick-log path. It writes `meals` (meal_kind `hydration_only`) + `meal_items` (with `hydration_ml` computed at write time from the resolved coefficient/kind), so the daily total and score are correct. The new `user_beverage_id` is set on the `hydration_log_sessions` telemetry row. For custom logs, the `hydration_log_sessions` row is written UNCONDITIONALLY (bypassing the 20% sampling) so provenance is always captured and Acceptance #4 is deterministic; non-custom logs keep the existing 20% sampling.
2. **Coefficient editing for consumers:** Consumers cannot set the hydration coefficient. It is derived from the chosen category (Section "Create form" mapping) and is admin-tunable only.
3. **Caffeine on the create form:** An OPTIONAL caffeine (mg) field is shown only when the chosen category is coffee, tea, or sports_energy. It defaults to 0 there when left blank and is not shown (defaults 0) for other categories.
4. **Per-user cap:** None. Unlimited active custom beverages per user.
5. **Feature flag id:** `hydration_custom_beverages`. Default OFF in production, ON in dev and staging. Separate from the Prompt 207 day-log flag. The admin page is gated by admin role only and needs no consumer flag.
6. **Compliance scope:** Custom beverages are private to one user, so there is no compliance gate on a user's custom beverage name. Compliance applies only to the admin-managed global catalog (Section "Admin page").

---

## Data model: one new migration file (additive only)

Mirrors the existing hydration RLS pattern exactly. SQL shape:

```sql
-- user_beverages: private, per-user custom beverages
create table if not exists public.user_beverages (
  id uuid primary key default gen_random_uuid(),
  user_hash text not null default caq_compute_user_hash(auth.uid()),
  display_name text not null,
  category text not null,
  hydration_source_kind text not null,
  default_volume_ml integer not null default 240,
  hydration_coefficient numeric not null default 1.00,
  caffeine_mg_per_serving integer not null default 0,
  is_alcoholic boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_beverages_category_check
    check (category = any (array['water','coffee','tea','juice','pop','sports_energy','milk','functional','alcohol'])),
  constraint user_beverages_source_kind_check
    check (hydration_source_kind = any (array['pure_water','coffee_tea','juice_smoothie','dairy','soda','alcohol_low','alcohol_high','sports_drink','high_water_food'])),
  constraint user_beverages_volume_check check (default_volume_ml > 0 and default_volume_ml <= 5000)
);

create index if not exists idx_user_beverages_user_hash_active
  on public.user_beverages (user_hash, is_active) where is_active = true;

alter table public.user_beverages enable row level security;

create policy ub_select_own on public.user_beverages for select
  using (user_hash = caq_compute_user_hash(auth.uid()));
create policy ub_insert_own on public.user_beverages for insert
  with check (user_hash = caq_compute_user_hash(auth.uid()));
create policy ub_update_own on public.user_beverages for update
  using (user_hash = caq_compute_user_hash(auth.uid()))
  with check (user_hash = caq_compute_user_hash(auth.uid()));
create policy ub_delete_own on public.user_beverages for delete
  using (user_hash = caq_compute_user_hash(auth.uid()));

-- link a logged drink to a custom beverage (nullable, additive)
alter table public.hydration_log_sessions
  add column if not exists user_beverage_id uuid null
  references public.user_beverages(id) on delete set null;

create index if not exists idx_hls_user_beverage_id
  on public.hydration_log_sessions (user_beverage_id) where user_beverage_id is not null;
```

Constraints for the agent:
- Custom-beverage creation and re-logging both run client-side as the authenticated user, so the `user_hash` default resolves and the insert policies pass. Do NOT insert custom beverages from a service-role context, or the hash default will not resolve to the user.
- Do not alter the `log_surface` CHECK constraint. Custom-beverage logs still use `log_surface = 'hydration_detail_view'`, with `beverage_catalog_slug` null and `user_beverage_id` set.
- This migration does NOT touch `beverage_catalog` (no provenance columns; private-only model).

## Scoring integration (Gordon)

At the quick-log WRITE path, resolve the drink's coefficient and source kind in this order, then compute and store `hydration_ml` on the `meal_items` row:
1. If `user_beverage_id` is set, read `hydration_coefficient` and `hydration_source_kind` from `user_beverages`. Compute `hydration_ml = volume_ml * hydration_coefficient` (the custom beverage's stored, admin-tunable coefficient is authoritative).
2. Else if `beverage_catalog_slug` is set, resolve from `beverage_catalog` (preserve existing behavior).
3. Else fall back to `beverage_kind` and a default coefficient of 1.00 (preserve existing behavior).

Gordon remains the single source of truth for hydration computation. Do not rewrite the scoring engine; extend the resolution order only. The daily total (sum of `meal_items.hydration_ml`) and the Nutrition contribution stay correct for custom beverages because the value is computed and stored here at write time.

## Consumer UX (behind the `hydration_custom_beverages` flag)

- **Create form:** From the Hydration page Add Drink picker, a "Create my own" affordance opens a small form. Required: display name, category (the nine categories; `high_water_food` not offered), default volume (ml). Optional caffeine (mg) field only for coffee/tea/sports_energy. Nothing else is asked.
- **Derive on create (do not ask):** set `hydration_source_kind`, a starting `hydration_coefficient`, and `is_alcoholic` from the chosen category:

  | category | hydration_source_kind | starting coefficient | is_alcoholic |
  |---|---|---|---|
  | water | pure_water | 1.00 | false |
  | coffee | coffee_tea | 1.00 | false |
  | tea | coffee_tea | 1.00 | false |
  | juice | juice_smoothie | 1.20 | false |
  | pop | soda | 1.00 | false |
  | sports_energy | sports_drink | 1.00 | false |
  | milk | dairy | 1.30 | false |
  | functional | juice_smoothie | 1.20 | false |
  | alcohol | alcohol_low | 1.00 | true |

- **My Beverages shelf:** 207a creates a pinned My Beverages section on the Hydration page that unifies the user's custom beverages with recently-used catalog drinks into one shelf. Custom entries carry a small marker (Lucide icon, strokeWidth 1.5) so the user can tell them apart from catalog drinks.
- **Immediate log on re-tap (uniform with recents):** tapping any My Beverages entry (custom or recent) logs it immediately at its default or last-used volume via the quick-log path, with a toast showing the logged amount, an inline editable volume, and an Undo. Custom beverages behave identically to recents. A first-time custom beverage uses the create form, then becomes a one-tap entry.
- **Manage:** the user can rename, change default volume, or archive (soft delete via `is_active = false`) their own custom beverages. Archiving keeps historical logs intact (the link column is ON DELETE SET NULL and archiving does not delete the row).
- **No per-user cap.**

## Admin page: `/admin/nutrition/beverages` (Gordon-owned)

- New route behind the existing admin route guard. Not visible to consumers, practitioners, or naturopaths. No consumer flag.
- Writes are privileged: all create/update/toggle actions run through an admin-gated server action that verifies admin role and uses the service-role client. Do not add a public write RLS policy to `beverage_catalog`. Reads can use the existing authenticated read policy.
- List view: all catalog beverages (active and inactive), searchable by name, filterable by the nine categories, sortable by `sort_order`.
- Editor fields (the full `beverage_catalog` row): display_name, slug, category, hydration_source_kind, default_volume_ml, hydration_coefficient, caffeine_mg_per_serving, kcal_per_serving, sugar_g, sodium_mg, potassium_mg, magnesium_mg, is_alcoholic, abv, evidence_source, requires_claim_review, is_active, sort_order.
- Slug rule: set on create, immutable afterward (historical `hydration_log_sessions` rows reference it). Lock the slug field once the row exists.
- Soft delete only: disabling sets `is_active = false`. Never hard delete a catalog row.
- Validation: category and hydration_source_kind from the nine-value enums; default_volume_ml positive; hydration_coefficient within a sane range (for example 0.50 to 1.60). Reject out-of-range input with a clear message.
- Compliance: when `requires_claim_review` is set or `evidence_source` is edited on an entry that implies a health claim, surface a non-blocking compliance note routing to Kelsey and Marshall. Gordon owns the nutrition data; compliance owns claim review. Hannah is not an owner of this page.

## Feature flags

- Consumer custom beverages behind `hydration_custom_beverages`. Default OFF in production, ON in dev and staging. Flip in production after a validation pass. Keep separate from the Prompt 207 day-log flag.
- The admin page is gated by admin role only.

## Do not touch

- Any existing applied migration (this prompt adds exactly one new migration file).
- The `log_surface` CHECK constraint or the existing `hydration_log_sessions` policies.
- No public write policy on `beverage_catalog`. Admin writes are privileged server-side only.
- The hydration scoring engine beyond extending the resolution order above.
- Supabase email templates and package.json.

## Acceptance criteria

1. The migration applies cleanly: creates `user_beverages` with RLS enabled and the four own-row policies, and adds the nullable `user_beverage_id` column plus index to `hydration_log_sessions`. No change to `beverage_catalog`.
2. A user can create a custom beverage with name, category, and default volume; source kind, coefficient, and is_alcoholic are derived per the mapping; optional caffeine is captured for coffee/tea/sports_energy.
3. Custom beverages appear in the My Beverages shelf alongside recents, with a marker, and re-tapping logs immediately with an Undo, identically to recents.
4. A custom-beverage log writes a `meals` + `meal_items` pair (hydration_ml computed from the resolved coefficient) AND one `hydration_log_sessions` row with `log_surface = 'hydration_detail_view'`, `beverage_catalog_slug` null, and `user_beverage_id` set (written unconditionally for custom logs).
5. The daily ml total and hydration score are correct for custom beverages, using the resolution order (verified via the `/today` meal_items sum).
6. RLS proven: a user cannot read, update, or delete another user's custom beverages.
7. `/admin/nutrition/beverages` lists and edits the catalog; writes succeed only through the admin-gated server action; slug is immutable after creation; disable is a soft delete.
8. No public write policy was added to `beverage_catalog`.
9. Consumer custom beverages sit behind the `hydration_custom_beverages` flag, default OFF in production.
10. No em-dashes or en-dashes, no emojis, Lucide strokeWidth 1.5; every touched Supabase call has a timeout, fail-open, and structured logging.

## Testing and rollout

- Unit/contract tests: the create-form category->(kind, coefficient, is_alcoholic) mapping; quick-log resolution order (custom vs catalog vs fallback) and hydration_ml computation; My Beverages shelf rendering + one-tap re-log + Undo; admin server action authorization (admin-only), slug immutability, soft delete, validation ranges; RLS isolation (a user cannot access another user's rows).
- Source-as-text/component tests per repo convention (node-only vitest).
- The migration touches the live DB and needs Gary's explicit approval before it is applied (append-only rule).
- Localhost sign-off before any live push.

## Open items carried to the plan

- Exact insertion point and visual design of the My Beverages shelf on the Hydration page (the picker has FavoritesRow/RecentsRow today; the shelf may extend or sit beside them).
- The precise admin-gated server action pattern (match the existing admin route guard and any existing admin server-action convention in `/admin/*`).
