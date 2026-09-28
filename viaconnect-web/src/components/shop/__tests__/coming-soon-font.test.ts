/**
 * The overlay face is a local OFL woff2, not a next/font/google fetch.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const FONT_MODULE = join(process.cwd(), 'src/components/shop/coming-soon-font.ts')
const FONT_FILE = join(process.cwd(), 'src/components/shop/fonts/playfair-display-latin-600.woff2')
const LICENSE = join(process.cwd(), 'src/components/shop/fonts/OFL.txt')

describe('coming soon font', () => {
    it('points next/font/local at the vendored woff2 and the OFL', () => {
        const source = readFileSync(FONT_MODULE, 'utf8')
        expect(source).toMatch(/import localFont from 'next\/font\/local'/)
        expect(source).not.toMatch(/from 'next\/font\/google'/)
        expect(source).toContain('./fonts/playfair-display-latin-600.woff2')
        expect(source).toContain("weight: '600'")
        expect(source).toContain("style: 'normal'")
        expect(source).toContain("'--font-coming-soon'")
        expect(existsSync(FONT_FILE)).toBe(true)
        const bytes = readFileSync(FONT_FILE)
        expect(bytes.subarray(0, 4).toString('ascii')).toBe('wOF2')
        expect(bytes.length).toBeGreaterThan(1000)
        const license = readFileSync(LICENSE, 'utf8')
        expect(license).toContain('SIL Open Font License')
        expect(license).toContain('Playfair Display')
    })
})
