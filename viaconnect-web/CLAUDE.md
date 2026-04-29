# ViaConnect GeneX360, Claude Code Directives

## Project
- **Company:** FarmCeutica Wellness LLC
- **Product:** ViaConnect GeneX360
- **Stack:** Next.js 14+ / React / Tailwind CSS / Framer Motion / Vercel / Supabase
- **Supabase Project:** ViaConnect2026 (ID: nnhkcufyqjojdbvdrpky, us-east-2)
- **GitHub:** ViaConnect2026 under garyferenczi74-svg
- **Design System:** Deep Navy #1A2744, Teal #2DA5A0, Orange #B75E18, Instrument Sans typography, glassmorphism cards

---

## PERMANENT PROTECTIONS

### 1. Supabase Email Templates: DO NOT TOUCH
- DO NOT modify `supabase/config.toml` (email section)
- DO NOT modify `supabase/templates/*.html`
- DO NOT modify any auth.email configuration
- DO NOT modify any SMTP or email provider settings
- DO NOT create any migration that alters auth.config or auth.email
- **Status:** Working perfectly. Confirmation, password reset, and magic link emails all function correctly.
- **Only Gary can lift this restriction by directly asking.**

### 2. package.json: DO NOT TOUCH
- DO NOT add, remove, upgrade, or change ANY dependency or script
- DO NOT modify package-lock.json
- DO NOT run: npm install, npm update, npm audit fix, npm dedupe, or any command that modifies node_modules
- **If a new package is genuinely needed:** STOP, tell Gary what package and why, wait for explicit approval.
- **Only Gary can lift this restriction by directly asking.**

### 3. Existing Supabase Migrations: DO NOT TOUCH
- DO NOT rename, edit, delete, or reorder existing migration files
- New migrations are OK (append-only): CREATE tables, ADD columns, CREATE indexes
- New migrations must not conflict with or undo existing migrations
- **Only Gary can lift this restriction by directly asking.**

### 4. External Repository Governance (Prompts #129 / #129a): TIER D PROHIBITED
Direct copy or append of external repos, skills packs, agent cards, `.cursorrules`, `AGENTS.md`, `CLAUDE.md`, gists, or plugin install hooks into any ViaConnect-adjacent path is PROHIBITED (Tier D). Use Tier A (reference only), B (clone outside `viaconnect-web/`), or C (Michelangelo OBRA re-derivation with Sherlock provenance per `docs/provenance/`; license filter MIT/Apache-2.0/BSD-3/ISC permitted, GPL/AGPL requires Gary plus Steve Rica sign-off). Nine sub-agents (Jeffery, Michelangelo, Sherlock, Hannah, Arnold, LEX, Gordon, Hounddog agent, Marshall) bound by Prompt #129 §6 and #129a §§5.1-5.4. Hounddog disambiguation: "Hounddog (agent)" is the `.claude/agents/hounddog.md` reviewer; "Hounddog Admin Dashboard" is the Prompts #100-102 product. Full policy: `docs/prompts/prompt-129-external-repo-governance-policy.md`, `docs/prompts/prompt-129a-nine-agent-binding-addendum.md`. **Only Gary can lift this restriction by directly asking.**

### 5. Supply-chain security scanner
Socket.dev scans every PR per Prompt #133. Tier 1 findings (§4.1) hard-block merge; Tier 2 require explicit Gary override. Sherlock §4.9 evaluations include Socket.dev output for any externally-evaluated package. Do not disable Socket.dev without an amendment superseding Prompt #133. Full policy: `docs/prompts/prompt-133-socket-dev-integration.md`.

---

## Resilience patterns (apply to all new code)

All new external API calls (Supabase, Claude, HeyGen, regulatory, GitHub, payment, notification, currency) and server-side data fetches must use:

- `withTimeout` / `withAbortTimeout` from `src/lib/utils/with-timeout.ts`
- `safeLog` from `src/lib/utils/safe-log.ts`
- `getCircuitBreaker` from `src/lib/utils/circuit-breaker.ts` for external APIs

Edge Functions import Deno mirrors from `supabase/functions/_shared/`.

Reference: `docs/prompts/prompt-140*.md` (trilogy), `docs/postmortems/` (incidents).

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
Reports to Jeffery. Always-on, 24/7. Enforces OBRA on all code (Observe/Brainstorm, Blueprint, Review, Audit/TDD). Quality gates: 80% line coverage, 100% critical path, zero TS errors, zero `any`. Veto power on Gate R / Gate A failures. Agent: `.claude/agents/michelangelo.md`. Hooks: `.claude/agents/michelangelo-hooks.md`. Gate scripts: `scripts/agents/michelangelo-*.ts`. Spec: `docs/agents/michelangelo-spec.md`.

---

## Scripts

### Photo sync
Pipeline that keeps `products.image_url` in sync with the `Products` bucket (capital P; #110 corrected the name from `supplement-photos`). Full walkthrough at `docs/runbooks/photo-sync.md` covers broad sync (`npm run photos:audit / sync / report`) and the SNP targeted flow per Prompt #110 (scope-locked to Methylation/GeneX360 plus Testing & Diagnostics; Class A/B/C/D classification; Class C asset generation manifest; Playwright coverage at 5 viewports).
