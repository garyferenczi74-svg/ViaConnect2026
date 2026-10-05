/**
 * Browser mount of the real ProductCard and the PDP hero LaunchVotePill.
 * Shop Playwright loads the Vite bundle. No dev server.
 */
import { createRoot } from 'react-dom/client'
import { LaunchVotePill } from '@/components/shop/LaunchVotePill'
import { ProductCard } from '@/components/shop/ProductCard'
import type { ShopProduct } from '@/lib/shop/queries'
import type { LaunchVoteCardModel } from '@/lib/shop/launch-vote/types'

const BOTTLE =
    'data:image/svg+xml,' +
    encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400">
          <rect width="300" height="400" fill="#ffffff"/>
          <rect x="118" y="28" width="64" height="36" rx="8" fill="#c5c9ce"/>
          <rect x="78" y="70" width="144" height="280" rx="28" fill="#d7dde3"/>
          <rect x="92" y="150" width="116" height="150" rx="8" fill="#f4f7f8"/>
          <text x="150" y="210" text-anchor="middle" font-family="Inter,sans-serif" font-size="18" fill="#224852">Balance+</text>
          <text x="150" y="234" text-anchor="middle" font-family="Inter,sans-serif" font-size="11" fill="#76866F">Gut Repair</text>
        </svg>`,
    )

const vote: LaunchVoteCardModel = {
    signedIn: true,
    votingEnabled: true,
    votedProductIds: [],
    top3: [],
    hasPriorPaidOrder: null,
}

function product(): ShopProduct {
    const bottle = document.documentElement.dataset.bottle
    const image = bottle && bottle.length > 0 ? bottle : BOTTLE
    const darkBottle = Boolean(bottle)
    return {
        id: darkBottle ? 'mthfr-plus' : 'balance-plus',
        sku: darkBottle ? 'MTHFR-PLUS' : 'FC-BALANCE-PLUS',
        slug: darkBottle ? 'mthfr-plus-folate-metabolism' : 'balance-plus-gut-repair',
        name: darkBottle ? 'MTHFR+ Folate Metabolism' : 'Balance+ Gut Repair',
        short_name: darkBottle ? 'MTHFR+' : 'Balance+',
        summary: darkBottle ? null : 'Not catalog data',
        description: darkBottle ? null : 'Not catalog data',
        format: 'capsule',
        category: 'supplement',
        category_slug: darkBottle ? 'methylation-snp' : 'advanced-formulas',
        price: 98.88,
        price_msrp: null,
        pricing_tier: 'L1',
        image_url: image,
        image_urls: [image],
        status_tags: null,
        testing_meta: null,
        snp_targets: null,
        bioavailability_pct: null,
        product_type: 'supplement',
        ingredients: null,
        gene_match_score: null,
        requires_practitioner_order: false,
        active: true,
        display_config: null,
        is_released: false,
    }
}

function CardSurface() {
    return (
        <div className="sash-shell">
            <div className="sash-shop">
                <div className="sash-plp" data-testid="sash-grid">
                    <ProductCard
                        product={product()}
                        variant="supplement"
                        href="/shop/product/balance-plus-gut-repair"
                        isFormulationOpen={false}
                        onToggleFormulation={() => undefined}
                        waitlist={{ signedIn: true, joined: false }}
                        vote={vote}
                    />
                </div>
            </div>
        </div>
    )
}

function PdpSurface() {
    const item = product()
    return (
        <div className="sash-shell">
            <div className="sash-shop">
                <div className="sash-pdp" data-testid="sash-grid">
                    <LaunchVotePill
                        productId={item.id}
                        productName={item.name}
                        productPath="/shop/product/balance-plus-gut-repair"
                        source="pdp"
                        size="pdp"
                        pill={{ kind: 'rest', interactive: true, releaseDateLabel: null, topVoted: false }}
                        signedIn
                        votingEnabled
                        hasPriorPaidOrder={null}
                    >
                        <div
                            className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-white shadow-md"
                            data-testid="pdp-photo"
                        >
                            <img alt={item.name} src={BOTTLE} />
                        </div>
                    </LaunchVotePill>
                </div>
            </div>
        </div>
    )
}

const rootNode = document.getElementById('root')
if (rootNode) {
    const surface = document.documentElement.dataset.sashSurface
    createRoot(rootNode).render(surface === 'pdp' ? <PdpSurface /> : <CardSurface />)
}
