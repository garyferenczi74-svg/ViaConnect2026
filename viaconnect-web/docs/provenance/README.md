# Provenance citation templates

**Authority:** Prompt #129 §7 — External Repository Governance Policy
**Scope:** Every file re-derived under Tier C from an external pattern must carry a provenance citation header.

These templates are the canonical header blocks for each file type. They are sourced from Prompt #129 §7 (an internal ViaConnect prompt) and are not copied from any external style guide.

## When to use

Add the appropriate header to any ViaConnect file whose pattern, architecture, or approach was extracted from an external repository and re-derived from scratch by Michelangelo under OBRA review. See Prompt #129 §4.3 for the definition of Tier C.

## When not to use

- Files authored entirely in the current prompt with no external provenance: no header needed.
- Files copied from an external source: prohibited under Tier D. Abandon or re-derive under Tier C.
- Files referenced for education only (Tier A): no repo file is produced, so no header applies.

## Templates

| File type | Template file |
| --- | --- |
| TypeScript / JavaScript / TSX / JSX | `header-template-ts.md` |
| SQL / Supabase migrations | `header-template-sql.md` |
| YAML / configuration | `header-template-yaml.md` |
| Markdown documentation | Use a `> Provenance:` block quote at the bottom of the document; do not use a header comment. |

## Required fields

Every provenance header must include:

- **Source URL:** canonical repo URL (HTTPS, no auth tokens)
- **Commit SHA:** 40-character commit hash at time of review
- **File path:** path within the source repo
- **License:** SPDX identifier (MIT, Apache-2.0, BSD-3-Clause, ISC preferred; GPL/AGPL requires Gary + Steve Rica sign-off per §8.1)
- **Date reviewed:** YYYY-MM-DD
- **Sherlock research artifact:** prompt number or drive link where the evaluation lives
- **Re-derivation author:** Michelangelo via OBRA under Prompt #[N]
- **Verbatim copy attestation:** "None (Audit-phase attested)" — required per §5.4

## What the verbatim-copy line means

Per Prompt #129 §5.4, Michelangelo runs a verbatim-match scan at the Audit phase. Any contiguous match of 10+ tokens with the cited source, excluding standard language keywords and non-copyrightable API signatures, fails Audit and requires re-derivation. The "Verbatim copy: None" line is the attestation that this scan passed.
