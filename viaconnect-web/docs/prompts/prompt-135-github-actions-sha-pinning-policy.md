# Prompt #135 — Third-Party GitHub Actions SHA-Pinning Policy

**Project:** ViaConnect™ GeneX360™ Precision Wellness Platform
**Company:** FarmCeutica Wellness LLC
**Owner:** Gary Ferenczi, CEO & Founder
**Classification:** CI security policy / Forward-looking governance rule
**Parent prompts:** Prompt #129 (parent), #129a, #131 (especially §4.8), #132, #133
**Fulfills:** Item 9 of §9 of Prompt #129 — closed by establishing the forward-looking rule in §1. Existing un-pinned references migrate on next modification per §5.
**Status:** Active on memorialization in the Prompt Library

---

## 1. The Rule

Any file committed to `.github/workflows/**` or `.github/actions/**` in the ViaConnect repository must reference every third-party GitHub Action — **including first-party GitHub actions (`actions/*`)** — by **full 40-character commit SHA**, with the original semantic-version tag preserved as a trailing comment.

### 1.1 Canonical form

````yaml
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.1.7
````

### 1.2 Not permitted

````yaml
- uses: actions/checkout@v4                            # ✗ mutable tag
- uses: actions/checkout@main                          # ✗ branch reference
- uses: actions/checkout@11bd719                       # ✗ short SHA
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # ✗ missing version comment
````

### 1.3 Verification before pinning

Before pinning a new SHA, the person or agent performing the pin confirms:

- The SHA appears in the action's repository as a real commit on a release branch or tag
- The commit's content looks like a normal release (not a suspicious last-minute payload addition)
- Where available, GitHub displays the "Verified" badge on the commit
- The commit date is consistent with the upstream release date of the corresponding tag

A SHA that fails any of these checks is not pinned; a different (earlier, trusted) release is chosen, or the action is dropped entirely.

### 1.4 Scope of the trailing comment

The trailing comment after `#` carries the semantic version (`v4.1.7`) when one exists. When pinning a between-release commit, it carries a descriptor (`main @ 2026-04-24`, `security-patch-branch`). The SHA is authoritative; the comment is for human readability.

---

## 2. Threat Model (Brief)

### 2.1 The attack class this rule defeats

Tag references (`@v4`, `@main`) are mutable Git refs. A tag can be moved by the owner, or by an attacker who has compromised the owner's account, to point at any commit — including a malicious one. Every downstream workflow that references the tag begins executing the attacker's code on its next CI run.

Two well-documented precedents:

- **tj-actions/changed-files (March 2025)** — compromised version pushed to existing tags; thousands of CI pipelines exfiltrated secrets across the ecosystem
- **codecov-bash uploader (April 2021)** — modified uploader served from CDN; credentials from ~20,000 repositories exfiltrated

SHA references are immutable by Git's content-addressable design. A compromised new version gets a new SHA; existing pins are unaffected. Pinning does not make the referenced code safe — it only freezes the version so the trust decision is locked at pin time.

### 2.2 Why first-party `actions/*` is in scope

GitHub's account security is stronger than that of smaller maintainers, and no comparable incident has publicly affected `actions/*` owners. The rule includes them anyway because:

- Uniform policy is easier to enforce than one with exceptions
- Some `actions/*` actions execute with elevated permissions (repository contents, publishing); blast radius matters
- Dependabot handles SHA bumps for `actions/*` with low operational cost
- A future re-evaluation of scope is easier if the baseline is "pin everything"

---

## 3. Scope

### 3.1 In scope

- `.github/workflows/**` — every `uses:` reference
- `.github/actions/**` — composite actions authored in ViaConnect, including their own `uses:` references to external actions
- Reusable workflow references (`uses: owner/repo/.github/workflows/file.yml@ref`) — the `@ref` is a SHA, not a tag or branch

### 3.2 Out of scope (this prompt)

