# TypeScript / JavaScript / TSX / JSX provenance header

Paste the following block at the very top of any Tier C re-derived `.ts`, `.tsx`, `.js`, or `.jsx` file, above all imports.

````typescript
/**
 * Pattern adapted from: https://github.com/[owner]/[repo]
 * Original commit SHA: [40-char SHA]
 * Original file path: [path/to/file.ts]
 * Original license: [MIT | Apache-2.0 | BSD-3-Clause | ISC | etc.]
 * Date reviewed: [YYYY-MM-DD]
 * Sherlock research artifact: Prompt #[N] / [drive link]
 * Re-derivation: Michelangelo via OBRA under Prompt #[N]
 * Verbatim copy: None (Audit-phase attested)
 */
````

## Filled example

````typescript
/**
 * Pattern adapted from: https://github.com/example-org/react-virtual-list
 * Original commit SHA: 3f6b2a8c1e4d9f0e2b5c7a9d8e1f4b6c3a5d7e9f
 * Original file path: src/useVirtual.ts
 * Original license: MIT
 * Date reviewed: 2026-04-23
 * Sherlock research artifact: Prompt #131
 * Re-derivation: Michelangelo via OBRA under Prompt #131
 * Verbatim copy: None (Audit-phase attested)
 */
import { useEffect, useRef, useState } from "react";
// ...rest of the ViaConnect re-derivation
````

## Notes

- Place the block at the very top of the file, above `"use client"` if present.
- Do not translate the fields into other languages.
- The SHA is the commit hash, not a tag name; tags can be moved or deleted.
- `Verbatim copy: None (Audit-phase attested)` is required per §5.4 of Prompt #129.
