# Sherlock runtime templates

**Authority:** Prompt #131 (operationalizes §6.3 of Prompt #129).
**Scope:** Runtime artifact templates used by Sherlock when producing external-repository research outputs for the Jeffery → Michelangelo pipeline.

## Contents

| File | Purpose |
| --- | --- |
| `evaluation-template.md` | Blank fill-in template Sherlock copies at the start of each external-repository evaluation. Extracted verbatim from §12 of Prompt #131. |

## Authoritative source

The authoritative text of the template lives in `docs/prompts/prompt-131-sherlock-evaluation-template.md`, specifically §12. The files in this directory are working copies for Sherlock's convenience; if they ever drift from the authoritative §12, the authoritative source controls and the working copy is re-synchronized.

## Where finished artifacts go

Per Prompt #129 §6.3 and Prompt #131 §7, completed Sherlock artifacts never live in the ViaConnect repo. The default destination is:

```
Google Drive / ViaConnect Research Artifacts / Sherlock / External Repository Evaluations / YYYY-MM /
```

Naming convention: `[YYYY-MM-DD]__[owner]__[repo]__[short-commit-SHA7]__v[template-version].md`.

An INDEX.md in the parent Drive folder records one line per evaluation (date, repo, tier, confidence, link).

## When Sherlock copies the template

Per Prompt #131 §3, Sherlock fills out the template in full on:

1. First encounter with an external repo URL.
2. Major-version release of a previously-evaluated repo.
3. Maintainer change on a previously-evaluated repo.
4. Security incident touching a previously-evaluated repo.
5. Six-month staleness from the prior evaluation.

Partial artifacts, skipped sections, or "not applicable" declarations without explicit Gary approval are blocker-level OBRA Review gate failures.

## What must never change when Sherlock fills the template

- The fourteen-section structure (§§4.1 through §4.14).
- The verbatim non-signals language in §4.10 (Prompt #131 §4.10 requires exact text; any paraphrase fails the section).
- The tier-classification decision tree in §4.12.
- The hard-fail conditions in §6.

## Template versioning

This directory currently holds template version **1.0** (introduced by Prompt #131). Future revisions are issued as new lettered prompts (#131a, #131b, ...) or as a new integer prompt for a major version bump. Each Sherlock artifact records the template version it used in §4.1 so older artifacts can be interpreted in their original context.
