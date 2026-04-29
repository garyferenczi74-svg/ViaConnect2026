/**
 * /shop/advanced-formulas PLP per Prompt #141 v3 §5.2.
 * Variant A (supplement) cards.
 */
import { ShopCategoryPage } from '@/components/shop/ShopCategoryPage'

export const metadata = {
    title: 'Advanced Formulas | Via Cura',
    description:
        'Targeted protocols for performance, longevity, and health optimization.',
}

export default async function AdvancedFormulasPlpPage() {
    return <ShopCategoryPage slug="advanced-formulas" />
}
