import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LaunchVotesTable } from '@/components/admin/LaunchVotesTable'
import { ADMIN_LOOKUP_FAILED_COPY } from '@/lib/admin/erp-honesty'
import { ADMIN_PLAN_NOTE, ADMIN_RELEASE_CONFIRM, ADMIN_VOTES_EMPTY } from '@/lib/shop/launch-vote-copy'

const row = {
    productId: '22222222-2222-4222-8222-222222222222',
    name: 'Creatine Fixture',
    sku: 'FC-CREATINE-001',
    votes: 3,
    rank: 1,
    releaseDate: '2026-10-05',
    released: false,
    releasedAt: null,
    notifyRequestedAt: null,
}

describe('LaunchVotesTable', () => {
    it('shows the empty copy', () => {
        const html = renderToStaticMarkup(<LaunchVotesTable load={{ ok: true, rows: [] }} />)
        expect(html).toContain(ADMIN_VOTES_EMPTY)
    })

    it('shows product, votes, rank, and the release confirm copy', () => {
        const html = renderToStaticMarkup(<LaunchVotesTable load={{ ok: true, rows: [row] }} />)
        expect(html).toContain('Creatine Fixture')
        expect(html).toContain('FC-CREATINE-001')
        expect(html).toContain('>3<')
        expect(html).toContain('Top 3')
        expect(html).toContain('Mark released')
        expect(html).toContain('one single-use 25% code per voter')
        const asking = renderToStaticMarkup(
            <LaunchVotesTable load={{ ok: true, rows: [{ ...row, released: false }] }} />,
        )
        expect(asking).toContain('Mark released')
        expect(ADMIN_RELEASE_CONFIRM).toContain('one single-use 25% code per voter')
        expect(ADMIN_PLAN_NOTE).toContain('Phase 1: NAD+')
    })

    it('hides Mark released after the product is released', () => {
        const html = renderToStaticMarkup(
            <LaunchVotesTable
                load={{
                    ok: true,
                    rows: [{ ...row, released: true, releasedAt: '2026-10-01T00:00:00.000Z', rank: null }],
                }}
            />,
        )
        expect(html).not.toContain('Mark released')
        expect(html).toContain('Released')
    })

    it('shows the lookup failure copy', () => {
        const html = renderToStaticMarkup(<LaunchVotesTable load={{ ok: false, rows: [] }} />)
        expect(html).toContain(ADMIN_LOOKUP_FAILED_COPY)
    })
})
