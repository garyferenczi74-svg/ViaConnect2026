# Prompt #133 — Supply-Chain Security Scanner Integration (Socket.dev / Snyk)

**Project:** ViaConnect™ GeneX360™ Precision Wellness Platform
**Company:** FarmCeutica Wellness LLC
**Owner:** Gary Ferenczi, CEO & Founder
**Classification:** Infrastructure governance / External service authorization
**Parent prompts:** Prompt #129 (parent policy), #129a, #131, #132
**Fulfills:** Item 7 of §9 Implementation Checklist of Prompt #129 ("Install Socket.dev or Snyk into the GitHub Advanced Security configuration for the ViaConnect repository")
**Status:** Active — authorizes Claude Code to execute the Socket.dev GitHub App installation per §6 below, subject to Gary's explicit approval in the accompanying prompt thread
**Bundle ID affected:** com.farmceutica.viaconnect

---

## 1. Purpose & Scope

Prompt #131 (Sherlock External-Repository Evaluation Template) §4.9 requires every Sherlock evaluation to produce a Known Vulnerabilities assessment covering `npm audit` findings, GitHub Security Advisories, Socket.dev report summary, Snyk advisory findings, and CVE database hits. Until a supply-chain security scanner is actually integrated into the ViaConnect repository, Sherlock's §4.9 section operates with a material evidence gap — relying on `npm audit` alone, which catches known CVEs in already-published packages but does not detect pre-publication supply-chain signals (new maintainers, install-time script changes, typosquats, dependency confusion, recent account takeovers).

This prompt authorizes the installation of one primary supply-chain scanner (Socket.dev, per the §2 decision below) and documents the integration points, PR-blocking policy, alert routing, and ongoing ownership for the tool. It does not authorize the installation of a second, complementary tool — if Snyk or any alternative is later considered, that is a separate follow-on prompt.

The installation touches the following protected paths under Prompt #129 §3: `.github/workflows/**` (new workflow file for Socket.dev's CI integration), the GitHub repository settings (GitHub App installation), and potentially `package.json` (if Socket.dev requires a local dev dependency). All three modifications are authorized under this prompt's §§6 and 7 per the "fully authored in the current prompt" provision of #129 §3.

---

## 2. Decision: Socket.dev vs. Snyk

### 2.1 The two candidates

**Socket.dev** is a supply-chain security product specifically designed for the pre-publication threat surface: new maintainers, install-script changes, network access in build steps, typosquatting, dependency confusion, and maintainer-takeover signatures. It operates primarily as a GitHub App that scans pull requests and package manifest changes, flagging suspicious changes before a new package version lands in `node_modules`.

**Snyk** is a broader application security platform covering known-CVE surveillance for dependencies, container image scanning, Infrastructure-as-Code (IaC) scanning, and license compliance. Its core dependency-scanning capability competes with GitHub's native Dependabot. Snyk has a larger product surface than Socket.dev and correspondingly more operational complexity.

### 2.2 Evaluation against the ViaConnect threat model

The threat model articulated in Prompt #129 §2.2 is dominated by supply-chain attacks via the npm ecosystem: event-stream (2018), ua-parser-js (2021), tj-actions/changed-files (March 2025), Shai-Hulud / @ctrl/tinycolor (September 2025). These incidents share a common pattern: a legitimate package is compromised — via maintainer credential phishing, account takeover, or dependency confusion — and a malicious version is pushed to the registry. The critical defense window is before `npm install` pulls the compromised version onto a developer or CI machine.

| Threat vector | `npm audit` alone | Socket.dev | Snyk |
|---|---|---|---|
| Known published CVEs | ✓ | ✓ | ✓ |
| New maintainer on existing package | ✗ | ✓ | partial |
| Sudden addition of install scripts | ✗ | ✓ | ✗ |
| Typosquat / dependency confusion | ✗ | ✓ | partial |
| Network access in build step | ✗ | ✓ | ✗ |
| Maintainer-takeover signature patterns | ✗ | ✓ | ✗ |
| Container image CVEs | ✗ | ✗ | ✓ |
| IaC misconfigurations | ✗ | ✗ | ✓ |
| License compliance | ✗ | partial | ✓ |

