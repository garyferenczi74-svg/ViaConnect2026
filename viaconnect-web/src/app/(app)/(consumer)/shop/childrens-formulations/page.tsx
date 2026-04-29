/**
 * /shop/childrens-formulations PLP per Prompt #141 v3 §5.2.
 * Variant A (supplement) cards.
 */
import { ShopCategoryPage } from '@/components/shop/ShopCategoryPage'

export const metadata = {
    title: "Children's Formulations | Via Cura",
    description:
        'Age-appropriate methylated nutrition for infants, toddlers, and children.',
}

export default async function ChildrensFormulationsPlpPage() {
    return <ShopCategoryPage slug="childrens-formulations" />
}
