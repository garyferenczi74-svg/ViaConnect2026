/**
 * /shop/base-formulations PLP per Prompt #141 v3 §5.2.
 * Variant A (supplement) cards.
 */
import { ShopCategoryPage } from '@/components/shop/ShopCategoryPage'

export const metadata = {
    title: 'Base Formulations | Via Cura',
    description:
        'Core building blocks. The foundation of every Via Cura protocol.',
}

export default async function BaseFormulationsPlpPage() {
    return <ShopCategoryPage slug="base-formulations" />
}
