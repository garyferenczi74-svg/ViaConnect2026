/**
 * PdpFormulationTable renders the structured ingredient list as a clean
 * 2-column table per Prompt #148 §C. Used inline on the product detail
 * page rather than behind an accordion toggle.
 *
 * Subtle row separators (border-b border-white/10), no outer borders,
 * white/85 ingredient text, white/60 amount text. tabular-nums on the
 * amount column for vertical alignment of dose values across rows.
 */
import type { ShopProduct } from '@/lib/shop/queries'

interface PdpFormulationTableProps {
    ingredients: NonNullable<ShopProduct['ingredients']>
}

export function PdpFormulationTable({ ingredients }: PdpFormulationTableProps) {
    if (!ingredients || ingredients.length === 0) {
        return <p className="text-sm text-white/60">Formulation details coming soon.</p>
    }
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-white/15 text-xs uppercase tracking-wider text-white/45">
                        <th className="py-2 text-left font-medium">Ingredient</th>
                        <th className="py-2 text-right font-medium">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {ingredients.map((ing, idx) => (
                        <tr
                            key={`${ing.name}-${idx}`}
                            className="border-b border-white/10 last:border-b-0"
                        >
                            <td className="py-2.5 pr-3 text-white/85">
                                <span>{ing.name}</span>
                                {ing.role && (
                                    <span className="ml-2 text-xs text-white/50">{ing.role}</span>
                                )}
                            </td>
                            <td className="whitespace-nowrap py-2.5 pl-3 text-right tabular-nums text-white/60">
                                {ing.dose != null ? `${ing.dose} ${ing.unit ?? 'mg'}` : ''}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