The threat vectors Prompt #129 was explicitly designed around — maintainer compromise, install-time code execution, typosquats — are Socket.dev's core competency and are materially weaker coverage areas for Snyk. Conversely, Snyk's strengths (containers, IaC) are less relevant to the current ViaConnect stack: ViaConnect's deployment surface is Vercel-managed (no self-managed containers) and its infrastructure is largely Supabase-managed (limited IaC scanning surface).

### 2.3 Recommendation

**Primary tool:** Socket.dev. Installed as a GitHub App on the ViaConnect repository, configured to comment on and optionally block pull requests that introduce supply-chain risk signals. This closes the single largest evidence gap in Sherlock's §4.9 workflow.

**Secondary tool:** None at this time. Snyk or equivalent CVE-surveillance tools may be considered later if the container or IaC surface grows. GitHub's native Dependabot (already available, free, and enabled by default on most GitHub plans) provides adequate CVE surveillance for the current ViaConnect dependency graph and is already understood to be in effect.

**Freshness caveat.** Socket.dev's feature set, pricing tiers, integration options, and GitHub App permissions evolve continuously. The §6 installation steps below describe the policy intent and the governance requirements; Claude Code must verify the current Socket.dev documentation at `https://docs.socket.dev/` and `https://github.com/apps/socket-security` at execution time and reconcile the policy with current product capabilities before proceeding. Any material discrepancy between this prompt's assumptions and current Socket.dev behavior is a Gary escalation.

---

## 3. Integration Points with Existing Prompts

### 3.1 Prompt #131 §4.9 (Known Vulnerabilities)

Once Socket.dev is integrated, the "Socket.dev report summary" field in Prompt #131 §4.9's evidence list is no longer marked "not yet installed in ViaConnect." Sherlock's evaluations produced after the Socket.dev installation date must include:

- A Socket.dev scan output for the evaluated repository (run via the Socket.dev public API or website lookup: `https://socket.dev/npm/package/<package-name>`)
- An interpretation of each flagged signal (if any) in the evaluation rationale

This is operational detail for Sherlock and does not require amendment of Prompt #131's source text — §4.9 of #131 already anticipates this transition.

### 3.2 Prompt #129 §3 (Protected Paths)

