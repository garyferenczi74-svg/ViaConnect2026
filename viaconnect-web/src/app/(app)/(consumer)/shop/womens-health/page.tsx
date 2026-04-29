/**
 * /shop/womens-health PLP per Prompt #141 v3 §5.2.
 * Variant A (supplement) cards.
 */
import { ShopCategoryPage } from '@/components/shop/ShopCategoryPage'

export const metadata = {
    title: "Women's Health | Via Cura",
    description:
        'Hormonal balance, prenatal, postnatal, and female wellness formulas.',
}

export default async function WomensHealthPlpPage() {
    return <ShopCategoryPage slug="womens-health" />
}
