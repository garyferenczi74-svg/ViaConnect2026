import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const MIGRATIONS_DIR = join(REPO_ROOT, 'supabase', 'migrations')
const M1 = '20260930230000_launch_vote_waitlist_columns.sql'
const M2 = '20260930230100_launch_vote_plan_codes_email.sql'

describe('launch vote migration shape', () => {
    const files = readdirSync(MIGRATIONS_DIR).filter((name) => name.endsWith('.sql')).sort()
    const m1 = readFileSync(join(MIGRATIONS_DIR, M1), 'utf8')
    const m2 = readFileSync(join(MIGRATIONS_DIR, M2), 'utf8')

    it('sorts after the shop waitlist migration and sets lock timeout without a commit', () => {
        expect(files.at(-2)).toBe(M1)
        expect(files.at(-1)).toBe(M2)
        expect(files.indexOf(M1)).toBeGreaterThan(files.indexOf('20260926200100_shop_product_waitlist.sql'))
        for (const sql of [m1, m2]) {
            expect(sql).toContain("set local lock_timeout = '5s'")
            expect(sql).not.toMatch(/^\s*COMMIT\s*;/m)
            expect(sql).not.toMatch(/^\s*BEGIN\s*;/m)
        }
    })

    it('keeps client inserts from writing a vote and grants the cast function to authenticated', () => {
        expect(m1).toContain('new.voted_at := null')
        expect(m1).toContain('shop_cast_launch_vote')
        expect(m1).toContain('grant execute on function public.shop_cast_launch_vote(uuid, text) to authenticated')
        expect(m1).toContain('revoke all on function public.shop_cast_launch_vote(uuid, text) from public, anon')
    })

    it('stores order scope, the confirm email kind, and a service-role release', () => {
        expect(m2).toContain("order_scope in ('first_order', 'next_order')")
        expect(m2).toContain('vote_confirm')
        expect(m2).toContain('shop_launch_vote_top3')
        expect(m2).toContain('grant execute on function public.shop_launch_vote_top3(integer) to anon, authenticated')
        expect(m2).toContain('shop_admin_release_product')
        expect(m2).toContain("interval '7 days'")
        expect(m2).toContain("v_category = 'test_kit' and v_product_type = 'test_kit'")
        expect(m2).toContain('grant execute on function public.shop_admin_release_product(uuid, uuid) to service_role')
    })
})
