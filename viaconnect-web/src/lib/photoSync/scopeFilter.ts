// Photo Sync prompt #110 §5.3: scope-predicate for the sync runner.
//
// Pure function, no I/O. Returns true if a candidate row passes every
// currently-active scope flag. Extracted from sync-supplement-photos.ts
// so it can be unit-tested without the script's top-level main()
// side effects firing.
//
// Semantics:
//   - --category=<v> / --service-category=<v>: case-insensitive substring
//     match against products.category. Chose substring over exact equality
//     so ergonomic flags like --category=SNP match the seed value
//     'snp_support' without the caller needing to know the exact slug.
//   - --product-type=<v>: case-insensitive exact match on products.product_type.
//     Tolerates columns that are absent or NULL (no-op pass) so the flag
//     is additive on schemas that haven't introduced product_type yet.

export interface ScopeFlags {
  category: string | null;
  product_type: string | null;
  service_category: string | null;
}

export interface ScopeableRow {
  category: string | null;
  product_type?: string | null;
}

export function rowPassesScope(r: ScopeableRow, flags: ScopeFlags): boolean {
  if (flags.category != null) {
    if (r.category == null) return false;
    if (!r.category.toLowerCase().includes(flags.category.toLowerCase())) return false;
  }
  if (flags.product_type != null) {
    const rt = r.product_type;
    // Pass if the column is absent/null; reject only when present and mismatched.
    if (rt != null && rt.toLowerCase() !== flags.product_type.toLowerCase()) return false;
  }
  if (flags.service_category != null) {
    if (r.category == null) return false;
    if (!r.category.toLowerCase().includes(flags.service_category.toLowerCase())) return false;
  }
  return true;
}
