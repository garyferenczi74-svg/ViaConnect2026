// Brief 16: source / date / kit when the upload row is known.
// GET /api/genetics/variants previously omitted kit and date.
// No SNP math. No em or en dashes.

export interface VariantProvenance {
  source: string | null;
  date: string | null;
  kit: string | null;
}

export function isoDateOnly(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 10);
}

export function buildVariantProvenance(args: {
  provider?: string | null;
  uploadCreatedAt?: string | null;
  variantCreatedAt?: string | null;
  brandedProductCode?: string | null;
}): VariantProvenance {
  return {
    source:
      typeof args.provider === 'string' && args.provider.trim()
        ? args.provider.trim()
        : null,
    date: isoDateOnly(args.uploadCreatedAt) ?? isoDateOnly(args.variantCreatedAt),
    kit:
      typeof args.brandedProductCode === 'string' && args.brandedProductCode.trim()
        ? args.brandedProductCode.trim()
        : null,
  };
}

export function formatVariantProvenance(
  provenance: VariantProvenance | null | undefined,
): string | null {
  if (!provenance) return null;
  const parts: string[] = [];
  if (provenance.source) parts.push(provenance.source);
  if (provenance.date) parts.push(provenance.date);
  if (provenance.kit) parts.push(provenance.kit);
  return parts.length > 0 ? parts.join(' · ') : null;
}