- Docker image tags in `run:` steps or `container:` blocks — deferred to a future prompt (tentatively #137)
- npm, pip, cargo, gem, and other package-manager dependencies — addressed by Prompt #133 via Socket.dev
- Shell script content inside `run:` steps — evaluated by Michelangelo's standard code-review surface, not by this rule

---

## 4. Enforcement

### 4.1 Michelangelo's OBRA Review phase

Prompt #129 §5.3 Point 13 (External Provenance Integrity) is extended, under this prompt's authority, to include SHA-pinning compliance as a blocker-level check. Any pull request that adds, modifies, or leaves in place a non-SHA `uses:` reference in a file it touches fails Review until the file is brought into compliance with §1.

"Touches" means any PR that modifies a workflow file is expected to bring the whole file into §1 compliance, not just the lines in its own diff. If the remediation scope is too large to combine with the functional change, the PR author opens a separate `chore(ci): SHA-pin [workflow name]` PR first, merges it, then rebases the functional change.

### 4.2 Sherlock — Prompt #131 §4.8

Sherlock's §4.8 (Agent-Instruction & CI Config Surface) already treats unpinned actions in externally-evaluated repositories as a risk signal. This prompt closes the self-consistency gap: ViaConnect's own workflows are now held to the same standard Sherlock applies when evaluating other repositories. An evaluator should not score ViaConnect itself worse than the standard Sherlock demands of external code.

### 4.3 Socket.dev — Prompt #133

Socket.dev evaluates the SHA it sees against its supply-chain risk database. A SHA pinned to a compromised commit surfaces through the Prompt #133 §4.1 tier mapping regardless of pinning discipline. SHA-pinning and Socket.dev are complementary: pinning defeats the tag-swap attack class, Socket.dev defeats the poisoned-version-at-pin-time class.

---

## 5. Forward-Looking Application

This prompt is policy, not procedure. It does not authorize or require a sweep audit of existing workflow files.

Existing references that do not comply with §1 are tech debt. Compliance is triggered by the first modification of any non-compliant file: when Claude Code, Michelangelo, or Gary next edits a workflow file under §4.1, that file is brought into full compliance with §1 before merge.

Gary's judgment is that the window during which un-pinned existing files continue operating is acceptable because:

- ViaConnect's active CI surface is small; modification frequency is high relative to the backlog size, so most files will naturally migrate within one to two quarters
- Pinning-on-modification is more sustainable than a one-time sweep followed by drift
- Socket.dev (Prompt #133) provides an independent detection channel for compromised external packages, reducing the residual risk during the migration window
- Any workflow file not modified within 180 days is flagged in the Prompt #129 quarterly review as a candidate for a standalone SHA-pin PR, preventing indefinite persistence of un-pinned references

---

## 6. Re-Pinning Discipline

### 6.1 When to re-pin

A pinned SHA is replaced only when one of the following applies:

- A security patch in the upstream action addresses a CVE in the pinned version
- ViaConnect needs a feature available only in a later version
- The action maintainer has announced deprecation of the pinned version
- A GitHub Actions runner compatibility break requires the update

### 6.2 When not to re-pin

Routine version-churn ("this action bumped from v4.1.7 to v4.1.8 with no meaningful change") is not a re-pin trigger. Each bump carries a fresh §1.3 verification cost without functional benefit. The default posture is pin-and-leave until a reason to change appears.

### 6.3 How re-pins are reviewed

Re-pins flow through the same OBRA Review phase as any other workflow change. The §1.3 verification is performed against the new SHA. Dependabot proposals for SHA bumps are treated as external proposals: they pass Socket.dev (per #133), then OBRA, before merge.

---

## 7. Document Control

| Field | Value |
|---|---|
| Prompt number | 135 |
| Title | Third-Party GitHub Actions SHA-Pinning Policy |
| Parent prompts | #129, #129a, #131, #132, #133 |
| Author | Claude (under Gary Ferenczi's direction) |
| Date | 2026-04-24 |
| Delivery formats | `.md`, `.docx` |
| Destination | ViaConnect Prompt Library (Google Drive) |
| Fulfills | Item 9 of §9 of Prompt #129 |
| Nature | Forward-looking policy — no audit, no sweep |
| Enforcement surfaces | Michelangelo OBRA Point 13; Sherlock #131 §4.8; Socket.dev per #133 |
| Protected paths governed | `.github/workflows/**`, `.github/actions/**` |
| Deferred to future prompt | Docker image tag pinning (tentatively #137) |

---

## 8. Acknowledgment

By memorializing this prompt in the Prompt Library, Gary establishes §1 as binding for all subsequent modifications to `.github/workflows/**` and `.github/actions/**` in the ViaConnect repository. Michelangelo's OBRA Review phase enforces compliance at PR level. Sherlock's Prompt #131 §4.8 standard now applies uniformly to ViaConnect's own workflows, closing the self-consistency gap that previously existed between Sherlock's evaluation of external code and the configuration of ViaConnect itself.

**Item 9 of Prompt #129 §9 is closed on memorialization.**
