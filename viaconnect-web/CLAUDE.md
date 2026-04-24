# ViaConnect GeneX360 — Claude Code Directives

## Project
- **Company:** FarmCeutica Wellness LLC
- **Product:** ViaConnect GeneX360
- **Stack:** Next.js 14+ / React / Tailwind CSS / Framer Motion / Vercel / Supabase
- **Supabase Project:** ViaConnect2026 (ID: nnhkcufyqjojdbvdrpky, us-east-2)
- **GitHub:** ViaConnect2026 under garyferenczi74-svg
- **Design System:** Deep Navy #1A2744, Teal #2DA5A0, Orange #B75E18, Instrument Sans typography, glassmorphism cards

---

## PERMANENT PROTECTIONS

### 1. Supabase Email Templates — DO NOT TOUCH
- DO NOT modify `supabase/config.toml` (email section)
- DO NOT modify `supabase/templates/*.html`
- DO NOT modify any auth.email configuration
- DO NOT modify any SMTP or email provider settings
- DO NOT create any migration that alters auth.config or auth.email
- **Status:** Working perfectly. Confirmation, password reset, and magic link emails all function correctly.
- **Only Gary can lift this restriction by directly asking.**

### 2. package.json — DO NOT TOUCH
- DO NOT add, remove, upgrade, or change ANY dependency or script
- DO NOT modify package-lock.json
- DO NOT run: npm install, npm update, npm audit fix, npm dedupe, or any command that modifies node_modules
- **If a new package is genuinely needed:** STOP, tell Gary what package and why, wait for explicit approval.
- **Only Gary can lift this restriction by directly asking.**

### 3. Existing Supabase Migrations — DO NOT TOUCH
- DO NOT rename, edit, delete, or reorder existing migration files
- New migrations are OK (append-only) — CREATE tables, ADD columns, CREATE indexes
- New migrations must not conflict with or undo existing migrations
- **Only Gary can lift this restriction by directly asking.**

### 4. External Repository Governance (Prompts #129 + #129a) — TIER D PROHIBITED
- Classify every external repo, skills pack, `.cursorrules`, `AGENTS.md`, `CLAUDE.md`, gist, or plugin install hook into exactly one tier before acting:
  - **Tier A** = reference only (read in browser, no fetch into repo)
  - **Tier B** = clone to isolated env outside `viaconnect-web/` (no references from inside the repo)
  - **Tier C** = pattern re-derived via OBRA by Michelangelo, with Sherlock research artifact + provenance citation header per `docs/provenance/`
  - **Tier D** = direct copy, append, or concatenation into repo files, **PROHIBITED no exceptions**
- DO NOT run `curl <external> >> CLAUDE.md`, `cat <external> >> .cursorrules`, or any shell append of external content into a repo file (this is Tier D)
- DO NOT execute plugin install hooks that mutate `CLAUDE.md`, `.cursorrules`, `AGENTS.md`, `.claude/**`, `next.config.*`, `tsconfig.json`, or `.env*`
- DO NOT paste external skills packs, agent cards, or upstream configs verbatim into any ViaConnect-adjacent path
- Tier C gates: provenance header at top of every produced file (TS/SQL/YAML templates in `docs/provenance/`), license filter (MIT / Apache-2.0 / BSD-3-Clause / ISC permitted; GPL / AGPL requires Gary + Steve Rica sign-off), Audit-phase verbatim-match scan (any contiguous 10+ token match with the cited source, excluding language keywords and non-copyrightable API signatures, fails Audit and requires re-derivation)
- The nine sub-agents (Jeffery, Michelangelo, Sherlock, Hannah, Arnold, LEX™, Gordon, Hounddog agent, Marshall) are bound by Prompt #129 §6 as amended by Prompt #129a §§5.1–5.4; each agent's Governance section cites its specific §6.X subsection
- "Hounddog" disambiguation: "Hounddog (agent)" = the `.claude/agents/hounddog.md` reviewer; "Hounddog Admin Dashboard" = the content intelligence product from Prompts #100–102. Full qualifiers required in cross-prompt references, commits, and governance artifacts
- Full policy: `docs/prompts/prompt-129-external-repo-governance-policy.md`; nine-agent binding: `docs/prompts/prompt-129a-nine-agent-binding-addendum.md`
- **Only Gary can lift this restriction by directly asking.**

---

## DESKTOP + MOBILE SYNCHRONISM (Standing Rule)

Every component, page, and feature must be developed for BOTH desktop AND mobile simultaneously. No desktop-first then patch-mobile-later.

