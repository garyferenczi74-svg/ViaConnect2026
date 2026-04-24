# Prompt #129 — External Repository Governance Policy

**Project:** ViaConnect™ GeneX360™ Precision Wellness Platform
**Company:** FarmCeutica Wellness LLC
**Owner:** Gary Ferenczi, CEO and Founder
**Classification:** Permanent Standing Rule / Governance Policy
**Supersedes:** N/A (new policy)
**Depends on:** Standing Rules #1 (Supabase email templates), #2 (package.json no-touch), #3 (append-only applied migrations)
**Status:** Active, binding on Jeffery, Michelangelo, Sherlock, Hannah, Arnold, LEX, and all future sub-agents
**Bundle ID affected:** com.farmceutica.viaconnect
**Date:** 2026-04-23

---

## 1. Executive Summary

External GitHub repositories, however popular, educational, or well-maintained, represent an uncontrolled provenance surface that can silently compromise ViaConnect's audit trail, supply-chain integrity, and production security posture. This policy establishes a fourth permanent standing rule, a four-tier external-code handling framework (Tier A through Tier D), and concrete OBRA integration points that require Michelangelo, Jeffery, and Sherlock to enforce provenance discipline at the agent level rather than relying on manual developer vigilance.

The core principle is simple: **external repository content is reference material, never source material.** Patterns, ideas, and approaches may be extracted from external repositories through a controlled review pipeline. Files, configurations, dependencies, and agent-instruction documents may never be copied directly into the ViaConnect codebase.

---

## 2. Context and Rationale

### 2.1 Why this policy is necessary now

ViaConnect has reached a stage where the following conditions are all simultaneously true:

