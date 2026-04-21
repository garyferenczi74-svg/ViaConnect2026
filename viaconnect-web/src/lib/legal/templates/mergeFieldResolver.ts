// Prompt #104 Phase 3: Template merge-field resolver.
//
// Templates use {{field}} placeholders. The resolver:
//   - finds every {{field}} in the body (single source of truth)
//   - looks up each in the supplied context map
//   - returns merged body + list of missing fields
//   - rejects body that still contains unresolved placeholders if
//     `strict` is true (the API uses strict=true; preview UI uses
//     strict=false to surface what would be missing)
//
// Pure function. No DB, no IO. Used by lib/legal/enforcement/cdLetterBuilder.ts
// in Phase 4.

const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

export interface MergeFieldContext {
  // Flat map of field-name to string value. Nested fields use dot
  // notation in the template (e.g., {{counterparty.display_label}})
  // but are looked up via the flat map for simplicity; the API
  // builds the flat map by walking the case + counterparty + product
  // records.
  [key: string]: string | number | null | undefined;
}

export interface MergeResult {
  body: string;
  missing: string[];
  unresolved_placeholders: string[];
}

export interface MergeOptions {
  strict?: boolean;
}

export function resolveMergeFields(
  template_body: string,
  context: MergeFieldContext,
  options: MergeOptions = {},
): MergeResult {
  const missing = new Set<string>();
  const unresolved = new Set<string>();

  const body = template_body.replace(PLACEHOLDER_RE, (_match, key: string) => {
    const value = context[key];
    if (value === undefined || value === null || (typeof value === 'string' && value.length === 0)) {
      missing.add(key);
      unresolved.add(key);
      return options.strict ? '' : `{{${key}}}`;
    }
    return String(value);
  });

  if (options.strict && missing.size > 0) {
    throw new Error(`Template merge missing fields: ${[...missing].join(', ')}`);
  }

  return {
    body,
    missing: [...missing],
    unresolved_placeholders: [...unresolved],
  };
}

export function extractRequiredFields(template_body: string): string[] {
  const fields = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = PLACEHOLDER_RE.exec(template_body)) !== null) {
    fields.add(m[1]);
  }
  PLACEHOLDER_RE.lastIndex = 0;
  return [...fields];
}

export function validateRequiredFieldsCovered(args: {
  required_merge_fields: ReadonlyArray<string>;
  template_body: string;
}): { ok: boolean; declared_but_missing_in_body: string[]; in_body_but_undeclared: string[] } {
  const inBody = new Set(extractRequiredFields(args.template_body));
  const declared = new Set(args.required_merge_fields);
  const declared_but_missing_in_body = [...declared].filter((f) => !inBody.has(f));
  const in_body_but_undeclared = [...inBody].filter((f) => !declared.has(f));
  return {
    ok: declared_but_missing_in_body.length === 0 && in_body_but_undeclared.length === 0,
    declared_but_missing_in_body,
    in_body_but_undeclared,
  };
}
