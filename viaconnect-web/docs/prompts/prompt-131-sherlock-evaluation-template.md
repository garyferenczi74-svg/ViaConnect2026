# Prompt #131 — Sherlock External-Repository Evaluation Template

**Project:** ViaConnect™ GeneX360™ Precision Wellness Platform
**Company:** FarmCeutica Wellness LLC
**Owner:** Gary Ferenczi, CEO & Founder
**Classification:** Runtime operational template / Standing artifact specification
**Parent prompt:** Prompt #129 — External Repository Governance Policy (as amended by Prompt #129a)
**Operationalizes:** §6.3 of Prompt #129
**Fulfills:** Item 4 of §9 Implementation Checklist of Prompt #129 ("Update Sherlock's research prompt to include the §6.3 explicit-disclaimer language about star count, download count, and trending status")
**Template version:** 1.0
**Status:** Active — mandatory for all Sherlock external-repository research artifacts issued on or after this date
**Bundle ID affected:** com.farmceutica.viaconnect

---

## 1. Purpose & Scope

This prompt specifies the mandatory structure, content, and decision logic of every external-repository research artifact produced by Sherlock in support of the Jeffery → Michelangelo pipeline. It converts the policy-level language of Prompt #129 §6.3 into a runtime template that Sherlock fills in for each external repository encountered.

The template has two components:

1. A **structural specification** (§§4–7 below) that defines the required sections, the evidence each section must contain, the decision logic that maps evidence to a tier recommendation (A, B, C, or D), and the hard-fail conditions that force Tier D regardless of other signals.
2. A **fill-in artifact template** (§12 below) that Sherlock copies at the start of each evaluation and completes section by section. The completed artifact is the authoritative research output; unfilled or shortcut sections are a blocker-level OBRA Review gate failure.

This template is itself a Tier C re-derivation under Prompt #129 §4. It does not copy external examples of repository evaluation checklists (e.g., OpenSSF Scorecard, Snyk Advisor, Socket.dev public reports), though it acknowledges those as conceptual inspiration. The evidence checks described herein are authored specifically for the ViaConnect threat model: production Supabase keys on the same machine, Vercel deployment tokens, Claude API credentials, HeyGen/Tavus tokens, and patient-adjacent health data all within the blast radius of any install-time code execution.

**Scope inclusions:** any external repository, npm package source, Hugging Face space, Kaggle notebook, Stack Overflow answer beyond trivial snippets, Gist, Codepen, public S3 bucket, or vendor-provided reference implementation that Jeffery has tagged for evaluation.

**Scope exclusions:** (a) published books, papers, and articles whose content is read-only reference material and never executed; (b) pre-approved vendors whose contracts explicitly govern code exchange (if any are ever established); (c) FarmCeutica-owned repositories, which are internal and governed by the standing rules directly.

---

## 2. Relationship to Prompt #129 and Prompt #129a

Prompt #129 §6.3 establishes that Sherlock is the exclusive producer of external-repository research artifacts and enumerates four substantive requirements for those outputs. This prompt (#131) specifies exactly how Sherlock fulfills each of those requirements:

| Prompt #129 §6.3 requirement | Where fulfilled in this prompt |
|---|---|
| "Live in a research artifact location (never in the ViaConnect repo itself)" | §7 Artifact Storage & Naming Convention |
| "Include explicit risk signals: maintainer identity verification, 2FA status where discoverable, commit-history review, transitive dependency count, known CVE check" | §4.3 (maintainer), §4.4 (commits), §4.5 (dependencies), §4.9 (CVEs) |
| "Explicitly disclaim star count, download count, and 'Trending' status as safety signals" | §4.10 Explicit Non-Signals — a hard-required section with mandatory language |
| "Terminate with a recommended tier classification (A, B, or C) and the rationale" | §4.12 Tier Decision Tree, §4.13 Recommendation & Rationale |

Prompt #129a §3 extends the binding of #129 §6.3 to all nine currently-defined sub-agents and any future sub-agents. None of those other sub-agents may bypass Sherlock by producing their own external-repository evaluations — if Gordon, Arnold, LEX™, or any other agent encounters an external repository, the evaluation is routed to Sherlock, who applies this template.

Jeffery's role in gatekeeping remains unchanged: Jeffery tags the evaluation request, Sherlock produces the artifact per this template, Michelangelo (for Tier C only) consumes the artifact as input to its Blueprint phase.

---

## 3. When Sherlock Invokes This Template

Sherlock must fill out this template in full for every one of the following events:

1. **First encounter.** Any external repository URL that has not previously been evaluated enters the prompt context via Jeffery's Observe-phase scan.
2. **Re-evaluation on major version.** A previously-evaluated repository has released a new major version (semver MAJOR bump or equivalent) and is being reconsidered for Tier C re-derivation.
3. **Re-evaluation on maintainer change.** GitHub shows a change of primary maintainer, ownership transfer, or org migration for a previously-evaluated repository.
4. **Re-evaluation on incident.** Any security incident disclosed publicly that touches a previously-evaluated repository — including but not limited to CVE disclosure, maintainer account takeover, malicious release, or takedown — triggers mandatory re-evaluation before any further use.
5. **Re-evaluation on elapsed time.** Every six months from the date of the most recent evaluation artifact, if the repository is still in active reference or Tier C use. Stale evaluations are treated as no evaluation.

