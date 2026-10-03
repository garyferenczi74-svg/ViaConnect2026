/**
 * Brief 72: the live grid Description / Formulation controls reuse the Open pill.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { FormulationDropdown } from '@/components/shop/FormulationDropdown'
import { FullDescriptionLink } from '@/components/shop/FullDescriptionLink'
import { TestingMetaDropdown } from '@/components/shop/TestingMetaDropdown'
import { CONSUMER_OPEN_PILL_BASE, CONSUMER_OPEN_PILL_LINK } from '@/lib/ui/consumerChrome'

vi.mock('next/link', () => ({
    default: ({
        href,
        children,
        className,
        ...rest
    }: {
        href: string
        children?: ReactNode
        className?: string
    }) => createElement('a', { href, className, ...rest }, children),
}))

const linkSource = readFileSync(join(process.cwd(), 'src/components/shop/FullDescriptionLink.tsx'), 'utf8')
const formulationSource = readFileSync(join(process.cwd(), 'src/components/shop/FormulationDropdown.tsx'), 'utf8')
const testingSource = readFileSync(join(process.cwd(), 'src/components/shop/TestingMetaDropdown.tsx'), 'utf8')
const supplementBody = readFileSync(join(process.cwd(), 'src/components/shop/ProductCard.SupplementBody.tsx'), 'utf8')
const testingBody = readFileSync(join(process.cwd(), 'src/components/shop/ProductCard.TestingBody.tsx'), 'utf8')

const ingredients = [
    { name: 'Methylfolate', dose: 800, unit: 'mcg' },
    { name: 'Methylcobalamin', dose: 1000, unit: 'mcg' },
]

describe('live shop card open pills', () => {
    it('puts Description and Formulation on one wrapping row', () => {
        expect(supplementBody).toContain('flex min-w-0 flex-wrap gap-2')
        expect(testingBody).toContain('flex min-w-0 flex-wrap gap-2')
        expect(linkSource).toContain('stopPropagation')
        expect(linkSource).toContain('openPillClass(false)')
        expect(formulationSource).toContain('stopPropagation')
        expect(formulationSource).toContain('preventDefault')
        expect(formulationSource).toContain('onToggle()')
        expect(formulationSource).not.toContain('ChevronDown')
        expect(formulationSource).not.toContain('ChevronUp')
        expect(formulationSource).not.toContain('ArrowRight')
        expect(linkSource).not.toContain('ArrowRight')
        expect(testingSource).toContain('stopPropagation')
        expect(testingSource).toContain('Panel details coming soon')
        expect(formulationSource).toContain('Formulation details coming soon')
    })

    it('renders the description link as an Open pill without changing the route or label', () => {
        const html = renderToStaticMarkup(
            createElement(FullDescriptionLink, { slug: 'mthfr-plus', categorySlug: 'advanced-formulas' }),
        )
        expect(html).toContain('href="/shop/product/mthfr-plus/full"')
        expect(html).toContain('Description')
        expect(html).toContain('aria-label="Description for this product"')
        for (const token of CONSUMER_OPEN_PILL_BASE.split(/\s+/)) {
            expect(html, token).toContain(token)
        }
        for (const token of ['hover:border-[#5B8DEF]/55', 'hover:bg-[#2A4C9E]/20', 'focus-visible:ring-[#2DA5A0]/70', 'min-h-[44px]']) {
            expect(html, token).toContain(token)
        }
        expect(html).toContain('h-3.5')
        expect(html).toContain('text-white/80')
        expect(html).toContain('stroke-width="1.5"')
        expect(html).toContain('lucide-chevron-right')
        expect(html).not.toContain('lucide-arrow-right')
        expect(CONSUMER_OPEN_PILL_LINK.startsWith(CONSUMER_OPEN_PILL_BASE)).toBe(true)

        const panel = renderToStaticMarkup(
            createElement(FullDescriptionLink, { slug: 'genex-m', categorySlug: 'genex360' }),
        )
        expect(panel).toContain('Full Panel Details')
        expect(panel).toContain('href="/shop/product/genex-m/full"')
    })

    it('uses one blue active state and rotates a single chevron when formulation is open', () => {
        const closed = renderToStaticMarkup(
            createElement(FormulationDropdown, {
                ingredients,
                isOpen: false,
                onToggle: () => undefined,
            }),
        )
        expect(closed).toContain('Formulation')
        expect(closed).toContain('aria-expanded="false"')
        expect(closed).toContain('hover:bg-[#2A4C9E]/20')
        expect(closed).not.toContain('rotate-90')
        expect(closed).not.toContain('bg-[#2A4C9E]/30')
        expect(closed).toContain('stroke-width="1.5"')
        expect(closed).toContain('motion-reduce:transition-none')

        const open = renderToStaticMarkup(
            createElement(FormulationDropdown, {
                ingredients,
                totalMgPerServing: 1800,
                isOpen: true,
                onToggle: () => undefined,
            }),
        )
        expect(open).toContain('aria-expanded="true"')
        expect(open).toContain('rotate-90')
        expect(open).toContain('border-[#5B8DEF]/70')
        expect(open).toContain('bg-[#2A4C9E]/30')
        expect(open).toContain('bg-[#2A4C9E]/[0.12]')
        expect(open).toContain('Methylfolate')
        expect(open).toContain('Total per serving')
        expect(open).toContain('motion-reduce:transition-none')
        expect(open).not.toContain('lucide-chevron-down')
        expect(open).not.toContain('lucide-chevron-up')

        const empty = renderToStaticMarkup(
            createElement(FormulationDropdown, {
                ingredients: [],
                isOpen: false,
                onToggle: () => undefined,
            }),
        )
        expect(empty).toContain('Formulation details coming soon')
        expect(empty).toContain('aria-disabled="true"')
        expect(empty).not.toContain('<button')
    })

    it('restyles the testing-kit panel control with the same pill', () => {
        const html = renderToStaticMarkup(
            createElement(TestingMetaDropdown, {
                testingMeta: { what_is_tested: 'MTHFR', who_its_for: 'Adults', what_you_get: 'A report' },
                isOpen: true,
                onToggle: () => undefined,
            }),
        )
        expect(html).toContain('Panel Details')
        expect(html).toContain('What&#x27;s Tested')
        expect(html).toContain('rotate-90')
        expect(html).toContain('bg-[#2A4C9E]/30')
        expect(html).toContain('min-h-[44px]')
    })
})
