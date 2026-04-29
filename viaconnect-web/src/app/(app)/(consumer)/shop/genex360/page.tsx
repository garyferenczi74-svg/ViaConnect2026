/**
 * /shop/genex360 PLP per Prompt #141 v3 §5.2.
 * Variant B (testing) cards. The only category currently mapped to the
 * testing card variant. Per Gary's brand carve-out 2026-04-29, the
 * GeneX360 testing data line stays under the FarmCeutica brand even
 * though the consumer shop wrapper is Via Cura branded.
 */
import { ShopCategoryPage } from '@/components/shop/ShopCategoryPage'

export const metadata = {
    title: 'GeneX360 Testing and Diagnostics | Via Cura',
    description:
        'Genetic, hormone, and biological age testing for personalized protocols. FarmCeutica GeneX360 panels.',
}

export default async function GeneX360PlpPage() {
    return <ShopCategoryPage slug="genex360" />
}
