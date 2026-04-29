/**
 * FormatIndicator renders the lowercase parenthesized format string on
 * supplement cards per Prompt #141 v3 §4.2 slot 2. Examples: (capsule),
 * (tincture), (liposomal), (powder), (sublingual), (gummy), (cream),
 * (patch). Source: products.format text.
 *
 * Renders nothing when format is empty/null. Injection and Nasal Spray
 * format strings can also reach this component for non-peptide SKUs
 * (peptide SKUs are filtered at the query layer per spec §1B and §7.1).
 */

interface FormatIndicatorProps {
    format: string | null | undefined
    className?: string
}

export function FormatIndicator({ format, className }: FormatIndicatorProps) {
    if (!format || !format.trim()) return null
    const lowercase = format.trim().toLowerCase()
    return <span className={className ?? 'text-sm text-white/60'}>({lowercase})</span>
}