Sherlock may not produce an artifact that skips sections, defers sections, or declares sections "not applicable" without an explicit Gary-approved exception in the current prompt text. Partial artifacts are blocker-level gate failures.

Sherlock may not produce an artifact from memory or from training data recall. Every evidence field must be a live, verifiable reference (URL, command output, or observable fact at time of evaluation).

---

## 4. The Evaluation Artifact Structure

Every Sherlock evaluation artifact contains the following fourteen sections, in order. Each section has a mandatory status field with exactly three permissible values: **PASS**, **CAUTION**, or **FAIL**. The §5 decision tree maps the pattern of statuses to a tier recommendation.

### 4.1 Section 1 — Identification Header

**Questions to answer:** What exactly is being evaluated?

**Required fields:**

- Repository URL (canonical, `https://github.com/owner/repo` format — no query strings, no redirects)
- Owner account URL
- Commit SHA at time of evaluation (40-char, never a branch name or tag)
- Default branch name at time of evaluation
- Repository description (verbatim from repo)
- Primary language(s) (per GitHub's language detection)
- Repository age (`created_at` from GitHub API)
- Date of evaluation (ISO 8601, Calgary timezone: America/Edmonton)
- Sherlock evaluator version (this template version, currently 1.0)

**Status rule:** This section is informational only. Status is always **PASS** unless a field is unavailable, in which case **FAIL** (the evaluation cannot proceed without canonical identification).

### 4.2 Section 2 — Typosquat & Authenticity Check

**Questions to answer:** Is this the repository the user intended, or a lookalike?

**Evidence required:**

- Comparison of owner name against any similarly-named accounts (e.g., `karpathy` vs `karpthy`, `vercel` vs `vercei`, `supabase` vs `supabasehq` without verification)
- Comparison of repo name against similar repos under different owners
- Cross-reference against the maintainer's personal website, verified social account, or official organization page to confirm this is the canonical location
- Check for very recent account creation (account < 30 days old is a strong red flag)
- Check for suspicious star-count velocity (sudden spikes are often purchased stars — search for GitHub star-history visualizer output if available)
- Check whether the repository is a fork that has diverged significantly from its parent and is being misrepresented as the parent

**PASS criteria:** Owner and repo name match the canonical expected reference, owner account is established (>1 year old, consistent history), and no lookalike accounts are plausibly confusable.

**CAUTION criteria:** Similar lookalike accounts exist but the canonical identity is confirmable through secondary references.

**FAIL criteria:** Owner account is <30 days old, owner has no established online identity, star-count velocity shows clear manipulation pattern, or the repository is a fork masquerading as the original.

### 4.3 Section 3 — Maintainer & Account Verification

**Questions to answer:** Who is behind this, and do they have a credible identity?

**Evidence required:**

- GitHub account age (years active)
- Total contribution count (approximate order of magnitude — 10, 100, 1000, 10000+)
- Verified email badge on primary commits (GitHub displays this)
- Commit signing status (GPG-signed or SSH-signed commits — "Verified" badge)
- 2FA enablement where visible (GitHub Org membership sometimes reveals this via required-2FA orgs)
- Cross-reference to personal site, LinkedIn, Twitter/X, or other public identity
- Number of other repositories maintained by this account (concentration in one domain vs. sprawling hobby account)
- Recent account activity pattern (dormant 5 years then sudden burst of activity is a red flag)

**PASS criteria:** Account is >2 years old, has commit signing enabled, has a verified identity cross-reference, and shows consistent activity history.

**CAUTION criteria:** Account is between 6 months and 2 years old, or has inconsistent identity signals, or signing is enabled but identity cross-reference is weak.

**FAIL criteria:** Account is <6 months old, no commit signing, no identity cross-reference, or recent activity pattern resembles the known post-takeover signature (long dormancy followed by sudden releases and dependency changes).

### 4.4 Section 4 — Commit History & Release Cadence

**Questions to answer:** Does the code evolution look like normal, legitimate development?

**Evidence required:**

- Total commit count
- Commit cadence over the last 6 months (daily / weekly / monthly / dormant)
- Ratio of maintainer commits to external contributor commits
- Last three releases: version numbers, dates, release notes presence
- Whether recent commits show (a) normal feature work and bug fixes, (b) purely dependency bumps, or (c) unusual patterns like large binary additions, config file rewrites, or `.github/workflows/` changes by unfamiliar contributors
- Presence of force-pushes to the default branch in the last 90 days (requires checking the events API)
- Any suspicious recent commits: additions to `postinstall` scripts, new network calls in build scripts, changes to license text, or deletions of test coverage

**PASS criteria:** Normal commit cadence, maintainer-driven changes, release notes present, no force-pushes or suspicious commits in recent history.

**CAUTION criteria:** Dormant project being reactivated, recent maintainer change, or sparse release notes.

**FAIL criteria:** Recent force-push to default branch, recent `postinstall`/`setup.py` modification by an unfamiliar contributor, recent license-file change, or evidence of a merged but unreviewed PR from a new contributor into security-sensitive code paths.

### 4.5 Section 5 — Dependency Analysis

**Questions to answer:** What does this repository pull in, and what is the size of the trust graph?

**Evidence required:**

- Direct dependency count (from `package.json` `dependencies` + `devDependencies`, or `requirements.txt`, or equivalent)
- Transitive dependency count (output of `npm ls --all | wc -l` in an isolated sandbox, or `pip show` traversal; run this in a Tier B environment only)
- Top 5 dependencies by popularity with a one-line identification of each
- Count of dependencies whose maintainer account is unknown / unestablished (less than 1 year old, no verified identity)
- Presence of any dependency that has been the subject of a prior security incident (event-stream, ua-parser-js, @ctrl/tinycolor, etc.) — even if pinned to a pre-incident version
- Version pinning discipline: are dependencies pinned to exact versions, or are caret ranges (`^`) used pervasively (caret ranges are how compromised patch releases reach your machine)

**PASS criteria:** Direct deps < 20 OR transitive deps < 300, all top dependencies are well-established, no historical-incident packages in the tree, exact versions pinned.

**CAUTION criteria:** Larger trees (transitive count 300–1500), some caret ranges, or one or two unknown-maintainer packages.

**FAIL criteria:** Transitive count > 1500 (common for Next.js-era JS libraries, so this alone is CAUTION in that context — but fails when combined with other signals), historical-incident package present in tree, or pervasive caret ranges on security-sensitive dependencies.

**Note on the ViaConnect base case:** The ViaConnect repository itself has a large transitive dependency count through Next.js, Supabase SDK, Tailwind, and Framer Motion. Sherlock must evaluate external dependency counts relative to what the external repository adds beyond what ViaConnect already has, not in absolute terms.

### 4.6 Section 6 — License Compatibility

**Questions to answer:** Can ViaConnect actually use this, legally?

**Evidence required:**

- License declared in the repository (LICENSE file, `package.json` `license` field, or declared absence)
- SPDX identifier (MIT, Apache-2.0, BSD-3-Clause, ISC, MPL-2.0, LGPL-3.0, GPL-3.0, AGPL-3.0, UNLICENSED, etc.)
- Any additional license notices in subdirectories (multi-license repos happen)
- Whether any dependencies carry more restrictive licenses than the parent

**License compatibility matrix (ViaConnect-specific):**

| License | Tier C acceptability | Notes |
|---|---|---|
| MIT | PASS | Preferred |
| Apache-2.0 | PASS | Preferred; note the NOTICE file requirement |
| BSD-3-Clause | PASS | Standard |
| BSD-2-Clause | PASS | Standard |
| ISC | PASS | Standard |
| 0BSD / Unlicense / CC0 | PASS | Note the provenance citation remains mandatory even for public-domain code |
| MPL-2.0 | CAUTION | File-level copyleft; requires Gary + Steve Rica review per Prompt #129 §8.1 |
| LGPL-2.1 / LGPL-3.0 | CAUTION | Dynamic linking considerations for web apps are contested; requires full §8.1 review |
| GPL-2.0 / GPL-3.0 | FAIL | Default disposition per Prompt #129 §8.1 is to avoid |
| AGPL-3.0 | FAIL | Default disposition per Prompt #129 §8.1 is to avoid; especially incompatible with SaaS delivery |
| Proprietary / UNLICENSED / No license | FAIL | Code with no license grant cannot be Tier C re-derived |
| SSPL / BSL / Elastic License | FAIL | Commercial-restrictive licenses; require explicit Gary-level contract review |

**PASS / CAUTION / FAIL:** determined by the worst-case license in the tree (parent or any dependency).

### 4.7 Section 7 — Install-Time Code Execution Surface

**Questions to answer:** If someone runs the standard install command, what code executes immediately?

This is the highest-stakes section of the evaluation. Install-time code execution is the mechanism by which virtually all modern npm supply-chain attacks reach the victim.

**Evidence required:**

- Contents of `scripts` block in `package.json`, specifically `preinstall`, `install`, `postinstall`, `prepare`, `prepublishOnly`
- Contents of `setup.py` custom commands if present (`cmdclass`, post-install hooks)
- Contents of `pyproject.toml` build system custom hooks
- Any Makefile targets that are invoked by default
- Any Dockerfile `RUN` commands that fetch from external URLs
- Any shell scripts in the repo root that are called by install/build flows (`install.sh`, `build.sh`, `setup.sh`)
- Any references to downloading binaries, model weights, or datasets at install time (these are second-tier trust decisions)

**PASS criteria:** No lifecycle scripts beyond build tooling (`tsc`, `vite build`, etc.); no network calls at install time; no binary downloads.

**CAUTION criteria:** Lifecycle scripts exist but only invoke local build tooling with no network access.

**FAIL criteria:** Any `postinstall` that reads environment variables, writes to paths outside the package directory, opens network sockets, downloads executables, or runs code from a URL. Any install-time download of a binary, model, or dataset without checksum verification. Any script that sources or evaluates a remote shell payload.

**Special rule:** If this section is FAIL, the overall tier recommendation is FAIL-as-Tier-D automatically, regardless of other sections.

### 4.8 Section 8 — Agent-Instruction & CI Config Surface

**Questions to answer:** Does this repository contain any files that would silently configure our agents or CI if copied?

**Evidence required — presence/absence check of the following files:**

- `CLAUDE.md`, `.claude/` directory
- `.cursorrules`, `.cursor/` directory
- `AGENTS.md`
- `.github/copilot-instructions.md`
- `.windsurfrules`
- `.aider.conf.yml`
- Any other emerging agent-instruction file format
- `.github/workflows/**`
- `.github/actions/**` (composite actions)
- Any pre-commit config (`.pre-commit-config.yaml`)

**Evidence required — if any of the above exist:**

- A verbatim transcript of any instruction file (for Sherlock's analysis; never to be copied into ViaConnect)
- A summary of what each GitHub Actions workflow does, what secrets it reads, and whether it uses third-party actions pinned by tag (weak) or by full commit SHA (strong)

**PASS criteria:** None of the above files exist in the external repo, OR they exist but contain no content that would pose risk if copied (acknowledging that none of them will be copied per Prompt #129 §3 regardless).

**CAUTION criteria:** Agent-instruction files exist and contain content that looks designed to override default agent behavior (e.g., instructions to "always commit before reviewing" or "skip tests when user says X").

**FAIL criteria:** `.github/workflows/` contains workflows that exfiltrate secrets, use unpinned third-party actions, or download+execute remote payloads; or agent-instruction files contain prompt-injection patterns targeting LLM operators.

**Reminder on policy scope:** Regardless of what this section reports, no file in this category is ever eligible for copy into ViaConnect per Prompt #129 §3. Even PASS in this section does not permit copying. This section exists to (a) document the external repo's trust posture for Sherlock's recommendation, and (b) identify prompt-injection risk in files Sherlock itself may read.

### 4.9 Section 9 — Known Vulnerabilities

**Questions to answer:** Are there already-known security problems?

**Evidence required:**

- Output of `npm audit` (or `pnpm audit`, `yarn audit`) run in an isolated sandbox against the repo's lockfile
- GitHub Dependabot alert count (visible if the evaluator has access, or inferable from public security advisories)
- GitHub Security Advisories for this package (check `https://github.com/advisories?query=package-name`)
- Socket.dev report summary (if Socket.dev is installed — see Prompt #129 §9 item 7, currently pending)
- CVE database search for the package name
- Any open security-tagged issues in the repository

**PASS criteria:** Zero high or critical vulnerabilities in the tree; low-severity findings are documented but do not fail.

**CAUTION criteria:** High-severity findings exist but are in dev-only dependencies OR have a clear mitigation path.

**FAIL criteria:** Any critical-severity vulnerability in the production dependency path; or any high-severity finding whose exploit touches the authentication, credential, or data-access layer.

### 4.10 Section 10 — Explicit Non-Signals (Disclaimers)

**Questions to answer:** Has Sherlock been misled by things that look like safety signals but are not?

This section is **mandatory** and must always appear in the artifact with the **exact language below**, even if the evaluator sees no signals of concern. Its purpose is to explicitly foreclose Sherlock's own reliance on these signals in forming a recommendation.

**Required verbatim text in every artifact:**

> The following indicators were explicitly **not** relied upon by this evaluation in forming the recommendation in §4.13, per Prompt #129 §6.3:
>
> - **GitHub star count** (trivially gameable via purchased stars; irrelevant to code safety)
> - **npm weekly download count** (high downloads correlate with being a target, not with being safe — see event-stream, ua-parser-js, @ctrl/tinycolor incidents)
> - **"Trending" status on GitHub or any aggregator**
> - **Inclusion in "Awesome X" lists or curated directories**
> - **Positive blog post mentions, Twitter/X virality, or Hacker News front-page history**
> - **Package age alone** (old packages can be acquired and compromised; see all maintainer-takeover incidents)
> - **Download count of the maintainer's other packages** (reputation at the account level does not transfer safely across all packages)
>
> Sherlock's recommendation is derived exclusively from the evidence in §§4.1–4.9, §4.11, and the hard-fail conditions in §6.

**Status rule:** This section is always **PASS** when the verbatim text above is present. It is **FAIL** (blocker-level gate failure) if the text is omitted, paraphrased, or edited in any way.

### 4.11 Section 11 — Risk Scoring Rubric Summary

**Questions to answer:** What is the aggregate picture across all evidence sections?

**Required fields:**

- Status of each of §4.1 through §4.10 as a single-line summary table
- Count of PASS / CAUTION / FAIL across sections §4.2 through §4.9 (§4.1 and §4.10 are PASS by construction when properly filled)
- Identification of the worst section and the reason

**Format (required table):**

| Section | Status | One-line reason |
|---|---|---|
| §4.2 Typosquat & Authenticity | [PASS/CAUTION/FAIL] | [reason] |
| §4.3 Maintainer | [PASS/CAUTION/FAIL] | [reason] |
| §4.4 Commit History | [PASS/CAUTION/FAIL] | [reason] |
| §4.5 Dependencies | [PASS/CAUTION/FAIL] | [reason] |
| §4.6 License | [PASS/CAUTION/FAIL] | [reason] |
| §4.7 Install-Time Execution | [PASS/CAUTION/FAIL] | [reason] |
| §4.8 Agent/CI Config Surface | [PASS/CAUTION/FAIL] | [reason] |
| §4.9 Known Vulnerabilities | [PASS/CAUTION/FAIL] | [reason] |

### 4.12 Section 12 — Tier Classification Decision Tree

Apply in order; first match wins:

1. Any **FAIL in §4.7 (Install-Time Execution)** → **Tier D, recommendation: ABANDON.** No exceptions.
2. Any **FAIL in §4.6 (License)** for GPL/AGPL/proprietary/no-license → **Tier D, recommendation: ABANDON** unless Prompt #129 §8.1 license-exception pathway is explicitly invoked in the current prompt with Gary + Steve Rica approval.
3. Any **FAIL in §4.2 (Typosquat)** → **Tier D, recommendation: ABANDON** — Sherlock has concluded this is not the repository the user intended.
4. Any **FAIL in §§4.3, 4.4, 4.8, or 4.9** → **Tier D** if the use case was read/execute, **Tier A** if the use case is purely reference-from-browser. Rationale: a compromised repo can still be instructive to read about without cloning.
5. No FAILs, but any **CAUTION in §§4.2–4.9** → **Tier A or Tier B**, with explicit escalation note for Gary. Default is Tier A (browser only) unless the use case specifically requires execution, in which case Tier B with enhanced isolation.
6. No FAILs and no CAUTIONs → **Tier A, Tier B, or Tier C permitted.** The choice among these is driven by the use case, not by the evaluation: browser reference → Tier A; hands-on experimentation → Tier B; pattern re-derivation into ViaConnect → Tier C.

**Tier C additionally requires:** no CAUTION in §4.6 (License) and no CAUTION in §4.8 (Agent/CI Config Surface). Tier C is the highest-trust tier because it brings external influence into the ViaConnect repository, so it has stricter gates than Tier A or Tier B.

### 4.13 Section 13 — Recommendation & Rationale

**Required fields:**

- Recommended tier: A / B / C / D
- Confidence: High / Medium / Low
- One-paragraph rationale tracing the recommendation through the §4.12 decision tree, citing specific evidence from §§4.2–4.11
- Use-case-specific caveat: a single sentence naming the specific use case this recommendation is valid for, and a note that any broader use requires re-evaluation

**Rationale must not invoke §4.10 non-signals.** If Sherlock finds itself writing "this repo has 42,000 stars" or "lucide-react has millions of downloads" in the rationale, the rationale is rejected as non-compliant with §6.3 of Prompt #129.

### 4.14 Section 14 — Escalation Triggers

**Questions to answer:** What future events would cause this evaluation to become stale or invalid?

**Required fields:**

- Mandatory re-evaluation triggers (restate from §3 of this prompt as they apply specifically)
- Repository-specific watch items: any particular dependency, maintainer, or file path that Sherlock identified as worth future re-check even if no general trigger fires
- Suggested next evaluation date (default: 6 months from today)

---

## 5. Tier Classification Decision Logic (Expanded)

The decision tree in §4.12 is terse by design. This section expands the reasoning so Sherlock (and future auditors) can understand why the tree is structured the way it is.

**Why §4.7 dominates.** Install-time code execution is the mechanism by which a compromised package reaches a developer's credential store, environment variables, and file system. No other property of a repository matters if the install step can exfiltrate keys. A popular, well-licensed, well-maintained package with a malicious postinstall is more dangerous than an obscure, abandoned, unlicensed package with no install scripts — because the first will actually run on your machine. Hence §4.7 FAIL is an automatic Tier D regardless of what the other sections say.

**Why §4.6 license FAIL is tier-specific.** An unlicensed repository cannot be re-derived into ViaConnect (Tier C) because there is no legal grant permitting derivative works. But an unlicensed repository can still be read in a browser (Tier A) for educational purposes — observation of public code is not itself copyright infringement. This is why §4.12 rule 2 downgrades to ABANDON rather than blanket Tier D: the evaluator considers the intended use case.

**Why §4.2 typosquat FAIL is always Tier D.** If Sherlock concludes the repository is not what the user thinks it is, every downstream evaluation is evaluating the wrong thing. The right response is to abandon and restart with the correct repository.

**Why Tier C has stricter gates than Tier A/B.** Tier A and Tier B are contained — nothing from those tiers enters the ViaConnect repository. Tier C is the only tier where external influence (re-derived) enters ViaConnect's append-only history. Any doubt at all about the pattern, its license, or the integrity of the source suggests it should remain in Tier A or Tier B rather than making the one-way trip to Tier C.

**Why CAUTION is a soft-failure rather than a FAIL.** Many legitimate repositories have minor signal weaknesses — a dependency on a less-established package, a commit cadence that has slowed, a license with ambiguity. The purpose of CAUTION is to surface these to Gary for a decision rather than to auto-reject. CAUTIONs accumulate: multiple CAUTIONs in one evaluation should drive the recommendation downward (e.g., from Tier C toward Tier B) even though no single one is disqualifying.

---

## 6. Hard-Fail Conditions (Automatic Tier D, No Exceptions)

These conditions override all other evaluation logic and force an immediate Tier D recommendation with no pathway to higher tiers:

1. **Active security advisory flagging the exact repository and version as malicious.** Source: GitHub Security Advisories, CVE, Socket.dev, Snyk advisory, or equivalent credible source.
2. **Evidence of maintainer account compromise within the evaluation window.** Triggers: sudden maintainer change, sudden release after long dormancy, sudden unexplained dependency additions.
3. **License is proprietary, SSPL, BSL, Elastic License, or no license present** — and the Prompt #129 §8.1 exception pathway has not been invoked in the current prompt.
4. **Install-time code executes arbitrary remote content** (curl-to-shell, wget-to-execute, remote binary download without checksum).
5. **Repository is flagged by GitHub as "DMCA takedown," "Terms of Service violation,"** or similar enforcement action.
6. **Repository contains material that would cause regulatory or reputational harm to FarmCeutica on casual inspection** (this is a judgment call Sherlock must make and flag to Gary).

Hard-fail conditions are announced in the Recommendation & Rationale (§4.13) by prefixing the rationale with **"HARD FAIL — Tier D automatic."** and naming the specific condition.

---

## 7. Artifact Storage & Naming Convention

Per Prompt #129 §6.3, Sherlock artifacts "live in a research artifact location (never in the ViaConnect repo itself)." This prompt establishes the specific convention.

**Default storage location:** Google Drive folder `ViaConnect Research Artifacts / Sherlock / External Repository Evaluations / YYYY-MM /`

**Default file naming:** `[YYYY-MM-DD]__[owner]__[repo]__[short-commit-SHA7]__v[template-version].md`

**Example:** `2026-04-24__karpathy__nanoGPT__a1b2c3d__v1.0.md`

**Required companions:**

- `.docx` converted copy (for archival in the same folder)
- Entry in a running index file `ViaConnect Research Artifacts / Sherlock / INDEX.md` with one line per evaluation (date, repo, recommended tier, confidence, link to artifact)

**File must never be placed in:**

- The ViaConnect repository (`C:\Users\garyf\ViaConnect2026\viaconnect-web\`)
- The Supabase project storage buckets
- Any environment that could trigger indexing into Jeffery's knowledge base without Gary's explicit approval (Sherlock artifacts are inputs to Jeffery, not auto-ingested context)

**Retention:** Evaluations are retained indefinitely. Even superseded evaluations remain in the folder as part of the audit trail. A superseding evaluation adds a "Supersedes: [prior filename]" line in its §4.1 Identification Header.

---

## 8. Template Versioning

This prompt establishes template version **1.0**. Future revisions of the template are issued as new prompts (e.g., Prompt #131a, Prompt #131b, or eventually a Prompt #NNN v2.0). Existing Sherlock artifacts record the template version they used in §4.1, so older evaluations can be reinterpreted in their original context.

The template is itself a governance artifact under ViaConnect's append-only discipline: the source text of Prompt #131 is never edited. Corrections and clarifications are issued as new lettered prompts.

---

## 9. Worked Example (Didactic, Hypothetical)

To illustrate the template in use, the following is a hypothetical worked example for a fictional npm package. It is labeled as fictional and is not a real evaluation; it exists only to show Sherlock what a completed artifact looks like. Any resemblance to a real package is coincidental.

**Hypothetical target:** `super-validator-pro` — a fictional schema validation library.

- **§4.1 Identification:** repository `https://github.com/examplecorp/super-validator-pro`, commit `abc123...`, default branch `main`, created 2023-06-15, evaluation date 2026-04-24, template v1.0.
- **§4.2 Typosquat:** PASS — owner `examplecorp` has verified org badge, repo name is distinctive, no lookalikes identified.
- **§4.3 Maintainer:** CAUTION — primary maintainer account is 14 months old (below the 2-year bar), has commit signing enabled and verified email, but identity cross-reference to a personal site is weak.
- **§4.4 Commit History:** PASS — weekly commit cadence, clear release notes, no suspicious recent changes.
- **§4.5 Dependencies:** PASS — 8 direct dependencies, ~220 transitive, all from established maintainers, no historical-incident packages, exact version pinning.
- **§4.6 License:** PASS — MIT.
- **§4.7 Install-Time Execution:** PASS — no lifecycle scripts; build is `tsc` only.
- **§4.8 Agent/CI Config:** PASS — no agent-instruction files; workflows pin third-party actions by tag (not SHA — this is worth noting but doesn't fail).
- **§4.9 Known Vulnerabilities:** PASS — zero findings via `npm audit`; no open advisories.
- **§4.10 Non-Signals:** (verbatim required text included).
- **§4.11 Rubric:** 7 PASS, 1 CAUTION (§4.3), 0 FAIL.
- **§4.12 Decision:** No hard fails; CAUTION in §4.3 → Tier A or Tier B, escalation note to Gary. Tier C is NOT available due to the CAUTION.
- **§4.13 Recommendation:** **Tier B** (isolated environment for experimentation). Confidence: Medium. Rationale: all safety signals pass except maintainer account age, which sits below the 2-year Tier C bar but does not meet any FAIL condition. Hands-on evaluation in a sandboxed environment is reasonable; re-derivation into ViaConnect should wait until the maintainer account matures further or Gary makes an explicit exception. Use case: evaluating schema validation for the CAQ Phase 6 input forms only.
- **§4.14 Escalation:** Re-evaluate in 6 months (2026-10-24) or sooner if the maintainer pushes a major version. Watch item: maintainer account age and any third-party audits of the package.

---

## 10. Hand-Off to Michelangelo (Tier C Path Only)

When a Sherlock artifact recommends Tier C and Gary approves proceeding, the artifact becomes an input to Michelangelo's Blueprint phase per Prompt #129 §5.2. The hand-off is explicit and structured:

1. The Sherlock artifact's Drive URL is cited in the Prompt that dispatches Michelangelo.
2. Michelangelo's Observe phase reads the artifact and confirms the tier recommendation matches the prompt's intent.
3. Michelangelo's Blueprint phase produces a re-derivation plan that cites the Sherlock artifact's §4.13 recommendation as its provenance anchor.
4. Michelangelo's Review phase (13-point check, per Prompt #129 §5.3 as amended) verifies that the re-derivation contains no verbatim copy exceeding the 10-token limit.
5. Michelangelo's Audit phase produces a final attestation that names the Sherlock artifact as the evaluation input.

**No Tier C re-derivation proceeds without a corresponding Sherlock artifact.** No Sherlock artifact obligates a Tier C re-derivation — Gary may decide not to proceed for any reason, and that decision is recorded in the prompt thread.

---

## 11. Document Control

| Field | Value |
|---|---|
| Prompt number | 131 |
| Title | Sherlock External-Repository Evaluation Template |
| Parent | Prompt #129 (as amended by Prompt #129a) |
| Author | Claude (under Gary Ferenczi's direction) |
| Date | 2026-04-24 |
| Delivery formats | `.md`, `.docx` |
| Destination | ViaConnect Prompt Library (Google Drive) |
| Operationalizes | §6.3 of Prompt #129 |
| Fulfills | Item 4 of §9 of Prompt #129 |
| Template version introduced | 1.0 |
| Note on #130 | Intentionally unallocated in the prompt library numbering sequence. Next substantive deliverable after #129a was renumbered to #131 at Gary's direction. |
| Classification | Runtime operational template — mandatory for Sherlock artifacts |

---

## 12. Fill-In Artifact Template (Copy-Paste for Sherlock)

The following is the canonical template Sherlock copies at the start of each evaluation. Fields in `[brackets]` are to be replaced with evaluation-specific content. Do not delete section headers or the verbatim text in §4.10. Keep this template version aligned with the one recorded in §4.1.

A standalone copy of this template lives at `viaconnect-web/docs/sherlock/evaluation-template.md` for convenience; the authoritative source is this §12.

````markdown
# Sherlock External-Repository Evaluation — [repo name]

**Template version:** 1.0 (per Prompt #131)
**Evaluator:** Sherlock
**Evaluation date:** [YYYY-MM-DD]
**Dispatching prompt:** Prompt #[N]
**Supersedes (if any):** [prior evaluation filename, or "None"]

---

## §4.1 Identification Header

- Repository URL: [https://github.com/owner/repo]
- Owner account URL: [https://github.com/owner]
- Commit SHA at evaluation: [40-char SHA]
- Default branch: [branch]
- Description (verbatim): "[description]"
- Primary language(s): [language list]
- Repository age: [years since created_at]
- Evaluation date: [YYYY-MM-DD, America/Edmonton]
- Template version: 1.0

**Status:** PASS

---

## §4.2 Typosquat & Authenticity Check

- Owner lookalikes considered: [list, or "none identified"]
- Repo-name lookalikes considered: [list, or "none identified"]
- Canonical identity cross-reference: [URL or method]
- Owner account age: [duration]
- Star-count velocity anomaly: [present / absent]
- Fork-masquerade check: [clear / flagged]

**Status:** [PASS / CAUTION / FAIL]
**Reason:** [one sentence]

---

## §4.3 Maintainer & Account Verification

- GitHub account age: [years]
- Contribution count (OOM): [10 / 100 / 1000 / 10000+]
- Verified email badge: [yes / no]
- Commit signing (GPG/SSH): [enabled and verified / enabled not verified / not enabled]
- 2FA visible: [yes / no / not determinable]
- Identity cross-reference: [URL + description, or "none found"]
- Other repos maintained: [count + concentration note]
- Recent activity pattern: [normal / dormant-then-burst / other]

**Status:** [PASS / CAUTION / FAIL]
**Reason:** [one sentence]

---

## §4.4 Commit History & Release Cadence

- Total commits: [count]
- Cadence (last 6 months): [daily / weekly / monthly / dormant]
- Maintainer : external contributor ratio: [ratio]
- Last 3 releases: [versions + dates]
- Recent commit quality: [normal / dep-bumps-only / suspicious]
- Force-pushes (last 90d): [yes / no]
- Suspicious recent commits: [list, or "none"]

**Status:** [PASS / CAUTION / FAIL]
**Reason:** [one sentence]

---

## §4.5 Dependency Analysis

- Direct dependency count: [count]
- Transitive dependency count: [count] (measured in isolated sandbox)
- Top 5 dependencies: [list with one-line identification each]
- Unknown-maintainer dep count: [count]
- Historical-incident packages in tree: [list, or "none"]
- Version pinning discipline: [exact / caret / mixed]

**Status:** [PASS / CAUTION / FAIL]
**Reason:** [one sentence]

---

## §4.6 License Compatibility

- Declared license: [SPDX identifier]
- Additional sub-directory licenses: [list, or "none"]
- Worst license in tree: [SPDX]
- Against ViaConnect compatibility matrix: [PASS / CAUTION / FAIL per §4.6 table]

**Status:** [PASS / CAUTION / FAIL]
**Reason:** [one sentence]

---

## §4.7 Install-Time Code Execution Surface

- `package.json` lifecycle scripts: [verbatim list, or "none"]
- `setup.py` custom commands: [list, or "N/A"]
- `pyproject.toml` build hooks: [list, or "N/A"]
- Default `Makefile` targets: [list, or "N/A"]
- `Dockerfile` external-fetch RUN commands: [list, or "N/A"]
- Install/build shell scripts: [list, or "N/A"]
- Install-time binary/model/dataset downloads: [list, or "none"]

**Status:** [PASS / CAUTION / FAIL]
**Reason:** [one sentence]

---

## §4.8 Agent-Instruction & CI Config Surface

- `CLAUDE.md` / `.claude/`: [present / absent]
- `.cursorrules` / `.cursor/`: [present / absent]
- `AGENTS.md`: [present / absent]
- `.github/copilot-instructions.md`: [present / absent]
- Other agent-instruction files: [list, or "none"]
- `.github/workflows/`: [count of workflows + pinning status summary]
- `.github/actions/`: [present / absent]
- `.pre-commit-config.yaml`: [present / absent]

**Status:** [PASS / CAUTION / FAIL]
**Reason:** [one sentence]

---

## §4.9 Known Vulnerabilities

- `npm audit` summary: [counts by severity]
- GitHub Security Advisories: [count + descriptions if any]
- Socket.dev report: [summary or "not yet installed in ViaConnect"]
- CVE database hits: [list, or "none"]
- Open security-tagged issues: [count]

**Status:** [PASS / CAUTION / FAIL]
**Reason:** [one sentence]

---

## §4.10 Explicit Non-Signals (Verbatim Required)

The following indicators were explicitly **not** relied upon by this evaluation in forming the recommendation in §4.13, per Prompt #129 §6.3:

- **GitHub star count** (trivially gameable via purchased stars; irrelevant to code safety)
- **npm weekly download count** (high downloads correlate with being a target, not with being safe — see event-stream, ua-parser-js, @ctrl/tinycolor incidents)
- **"Trending" status on GitHub or any aggregator**
- **Inclusion in "Awesome X" lists or curated directories**
- **Positive blog post mentions, Twitter/X virality, or Hacker News front-page history**
- **Package age alone** (old packages can be acquired and compromised; see all maintainer-takeover incidents)
- **Download count of the maintainer's other packages** (reputation at the account level does not transfer safely across all packages)

Sherlock's recommendation is derived exclusively from the evidence in §§4.1–4.9, §4.11, and the hard-fail conditions in §6 of Prompt #131.

**Status:** PASS

---

## §4.11 Risk Scoring Rubric Summary

| Section | Status | One-line reason |
|---|---|---|
| §4.2 Typosquat & Authenticity | [PASS/CAUTION/FAIL] | [reason] |
| §4.3 Maintainer | [PASS/CAUTION/FAIL] | [reason] |
| §4.4 Commit History | [PASS/CAUTION/FAIL] | [reason] |
| §4.5 Dependencies | [PASS/CAUTION/FAIL] | [reason] |
| §4.6 License | [PASS/CAUTION/FAIL] | [reason] |
| §4.7 Install-Time Execution | [PASS/CAUTION/FAIL] | [reason] |
| §4.8 Agent/CI Config Surface | [PASS/CAUTION/FAIL] | [reason] |
| §4.9 Known Vulnerabilities | [PASS/CAUTION/FAIL] | [reason] |

**Aggregate counts:** PASS=[n], CAUTION=[n], FAIL=[n].
**Worst section:** [§4.X] — [reason].

---

## §4.12 Tier Classification Decision Trace

Applied §4.12 rules in order:
1. [Rule 1 result]
2. [Rule 2 result]
3. [Rule 3 result]
4. [Rule 4 result]
5. [Rule 5 result]
6. [Rule 6 result]

First matching rule: [rule number].

---

## §4.13 Recommendation & Rationale

**Recommended tier:** [A / B / C / D]
**Confidence:** [High / Medium / Low]

**Rationale:** [one paragraph tracing through §4.12, citing specific evidence from §§4.2–4.11; MUST NOT invoke §4.10 non-signals]

**Use-case-specific caveat:** [one sentence naming the specific use case this recommendation is valid for]

---

## §4.14 Escalation Triggers

- Standard re-evaluation triggers (per §3 of Prompt #131): major version release, maintainer change, security incident, 6-month elapsed time.
- Repository-specific watch items: [list, or "none"]
- Suggested next evaluation date: [YYYY-MM-DD, default: today + 6 months]

---

*End of Sherlock artifact.*
````
