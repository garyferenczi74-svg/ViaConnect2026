/**
 * /shop/methylation-snp PLP per Prompt #141 v3 §5.2.
 * Variant A (supplement) cards. Hero category for the brand.
 */
import { ShopCategoryPage } from '@/components/shop/ShopCategoryPage'

export const metadata = {
    title: 'Methylation SNP Support | Via Cura',
    description:
        'Precision formulas targeting MTHFR, COMT, VDR, and 80+ genetic variants. Built for your biology.',
}

export default async function MethylationSnpPlpPage() {
    return <ShopCategoryPage slug="methylation-snp" />
}