### Required Responsive Patterns
| Element | Mobile (< 640px) | Tablet (640-1024px) | Desktop (> 1024px) |
|---------|-------------------|---------------------|---------------------|
| Grid layouts | grid-cols-1 | sm:grid-cols-2 | md:grid-cols-3+ |
| Padding | p-4 | sm:p-6 | md:p-8 |
| Text sizes | text-sm / text-base | sm:text-base | md:text-lg |
| Headings | text-xl | sm:text-2xl | md:text-3xl |
| Buttons | w-full | sm:w-auto | Same |
| Form inputs | w-full text-base | Same | Same |
| Side-by-side fields | Stacked (flex-col) | sm:flex-row | Same |
| Touch targets | min-h-[44px] | Same | Can be smaller |

### Global Mobile Requirements
- **Touch targets:** Every button, link, interactive element minimum 44x44px on mobile
- **Font size:** All inputs use `text-base` (16px) to prevent iOS Safari auto-zoom
- **No horizontal overflow:** Use `overflow-x-auto` on scrollable containers, not on page body
- **Safe area:** Account for iPhone notch/home indicator with `pb-safe`

### Quality Gate (Every Future Prompt)
- [ ] Every grid uses responsive classes (grid-cols-1 sm:grid-cols-2 md:grid-cols-3)
- [ ] Every form field is w-full on mobile
- [ ] Every button has min-h-[44px] touch target
- [ ] All inputs use text-base (16px minimum)
- [ ] No horizontal overflow on mobile
- [ ] Side-by-side fields stack on mobile (flex-col sm:flex-row)
- [ ] Tested at 375px AND 1440px viewports
- [ ] Supabase email templates NOT touched
- [ ] package.json NOT touched
- [ ] Existing migrations NOT modified
- [ ] No external repo content copied/appended into any file (Standing Rule #4 / Tier D check; re-derivations carry provenance header per `docs/provenance/`)

---

## Agents

### Michelangelo (Senior Developer Sub-Agent, OBRA Framework)
- Reports to: Jeffery
- Always-on, parallel execution, 24/7
- Enforces OBRA protocol on ALL code: Observe/Brainstorm, Blueprint, Review, Audit/TDD
- Quality gates: 80% line coverage, 100% critical path coverage, zero TS errors, zero `any`
- Veto power: can BLOCK any merge that fails Gate R or Gate A
- Agent definition: .claude/agents/michelangelo.md
- Integration hooks: .claude/agents/michelangelo-hooks.md
- Gate scripts: scripts/agents/michelangelo-*.ts
- Living spec: docs/agents/michelangelo-spec.md
- Config (legacy): docs/agents/michelangelo-config.json
- Source (legacy): src/lib/agents/michelangelo/

---

## Scripts

### Photo sync (Prompt #109 → corrected by #110)
Pipeline that keeps `products.image_url` in sync with the `Products` bucket (capital P; #110 corrected the name from `supplement-photos`). Full walkthrough in `docs/runbooks/photo-sync.md`.

**Broad sync:**
- **Audit:** `npm run photos:audit` (runs current-image-state, list-bucket-objects, match-products-to-files in sequence)
- **Sync:** `npm run photos:sync -- --dry-run` then `npm run photos:sync -- --apply`; rollback via `npm run photos:sync -- --rollback=<run_id>`
- **Reconcile:** `npm run photos:report` (diffs post-apply audit against the plan; exits non-zero if any HIGH row failed to flip)

**SNP targeted flow (Prompt #110, scope-locked to `Methylation / GeneX360` + `Testing & Diagnostics` per 2026-04-21 addendum):**
- `npx tsx scripts/audit/snp-bucket-reality-check.ts` classifies 20 SNP SKUs + 6 Testing & Diagnostics service cards into Classes A/B/C/D. Products query is category-filtered; out-of-scope rows never enter the plan.
- `npx tsx scripts/audit/snp-filename-mapping.ts` emits a MatchPlan-compatible plan at `snp-plan-{ts}.json` with `category` populated for the sync runner's `--category` filter.
- Remap Class B/D by running the sync once per locked category:
  - `npx tsx scripts/sync-supplement-photos.ts --plan-file=<path> --category="Methylation / GeneX360" --apply`
  - `npx tsx scripts/sync-supplement-photos.ts --plan-file=<path> --category="Testing & Diagnostics" --apply`
- `npx tsx scripts/audit/snp-generation-manifest.ts` emits `snp-asset-generation-manifest.{md,csv}` for Class C artwork (stable reference at `docs/manifests/prompt-110-asset-generation.md`).
- `npx tsx scripts/upload-snp-assets.ts --source <dir> --apply` uploads new artwork at bucket root (services flat, no subfolder) then auto-syncs.
- `npx tsx scripts/audit/snp-reconciliation.ts` produces the PR-ready status report.
- Playwright: `npx playwright test` runs `tests/e2e/snp-image-coverage.spec.ts` across 5 viewports.

Artifacts land in `/tmp/viaconnect/` (override with `PHOTO_SYNC_OUT_DIR`). Direct `npx tsx scripts/...` invocations also work and are documented in the runbook.