The installation creates a new file at `.github/workflows/socket-security.yml` (exact filename per Socket.dev's current recommendation — verify). This file is in a protected path. The authoring-source content for this file appears in §6.3 of this prompt and is the only legitimate content for this file per Prompt #129 §3. Any subsequent modification of that workflow file requires a new prompt-level authorization.

### 3.3 Prompt #129a §6.4 (Domain-Specialist Inheritance)

Hannah, Arnold, and LEX™ (and by #129a's extension, Gordon, Hounddog agent, and Marshall) do not independently interact with Socket.dev. Socket.dev findings surface in pull requests and in Sherlock's evaluation artifacts; domain-specialist sub-agents consume those findings via the normal Sherlock → Michelangelo chain.

### 3.4 Prompt #132 §4 (Universal Governance Block)

The universal governance block in §4 of Prompt #132 does not need amendment — it already covers all protected paths and all tool interactions. Socket.dev integration is a specific instantiation of the existing framework.

---

## 4. PR-Blocking Policy

When Socket.dev flags a pull request with a supply-chain risk signal, the following policy applies. This policy is authored in-prompt and, once approved, is the canonical enforcement rule for Socket.dev findings on the ViaConnect repository.

### 4.1 Severity tiers

Socket.dev assigns risk signals across multiple categories (supply-chain, quality, maintenance, vulnerability, license). For ViaConnect, map these to three action tiers:

**Tier 1 — Hard block (merge prohibited):**

- Any "supply chain risk" signal: known malware, typosquat, dependency confusion, suspected account takeover
- Any "critical" severity vulnerability signal
- Any "install script" signal on a newly-added package (because install scripts are the primary exfiltration path per Prompt #129 §2)
- Any "network access" signal on a newly-added package

**Tier 2 — Soft block (requires Gary override):**

- Any "high" severity vulnerability signal
- Any "new maintainer" signal on a package whose existing maintainer account was established
- Any "unmaintained" signal on a package proposed for addition
- Any "license" signal flagging GPL, AGPL, SSPL, BSL, or Elastic license

**Tier 3 — Inform only (no merge impact, logged in PR):**

- "Quality" signals (test coverage, documentation, code smell)
- "Maintenance" signals on existing dependencies (not on newly-added packages)
- "Medium" or "low" severity vulnerability signals

### 4.2 Override mechanism

Tier 2 soft blocks require explicit Gary approval comment on the pull request with specific text (e.g., `/socket-override approved — reviewed by Gary per Prompt #133 §4.2`). The override text itself is logged permanently by GitHub on the PR, creating an audit record for the exception.

Tier 1 hard blocks have **no merge override**. If Tier 1 is flagged, the correct response is either (a) select a different package, (b) pin to a pre-incident version with explicit documentation, or (c) re-derive the pattern in ViaConnect code per Tier C. An authorized Tier 1 override would require a new prompt in the library explicitly amending this §4.2 for the specific case, which is a higher bar than most Tier 1 situations justify.

### 4.3 Interaction with Michelangelo's OBRA

Any pull request carrying a Socket.dev flag that is not resolved (Tier 1 hard block) or explicitly overridden (Tier 2 soft block) fails Michelangelo's OBRA Review phase per Prompt #129 §5.3 Point 13 (External Provenance Integrity). The PR cannot merge even if the Socket.dev flag is technically bypassable — OBRA enforces independently.

---

## 5. Alert Routing & Ownership

### 5.1 Notification targets

Socket.dev alerts route to the following destinations:

- **Pull request comments** — automatic, on every scan. This is the primary surface for in-flow triage.
- **Gary's email (`gary@farmceuticawellness.com`)** — for Tier 1 hard blocks only. Tier 2 routes through the PR-comment surface; Gary sees them only when a PR is waiting on his override.
- **Jeffery's context** — via a weekly digest produced by Claude Code summarizing all Socket.dev activity on the repository in the prior seven days. This digest is authored as a markdown artifact in `ViaConnect Research Artifacts / Socket / YYYY-MM-DD_weekly_digest.md` and referenced (not ingested) by Jeffery.

### 5.2 Ownership

- **Day-to-day triage:** Claude Code (acting under Jeffery's dispatch) for the routine PR-comment review.
- **Tier 1 escalation decisions:** Gary, with optional consultation with Thomas Rosengren (CTO) for technical tradeoffs and Steve Rica (Compliance) for license-related flags.
- **Configuration changes to Socket.dev itself** (rule additions, scope changes): Gary only, via explicit prompt in the library.

### 5.3 Integration with existing FarmCeutica role network

Socket.dev findings affecting MAP enforcement tooling may additionally require LEX™ review (per #132 §5.6) if the finding could impact litigation posture — e.g., a license violation in a tool used in evidence-gathering workflows. This routing is via Gary's judgment and is not automated.

---

## 6. Installation Procedure

### 6.1 Preconditions

Before execution:

- Gary has issued explicit approval of this prompt in the accompanying thread.
- Gary is available for any GitHub App authorization prompt (the installation will require an OAuth consent step that only Gary can complete as the repository owner).
- Claude Code has verified current Socket.dev documentation at `https://docs.socket.dev/` and flagged any material discrepancy with this prompt's assumptions.
- The ViaConnect repository has at least one pull request open (or Claude Code is prepared to open a no-op PR) so that the initial Socket.dev scan can be observed and validated.

### 6.2 Installation steps

The mechanical steps below are the policy-authorized sequence. Claude Code verifies each against current Socket.dev documentation at execution time and flags any deviation to Gary before proceeding.

1. Navigate to the Socket.dev GitHub App listing at `https://github.com/apps/socket-security` (verify URL is current).
2. **Install to the ViaConnect repository only** — not organization-wide, unless Gary has separately authorized organization-wide installation. This restricts the initial blast radius.
3. **Grant minimum necessary permissions** per Socket.dev's current permission prompt. Decline any broader-than-necessary permissions and flag to Gary if the minimum necessary is broader than "read pull requests, write pull request comments, read repository metadata."
4. **Verify the initial scan runs** on the next pull request (or on the designated test PR) and posts a comment.
5. **Confirm the scan output format** and ensure it is readable/actionable.
6. **Configure branch protection rule** (main branch): add "Socket Security" as a required status check. This activates the Tier 1 hard-block behavior in §4.1. This step is a repository settings change that Gary must execute — Claude Code cannot modify branch protection rules without admin-level repository access that should not be granted to Claude Code.
7. **Open a Socket.dev settings page** and configure the organization-level rule set to match the §4.1 tier mapping, as closely as Socket.dev's current configuration surface allows. Any gap between §4.1's policy intent and what Socket.dev can actually enforce is documented in the final verification artifact.

### 6.3 Authoring-source content for `.github/workflows/socket-security.yml`

If Socket.dev requires a workflow file (some CI integrations do, some do not — verify against current documentation), paste the following authored-in-prompt content. Do not copy any reference workflow from Socket.dev's documentation, community examples, or GitHub — use only the content below.

````yaml
# Provenance: authored in Prompt #133 §6.3 of the ViaConnect Prompt Library
# Purpose: invoke Socket.dev supply-chain scanner on pull requests per Prompt #133 §4
# Policy reference: Prompt #129 §3 (protected-path authoring), Prompt #133 §4 (PR-blocking policy)
# Re-derivation status: N/A — this file is original authoring, not a re-derivation

name: Socket Security

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write

jobs:
  socket-security:
    name: Socket Security Scan
    runs-on: ubuntu-latest
    steps:
      # Socket.dev's documented CI invocation goes here.
      # Claude Code fills this in at execution time from current
      # Socket.dev documentation, pinning any third-party actions
      # to full commit SHAs per Prompt #135 (do not use tag refs).
      # The action invocation itself is a Tier C reference — it is
      # the SHA-identified external action, not re-derived code.
      - name: Placeholder — verify Socket.dev current CI invocation
        run: |
          echo "Socket.dev CI integration invoked via GitHub App."
          echo "If a workflow-level invocation is current-documentation-preferred,"
          echo "Claude Code replaces this step with the Socket.dev-published action"
          echo "pinned to full commit SHA per Prompt #135."
````

If Socket.dev's current documentation recommends installation via GitHub App only (no workflow file needed), omit the creation of this workflow file entirely. Do not create a workflow file merely for consistency.

### 6.4 Authoring-source content for `CLAUDE.md` addition

Gary's existing `CLAUDE.md` (root agent-instruction file, protected path) should reference the Socket.dev installation so that any future Claude Code session is aware of it. Paste the following block into `CLAUDE.md` in an appropriate location (typically near existing standing-rule references):

````markdown
### Supply-chain security scanner

The ViaConnect repository runs Socket.dev as its primary supply-chain security scanner, installed per Prompt #133. Pull request scanning is automatic. Tier 1 findings (per Prompt #133 §4.1) hard-block merge; Tier 2 findings require explicit Gary override on the PR. Sherlock's §4.9 (Known Vulnerabilities) evaluations include Socket.dev scan output for any externally-evaluated package.

Do not disable Socket.dev on any pull request, branch, or repository-wide setting without an explicit prompt-library amendment superseding Prompt #133.
````

---

## 7. Verification

After installation, verify each of the following. A failure on any item requires remediation before the installation is considered complete.

1. **Socket.dev GitHub App is installed** on the ViaConnect repository. Visible at `https://github.com/organizations/<org>/settings/installations` or `https://github.com/settings/installations` (depending on account type).
2. **Branch protection rule enabled** on main (or the default branch) with Socket Security as a required status check.
3. **Test PR scan runs** and comments with a meaningful output within 5 minutes of PR open.
4. **Tier mapping documented** either in Socket.dev's dashboard configuration or in a fallback governance note if Socket.dev's current UI cannot express §4.1 exactly.
5. **Weekly digest artifact location created:** `ViaConnect Research Artifacts / Socket / YYYY-MM-DD_weekly_digest.md` (folder exists, first digest scheduled).
6. **`CLAUDE.md` block present:** `grep "Socket.dev" CLAUDE.md` returns a match.
7. **No other repositories affected:** if the install was accidentally organization-wide, Socket.dev is removed from non-ViaConnect repos and reinstalled with narrower scope.

---

## 8. Rollback Procedure

If any verification item fails or if Socket.dev behaves unexpectedly (e.g., excessive false positives that consume Gary's review time disproportionate to their value):

1. **Pause PR-blocking immediately** by removing Socket Security from the branch protection required-checks list. This converts Tier 1 hard blocks back to informational comments without uninstalling the scanner.
2. **Disable the GitHub App** via the repository settings if the scanner itself is problematic.
3. **Reopen any PRs** that were blocked and re-review them manually.
4. **Document the rollback** in a new prompt (tentatively #133a) that cites the specific failure mode and the remediation or replacement plan.

Do not delete any Socket.dev scan history. Historical scans may be needed as evidence in Sherlock re-evaluations even if the scanner is disabled going forward.

---

## 9. Ongoing Ownership

### 9.1 Review cadence

Socket.dev configuration is reviewed quarterly, aligned with Prompt #129's review schedule. Review items:

- False-positive rate over the quarter (Tier 1 and Tier 2 separately)
- Missed-signal incidents (supply-chain issues not caught by Socket.dev that should have been)
- Gary override frequency (a spike suggests §4.1 tier mapping needs tuning)
- Product updates from Socket.dev that materially change capability

### 9.2 Successor prompts anticipated

- **Prompt #133a** — issued only if Socket.dev behavior requires policy amendment (tier re-mapping, override rule changes)
- **Prompt for Snyk (future, optional)** — if container or IaC surface grows and CVE surveillance needs expand beyond what Dependabot provides

### 9.3 Account and billing ownership

Gary is the billing contact and account administrator for the Socket.dev installation. Claude Code has no authority to modify billing, upgrade tiers, or make payments. Any tier change requires a new prompt.

---

## 10. Knowledge-Cutoff Disclosure

The recommendations and installation steps in this prompt were authored against Claude's knowledge of Socket.dev as of late 2025 / early 2026. Key areas where current Socket.dev behavior may differ:

- The specific URL of the GitHub App listing
- The set of signals emitted by scans and their severity nomenclature
- The availability and syntax of org-level rule configuration
- Pricing tiers and any free-tier quota
- Whether a workflow file is still the recommended integration mechanism, or whether the GitHub App alone suffices
- The exact format of PR-comment output

Claude Code must verify each of the above at execution time against current documentation and flag any material discrepancy to Gary before completing installation. Material discrepancies require a Gary decision before proceeding; cosmetic differences (UI label changes, rearranged settings pages) proceed with minor adjustments noted in the verification artifact.

---

## 11. Document Control

| Field | Value |
|---|---|
| Prompt number | 133 |
| Title | Supply-Chain Security Scanner Integration (Socket.dev / Snyk) |
| Parent prompts | #129, #129a, #131, #132 |
| Author | Claude (under Gary Ferenczi's direction) |
| Date | 2026-04-24 |
| Delivery formats | `.md`, `.docx` |
| Destination | ViaConnect Prompt Library (Google Drive) |
| Fulfills | Item 7 of §9 of Prompt #129 |
| Primary tool recommended | Socket.dev (GitHub App) |
| Secondary tool | None at this time; Dependabot (native) remains in effect for CVE surveillance |
| Protected paths affected | `.github/workflows/socket-security.yml` (conditional), `CLAUDE.md`, repository branch protection settings |
| Classification | Infrastructure governance / External service authorization |

---

## 12. Acknowledgment

By approving this prompt in the accompanying thread and directing Claude Code to execute §6, Gary authorizes: (a) installation of the Socket.dev GitHub App on the ViaConnect repository with minimum necessary permissions; (b) creation of the `.github/workflows/socket-security.yml` file with the §6.3 authored-in-prompt content (if required by current Socket.dev documentation); (c) addition of the §6.4 block to `CLAUDE.md`; (d) configuration of branch protection on main to require Socket Security as a status check; (e) ongoing operation of the PR-blocking policy in §4 with the alert routing and ownership in §5.
