# YAML / configuration provenance header

Paste the following block at the very top of any Tier C re-derived YAML configuration file, above all keys.

````yaml
# Pattern adapted from: https://github.com/[owner]/[repo]
# Original commit SHA: [40-char SHA]
# Original file path: [path]
# Original license: [SPDX]
# Date reviewed: [YYYY-MM-DD]
# Sherlock research artifact: Prompt #[N]
# Re-derivation: Michelangelo via OBRA under Prompt #[N]
# Verbatim copy: None (Audit-phase attested)
````

## Filled example

````yaml
# Pattern adapted from: https://github.com/example-org/gha-node-build-recipes
# Original commit SHA: 2d5f8a1c9e3b6f4d7a2c5e8b1d4f7a9c6e3b5a8f
# Original file path: .github/workflows/node-test.yml
# Original license: MIT
# Date reviewed: 2026-04-23
# Sherlock research artifact: Prompt #137
# Re-derivation: Michelangelo via OBRA under Prompt #137
# Verbatim copy: None (Audit-phase attested)

name: Node build
on:
  # ViaConnect-idiomatic re-derivation follows...
````

## Notes

- `.github/workflows/**` is a protected path per §3. Any Tier C re-derivation into this path requires full OBRA review plus the attestation that no verbatim content was copied.
- Third-party actions referenced from a workflow must be pinned to a full commit SHA, never a tag. This is Implementation Checklist item #9 (follow-on prompt).
- `Verbatim copy: None (Audit-phase attested)` is required per §5.4 of Prompt #129.
