# Sherlock external-repository evaluation template (v1.0)

**Authority:** §12 of Prompt #131 (operationalizes §6.3 of Prompt #129).
**Usage:** Sherlock copies the fenced block below at the start of every external-repository evaluation, replaces every `[bracketed]` field, and saves the result to the Drive destination named in `README.md`.

Do not delete section headers. Do not paraphrase the verbatim text in §4.10 — exact match is required per §6.3 of Prompt #129 and enforced by §4.10 of Prompt #131. Partial artifacts are blocker-level gate failures.

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