- Production Supabase project (nnhkcufyqjojdbvdrpky, us-east-2) holds patient-adjacent health data (CAQ responses, genetic panel results, protocol recommendations, peptide delivery records).
- Vercel deployment tokens with write access to via-connect2026.vercel.app are held in local environment files and CI secrets.
- Claude API keys, HeyGen credentials, Tavus CVI tokens, and Supabase service role keys all reside in the same environment scope.
- The multi-agent architecture (Jeffery to Michelangelo, Sherlock, Hannah, Arnold, LEX) actively writes code into the production repo on behalf of the founder.
- The prompt library (#001 through #128) establishes a strict append-only audit trail that is relied upon for regulatory traceability.

Under these conditions, a single silent copy-paste of an external file, even one from a reputable educational repository, can (a) introduce unaudited dependencies into package.json, (b) contaminate the Supabase migration sequence, (c) override Michelangelo's OBRA gates via a competing CLAUDE.md or .cursorrules file, or (d) introduce .github/workflows/*.yml that exfiltrates CI secrets.

### 2.2 Lessons from recent supply-chain incidents

The following public incidents directly motivate this policy and are cited as precedent for the restrictions below:

- **event-stream (2018)** — legitimate maintainer compromised via credential handoff; malicious payload added to a package with millions of weekly downloads.
- **ua-parser-js (2021)** — maintainer npm credentials phished; trojanized versions published under trusted name.
- **tj-actions/changed-files (March 2025)** — compromised GitHub Action exfiltrated CI secrets from thousands of repositories.
- **Shai-Hulud worm / @ctrl/tinycolor (September 2025)** — self-propagating worm stole developer tokens and published trojanized updates to victim-maintained packages.

In every case, reputation and star count were the preconditions of the attack, not protections against it.

### 2.3 What the existing standing rules protect and do not

| Rule | Protects Against | Gap Relative to External Code |
| --- | --- | --- |
| #1 Supabase email templates no-touch | Auth flow corruption | Does not cover migrations, RLS policies, or edge functions copied from external repos. |
| #2 package.json no-touch without approval | Unreviewed supply-chain expansion | Effective only if developers/agents never edit directly; does not prevent a pasted snippet from an external README. |
| #3 Append-only applied migrations | Schema drift, state divergence | Does not prevent an external migration file from being dropped into supabase/migrations/ with a new timestamp. |

The fourth standing rule closes these gaps by establishing a provenance boundary rather than a content-type boundary.

---

## 3. Standing Rule #4 — External Repository Governance

> **Standing Rule #4 (Permanent, Blocker-Level):**
> External repository content is reference material, never source material. No file originating from an external GitHub repository, GitLab project, npm package source, Hugging Face space, Kaggle notebook, Stack Overflow answer, or any third-party code source is ever copied directly into the ViaConnect repository, whether in whole or in part.
>
> External patterns, architectures, algorithms, and techniques may be adopted only by re-derivation through the normal Prompt to OBRA to Michelangelo pipeline, with a provenance citation in the resulting file header.

The following paths are explicitly protected and may never contain externally-sourced content:

- `package.json`, `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`
- `supabase/migrations/**`
- `supabase/functions/**`
- `.github/workflows/**`
- `.github/actions/**`
- Any root-level agent-instruction file: `CLAUDE.md`, `.cursorrules`, `AGENTS.md`, `.github/copilot-instructions.md`, `CONTRIBUTING.md`
- `next.config.js`, `next.config.ts`, `vercel.json`
- `tsconfig.json`, `eslint.config.js`, `tailwind.config.ts`, `postcss.config.js`
- Any `.env*` file or environment schema definition

Violations of this rule are blocker-level and must cause Michelangelo's OBRA Review gate to fail.

---

## 4. The Tier A to D Framework

Every interaction with external repositories must be classified into exactly one of four tiers. Tier assignment is performed by Jeffery at the moment an external repository URL enters the conversation and is recorded in the prompt's Observe phase.

### 4.1 Tier A — Reference Only (Browser, Never Cloned)

**Definition:** The repository is read through a web browser (github.com, code viewer, blog post). No files are downloaded, cloned, or placed on any machine with access to ViaConnect credentials.

**When to use:** First-pass evaluation of any unfamiliar repository; all educational content (e.g., Karpathy's nanoGPT, llm.c, nn-zero-to-hero); all repositories encountered via social media, Hacker News, or search results.

**Allowed outputs:**

- Notes and summaries in the Sherlock research artifact pipeline
- Conceptual diagrams
- References in prompt write-ups

**Prohibited outputs:**

- Code files in `/home/claude/` or the dev machine filesystem
- Screenshots of code that are then OCR-ed or retyped verbatim
- Copy-paste of more than a single identifier or function signature into any ViaConnect-adjacent file

**Default assumption:** Every external repository begins in Tier A. Promotion to a higher tier requires explicit Jeffery classification recorded in the prompt.

### 4.2 Tier B — Cloned to Isolated Environment

**Definition:** The repository is cloned to a dedicated isolated environment that has no network or filesystem path to ViaConnect credentials, Supabase keys, Vercel tokens, Claude API keys, HeyGen credentials, or any `.env*` file belonging to FarmCeutica projects.

**Acceptable isolated environments:**

- Dedicated WSL2 instance with its own user profile, no mounted access to `C:\Users\garyf\ViaConnect2026\`
- Virtual machine (Hyper-V, VirtualBox, VMware) with shared folders disabled and no credential passthrough
- Separate Windows user account with no access to Gary's home directory or credential store
- GitHub Codespaces or similar cloud sandbox, with no FarmCeutica secrets exported to it
- Dedicated physical machine (old laptop, Raspberry Pi, etc.)

**When to use:** Hands-on experimentation with code the founder wants to learn from or benchmark; running educational repos with actual execution; testing libraries before evaluating them for Tier C promotion.

**Required safeguards:**

- No Git remote pointing to any FarmCeutica-owned repository is configured in the isolated environment.
- No SSH identity shared with the main dev machine is accessible from the isolated environment.
- Any model weights, pickled files (`.pt`, `.pkl`), or HDF5 files are loaded with `weights_only=True` or equivalent safe-loading flags.
- The isolated environment is considered compromised by default; nothing that runs there is ever trusted to run elsewhere.

**Prohibited:**

- Any form of copy-paste from the isolated environment back to the main dev machine, including via clipboard managers, shared folders, or network drives.
- Any authentication of the isolated environment with gary@farmceuticawellness.com, Vercel, Supabase, or any other FarmCeutica identity.

### 4.3 Tier C — Pattern Re-Derived into ViaConnect

**Definition:** A pattern, architecture, or approach observed in a Tier A or Tier B context is extracted, analyzed, and rewritten from scratch by Michelangelo under OBRA review, with full provenance citation in the resulting file header.

**When to use:** The only pathway by which external influence legitimately enters the ViaConnect codebase.

**Required artifacts:**

- A Sherlock research note documenting the original pattern, its source URL, commit SHA, file path, license, and date of review.
- An Observe-phase analysis identifying (a) what the pattern does, (b) why it is useful for ViaConnect, (c) what the risks of the original implementation are.
- A Blueprint-phase design that rewrites the pattern in the ViaConnect idiom: Next.js 14+ App Router conventions, Supabase-first data access, `getDisplayName()` for all displayed names, Instrument Sans typography, Navy #1A2744 / Teal #2DA5A0 / Orange #B75E18 color tokens, Lucide React icons at `strokeWidth={1.5}`, no emojis in code.
- A Review-phase 13-point Michelangelo code review (see §5.3).
- An Audit-phase confirmation that the resulting code bears no verbatim copy of the source.

**Mandatory provenance citation format:** see §7.

### 4.4 Tier D — Prohibited (No Exceptions)

**Definition:** Direct file copy from any external source into the ViaConnect repository.

**Examples of Tier D actions that are unconditionally prohibited:**

- `cp external-repo/supabase/migrations/20240101_rls.sql supabase/migrations/`
- `curl https://raw.githubusercontent.com/.../CLAUDE.md > CLAUDE.md`
- Pasting a `package.json` dependencies block from a tutorial README
- Forking a repository and merging its main branch into any ViaConnect branch
- Copying a `.github/workflows/deploy.yml` from any third party
- Pasting a `next.config.js` snippet to "fix" a configuration issue

There is no exception pathway for Tier D. An item classified as Tier D must either be abandoned or escalated to Tier C for re-derivation.

---

## 5. OBRA Integration Points

Michelangelo's OBRA framework (Observe, Blueprint, Review, Audit) is amended to enforce this policy at every phase. These integration points are blocker-level: a failure at any phase halts the prompt.

### 5.1 Observe Phase — Provenance Detection

Michelangelo must, during the Observe phase, scan the prompt context, the user's referenced materials, and any proposed code for:

- URLs to github.com, gitlab.com, bitbucket.org, huggingface.co, kaggle.com, stackoverflow.com, gist.github.com, or similar
- Verbatim code snippets that exceed 25 contiguous tokens and appear to originate externally
- References to external package names not already present in `package.json`
- References to external agent-instruction patterns

Detected items must be logged in the Observe-phase report with a proposed tier classification.

### 5.2 Blueprint Phase — Re-Derivation Plan

If any Tier C pattern is planned, the Blueprint phase must include:

- A paragraph-level description of the pattern in Michelangelo's own words.
- An explicit statement of how the re-derivation will differ structurally from the source (variable naming, control flow, data model, error handling, ViaConnect-specific idioms).
- A risk assessment of the source (maintainer reputation, star count explicitly flagged as non-evidence, commit recency, transitive dependency count, known CVEs).
- The target file path(s) in the ViaConnect repository.

### 5.3 Review Phase — 13-Point Code Review

The existing 12-point Michelangelo code review is extended to 13 points. The new point #13 is:

> **Point 13 — External Provenance Integrity.** Every file touched in this prompt has either (a) no external provenance, or (b) a valid provenance citation header per §7 and contains no verbatim copy of the cited source exceeding 10 contiguous tokens. Any Tier D violation is a blocker and fails this point unconditionally.

### 5.4 Audit Phase — Verbatim Scan

The Audit phase gains a new mandatory check: Michelangelo must run a verbatim-match scan comparing each new or modified file against the cited external sources. Acceptable matches are limited to:

- Standard language keywords and operators
- Common API signatures that are non-copyrightable (e.g., `export default function Page()`)
- Identifier names that are semantically necessary (e.g., `supabase`, `useState`)

Any contiguous match of 10+ tokens with the cited source, excluding the above, fails the Audit phase and requires re-derivation.

---

## 6. Agent-Level Enforcement

### 6.1 Jeffery (Orchestrator)

Jeffery is the gatekeeper. When a prompt from Gary references an external repository or code source, Jeffery must:

- Refuse to dispatch the task to Michelangelo if the task phrasing is "copy X from Y" or "use the Z file from repo A".
- Rewrite such tasks as "evaluate pattern X from repo Y under Tier [A/B/C] for re-derivation into ViaConnect".
- Record the tier classification in the prompt's metadata block before dispatch.
- Assign Sherlock to produce the research artifact if the classification is Tier C.

Jeffery must also refuse any attempt to add a dependency to `package.json` without an accompanying Prompt-level evaluation artifact approved by Gary.

### 6.2 Michelangelo (TDD / Dev)

Michelangelo enforces OBRA §5 above. In addition, Michelangelo must:

- Refuse to execute any `npm install`, `npm add`, `pnpm add`, `yarn add`, or equivalent command without a Prompt-level evaluation artifact on file and explicit Gary approval in the prompt text.
- Refuse to create files in any of the protected paths listed in §3 unless the file is fully authored in the current prompt with no external provenance.
- Emit a Blocker-level OBRA gate failure and halt if a Tier D action is attempted.

### 6.3 Sherlock (Research)

Sherlock is the exclusive producer of external-repository research artifacts. Sherlock's outputs must:

- Live in a research artifact location (never in the ViaConnect repo itself).
- Include explicit risk signals: maintainer identity verification, 2FA status where discoverable, commit-history review, transitive dependency count, known CVE check via `npm audit` or Socket.dev.
- Explicitly disclaim star count, download count, and "Trending" status as safety signals.
- Terminate with a recommended tier classification (A, B, or C) and the rationale.

Sherlock never writes files into `/supabase/`, `/src/`, `/.github/`, or any protected path. Sherlock outputs only research artifacts.

### 6.4 Hannah, Arnold, LEX

These domain-specialist sub-agents inherit all of the above constraints from the Jeffery to Michelangelo chain. None may bypass OBRA by pulling in external code directly. LEX in particular, despite operating in the appellate litigation domain where external citation is professionally normal, must still route any code-level external patterns (e.g., PACER integration samples, e-filing libraries, IOLTA accounting examples) through Sherlock to Michelangelo under Tier C.

### 6.5 All Future Sub-Agents

Any future sub-agent created under the Jeffery orchestration layer inherits this policy by default. The onboarding prompt for any new sub-agent must reference Prompt #129 in its standing-rule block.

---

## 7. Provenance Citation Format

All files re-derived under Tier C must carry a provenance header. The format varies by file type. Working templates are stored at `viaconnect-web/docs/provenance/`.

### 7.1 TypeScript / JavaScript / TSX / JSX

```typescript
/**
 * Pattern adapted from: https://github.com/[owner]/[repo]
 * Original commit SHA: [40-char SHA]
 * Original file path: [path/to/file.ts]
 * Original license: [MIT | Apache-2.0 | BSD-3-Clause | etc.]
 * Date reviewed: [YYYY-MM-DD]
 * Sherlock research artifact: Prompt #[N] / [drive link]
 * Re-derivation: Michelangelo via OBRA under Prompt #[N]
 * Verbatim copy: None (Audit-phase attested)
 */
```

### 7.2 SQL / Supabase Migrations

```sql
-- Pattern adapted from: https://github.com/[owner]/[repo]
-- Original commit SHA: [40-char SHA]
-- Original file path: [path/to/migration.sql]
-- Original license: [SPDX]
-- Date reviewed: [YYYY-MM-DD]
-- Sherlock research artifact: Prompt #[N]
-- Re-derivation: Michelangelo via OBRA under Prompt #[N]
-- Verbatim copy: None (Audit-phase attested)
```

### 7.3 YAML / Configuration

```yaml
# Pattern adapted from: https://github.com/[owner]/[repo]
# Original commit SHA: [40-char SHA]
# Original file path: [path]
# Original license: [SPDX]
# Date reviewed: [YYYY-MM-DD]
# Sherlock research artifact: Prompt #[N]
# Re-derivation: Michelangelo via OBRA under Prompt #[N]
# Verbatim copy: None (Audit-phase attested)
```

### 7.4 Markdown Documentation

For ViaConnect internal documentation that references external patterns, use a `> Provenance:` block quote at the bottom of the document, not a header comment.

---

## 8. Exceptions and Escalation

### 8.1 The only exception class: license-required attributions

If a Tier C re-derivation of a pattern covered by a copyleft license (GPL, AGPL, MPL) is ever contemplated, the exception pathway is:

1. Sherlock produces a license-compliance research artifact citing the specific license terms.
2. Gary reviews and explicitly approves in writing in the prompt text.
3. Steve Rica (Compliance) reviews and acknowledges.
4. If approved, the re-derivation proceeds under Tier C with the license text included in the provenance header.

**Default posture:** GPL/AGPL code should be avoided entirely for ViaConnect. MIT, Apache-2.0, BSD-3-Clause, and ISC are the only licenses that are routinely acceptable under Tier C.

### 8.2 Escalation path for ambiguous cases

If Michelangelo or Sherlock encounters an external repository whose tier classification is genuinely ambiguous (e.g., a repository jointly maintained by FarmCeutica employees and external contributors, or a vendor-supplied reference implementation under NDA), the escalation path is:

1. Jeffery flags the ambiguity in the Observe phase.
2. Prompt is paused pending Gary's explicit classification decision.
3. Gary's decision is recorded in the prompt's metadata and applied to all future interactions with that repository.

---

## 9. Implementation Checklist

The following items must be completed to activate this policy:

1. Add Standing Rule #4 to the ViaConnect permanent do-not-touch list in Gary's master reference document. **(Memorialized in persistent Claude Code memory as `feedback_external_repo_governance.md`.)**
2. Update Jeffery's orchestration prompt to include the §6.1 gatekeeping logic. **(Owned by Gary; agent config edit.)**
3. Update Michelangelo's OBRA prompt to add the §5 integration points and extend the code review from 12 points to 13. **(Owned by Gary; agent config edit.)**
4. Update Sherlock's research prompt to include the §6.3 explicit-disclaimer language about star count, download count, and trending status. **(Owned by Gary; agent config edit.)**
5. Update Hannah's, Arnold's, and LEX's onboarding prompts to reference Prompt #129. **(Owned by Gary; agent config edit.)**
6. Create the provenance citation template files (TS, SQL, YAML) in a shared ViaConnect documentation location. **(Completed as part of this commit: `viaconnect-web/docs/provenance/`. Templates sourced from §7 of this internal prompt; no external style-guide content.)**
7. Install Socket.dev or Snyk into the GitHub Advanced Security configuration for the ViaConnect repository. **(Follow-on prompt; this is itself a package.json-adjacent action and requires its own approved prompt.)**
8. Migrate Gary's ML experimentation work off `C:\Users\garyf\ViaConnect2026\` to a Tier B isolated environment. **(Follow-on prompt.)**
9. Pin all existing third-party GitHub Actions in `.github/workflows/` to full commit SHAs rather than tags. **(Follow-on prompt; Tier C re-derivation action.)**

Items 7, 8, and 9 are follow-on prompts and are not blocking on the activation of this policy.

---

## 10. Review and Revision Cadence

This policy is reviewed quarterly by Gary, with formal review cycles aligned to ViaConnect's internal governance calendar. Any amendment is made by superseding prompt (e.g., "Prompt #XXX supersedes §X of Prompt #129") and is append-only in the prompt library. The original Prompt #129 is never edited.

**Next scheduled review:** Q3 2026.

---

## 11. Acknowledgment

By merging this prompt into the ViaConnect prompt library and referencing it in the standing-rule blocks of Jeffery, Michelangelo, Sherlock, Hannah, Arnold, and LEX, the founder and all agents acknowledge that external repository content is reference material, never source material, and that the audit trail established by the prompt library is a first-class regulatory and operational asset to be protected accordingly.

---

## Document Control

| Field | Value |
| --- | --- |
| Prompt number | 129 |
| Title | External Repository Governance Policy |
| Author | Claude (under Gary Ferenczi's direction) |
| Date | 2026-04-23 |
| Delivery formats | .md, .docx |
| Destination | ViaConnect Prompt Library (Google Drive) |
| Supersedes | None |
| Classification | Permanent standing rule, blocker-level |
