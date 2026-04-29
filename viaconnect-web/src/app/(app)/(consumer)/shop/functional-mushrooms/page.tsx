/**
 * /shop/functional-mushrooms PLP per Prompt #141 v3 §5.2.
 * Variant A (supplement) cards.
 */
import { ShopCategoryPage } from '@/components/shop/ShopCategoryPage'

export const metadata = {
    title: 'Functional Mushrooms | Via Cura',
    description:
        'Adaptogenic mushroom extracts for immune, cognitive, and metabolic support.',
}

export default async function FunctionalMushroomsPlpPage() {
    return <ShopCategoryPage slug="functional-mushrooms" />
}
