/**
 * Colour and motion contract for coming-soon-metal.css.
 * Allowed colours are read from the file's own token declarations.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import tailwindConfig from '../../../../tailwind.config'
import approvedPalette from './coming-soon-palette.json'

const CSS_PATH = join(process.cwd(), 'src/components/shop/coming-soon-metal.css')
const IMPLEMENTATION_FILES = [
    'src/components/shop/ComingSoonOverlay.tsx',
    'src/components/shop/coming-soon-font.ts',
    'src/components/shop/coming-soon-motion.ts',
    'src/components/shop/useInViewPause.ts',
]

const KEYFRAME_PROPS = new Set(['transform', 'opacity', 'animation-timing-function'])

function stripComments(css: string): string {
    return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

function extractDeclarations(css: string): { name: string; value: string }[] {
    const decls: { name: string; value: string }[] = []
    const re = /(--(?:cs|jr)-[A-Za-z0-9-]+)\s*:/g
    let match: RegExpExecArray | null
    while ((match = re.exec(css))) {
        let index = match.index + match[0].length
        let depth = 0
        const start = index
        while (index < css.length) {
            const ch = css[index]
            if (ch === '(') depth += 1
            else if (ch === ')') depth -= 1
            else if ((ch === ';' || ch === '{') && depth === 0) break
            index += 1
        }
        decls.push({ name: match[1], value: css.slice(start, index).trim() })
        re.lastIndex = index
    }
    return decls
}

function normalizeHex(hex: string): string {
    return hex.toLowerCase()
}

function normalizeRgb(raw: string): string {
    return raw
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/\(\s+/g, '(')
        .replace(/\s+\)/g, ')')
        .replace(/\s*\/\s*/g, ' / ')
        .replace(/\s+,/g, ',')
        .replace(/,\s+/g, ', ')
}

function colorLiterals(text: string): string[] {
    const found: string[] = []
    const hex = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/g
    const rgb = /rgba?\(\s*[\d.]+%?(?:\s+[\d.]+%?){2}(?:\s*\/\s*[\d.]+%?)?\s*\)|rgba?\(\s*[\d.]+%?\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?(?:\s*,\s*[\d.]+%?)?\s*\)/gi
    for (const item of text.match(hex) ?? []) found.push(normalizeHex(item))
    for (const item of text.match(rgb) ?? []) found.push(normalizeRgb(item))
    return found
}

function channelTriple(value: string): string | null {
    const match = value.trim().match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)$/)
    if (!match) return null
    return `${match[1]} ${match[2]} ${match[3]}`
}

function allowedColours(css: string): Set<string> {
    const allowed = new Set<string>()
    for (const decl of extractDeclarations(css)) {
        if (!/^--(?:cs|jr)-/.test(decl.name)) continue
        for (const literal of colorLiterals(decl.value)) allowed.add(literal)
        if (/^--(?:cs|jr)-[\w-]*rgb$/.test(decl.name)) {
            const triple = channelTriple(decl.value)
            if (triple) allowed.add(triple)
        }
    }
    return allowed
}

interface AtBlock {
    header: string
    body: string
}

function extractAtBlocks(css: string, atName: string): AtBlock[] {
    const blocks: AtBlock[] = []
    const re = new RegExp(`@${atName}\\b`, 'g')
    let match: RegExpExecArray | null
    while ((match = re.exec(css))) {
        let index = match.index + match[0].length
        while (index < css.length && css[index] !== '{') index += 1
        const header = css.slice(match.index + match[0].length, index).trim()
        index += 1
        let depth = 1
        const start = index
        while (index < css.length && depth > 0) {
            if (css[index] === '{') depth += 1
            else if (css[index] === '}') depth -= 1
            index += 1
        }
        blocks.push({ header, body: css.slice(start, index - 1) })
        re.lastIndex = index
    }
    return blocks
}

function extractExactRule(css: string, selector: string): string {
    const re = new RegExp(`${selector.replace('.', '\\.')}\\s*\\{`, 'g')
    const match = re.exec(css)
    if (!match) throw new Error(`missing rule ${selector}`)
    let index = match.index + match[0].length
    let depth = 1
    const start = index
    while (index < css.length && depth > 0) {
        if (css[index] === '{') depth += 1
        else if (css[index] === '}') depth -= 1
        index += 1
    }
    return css.slice(start, index - 1)
}

function keyframeBodies(css: string): { name: string; blocks: string[] }[] {
    return extractAtBlocks(css, 'keyframes').map((block) => {
        const bodies: string[] = []
        let depth = 0
        let start = -1
        for (let index = 0; index < block.body.length; index += 1) {
            const ch = block.body[index]
            if (ch === '{') {
                if (depth === 0) start = index + 1
                depth += 1
            } else if (ch === '}') {
                depth -= 1
                if (depth === 0 && start >= 0) {
                    bodies.push(block.body.slice(start, index))
                    start = -1
                }
            }
        }
        return { name: block.header, blocks: bodies }
    })
}

function declarationProps(block: string): string[] {
    const props: string[] = []
    let depth = 0
    let start = 0
    const parts: string[] = []
    for (let index = 0; index <= block.length; index += 1) {
        const ch = block[index]
        if (ch === '(') depth += 1
        else if (ch === ')') depth -= 1
        else if ((ch === ';' || index === block.length) && depth === 0) {
            parts.push(block.slice(start, index))
            start = index + 1
        }
    }
    for (const part of parts) {
        const name = part.trim().match(/^([a-zA-Z-]+)\s*:/)
        if (name) props.push(name[1].toLowerCase())
    }
    return props
}

const NAMED_COLOURS = [
    'aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure', 'beige', 'bisque', 'black',
    'blanchedalmond', 'blue', 'blueviolet', 'brown', 'burlywood', 'cadetblue', 'chartreuse',
    'chocolate', 'coral', 'cornflowerblue', 'cornsilk', 'crimson', 'cyan', 'darkblue',
    'darkcyan', 'darkgoldenrod', 'darkgray', 'darkgreen', 'darkgrey', 'darkkhaki',
    'darkmagenta', 'darkolivegreen', 'darkorange', 'darkorchid', 'darkred', 'darksalmon',
    'darkseagreen', 'darkslateblue', 'darkslategray', 'darkslategrey', 'darkturquoise',
    'darkviolet', 'deeppink', 'deepskyblue', 'dimgray', 'dimgrey', 'dodgerblue', 'firebrick',
    'floralwhite', 'forestgreen', 'fuchsia', 'gainsboro', 'ghostwhite', 'gold', 'goldenrod',
    'gray', 'green', 'greenyellow', 'grey', 'honeydew', 'hotpink', 'indianred', 'indigo',
    'ivory', 'khaki', 'lavender', 'lavenderblush', 'lawngreen', 'lemonchiffon', 'lightblue',
    'lightcoral', 'lightcyan', 'lightgoldenrodyellow', 'lightgray', 'lightgreen', 'lightgrey',
    'lightpink', 'lightsalmon', 'lightseagreen', 'lightskyblue', 'lightslategray',
    'lightslategrey', 'lightsteelblue', 'lightyellow', 'lime', 'limegreen', 'linen',
    'magenta', 'maroon', 'mediumaquamarine', 'mediumblue', 'mediumorchid', 'mediumpurple',
    'mediumseagreen', 'mediumslateblue', 'mediumspringgreen', 'mediumturquoise',
    'mediumvioletred', 'midnightblue', 'mintcream', 'mistyrose', 'moccasin', 'navajowhite',
    'navy', 'oldlace', 'olive', 'olivedrab', 'orange', 'orangered', 'orchid',
    'palegoldenrod', 'palegreen', 'paleturquoise', 'palevioletred', 'papayawhip', 'peachpuff',
    'peru', 'pink', 'plum', 'powderblue', 'purple', 'rebeccapurple', 'red', 'rosybrown',
    'royalblue', 'saddlebrown', 'salmon', 'sandybrown', 'seagreen', 'seashell', 'sienna',
    'silver', 'skyblue', 'slateblue', 'slategray', 'slategrey', 'snow', 'springgreen',
    'steelblue', 'tan', 'teal', 'thistle', 'tomato', 'turquoise', 'violet', 'wheat', 'white',
    'whitesmoke', 'yellow', 'yellowgreen', 'currentcolor',
]

function tealPaletteHexes(): Set<string> {
    const found = new Set<string>()
    const teal = tailwindConfig.theme?.extend?.colors
    const bucket = teal && typeof teal === 'object' && 'teal' in teal ? teal.teal : undefined
    const walk = (value: unknown): void => {
        if (typeof value === 'string') {
            for (const item of value.match(/#[0-9A-Fa-f]{3,8}/g) ?? []) found.add(item.toLowerCase())
            return
        }
        if (value && typeof value === 'object') {
            for (const child of Object.values(value as Record<string, unknown>)) walk(child)
        }
    }
    walk(bucket)
    return found
}

function channelsToHex(literal: string): string | null {
    const match = literal.match(/^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)/)
    if (!match) return null
    return `#${[match[1], match[2], match[3]].map((part) => Number(part).toString(16).padStart(2, '0')).join('')}`
}

describe('coming soon css contract', () => {
    const css = stripComments(readFileSync(CSS_PATH, 'utf8'))

    it('keeps every colour literal inside a --cs or --jr token', () => {
        const allowed = allowedColours(css)
        expect(allowed.size).toBeGreaterThan(0)
        const literals = colorLiterals(css)
        expect(literals.length).toBeGreaterThan(0)
        const outside = literals.filter((literal) => !allowed.has(literal))
        expect(outside).toEqual([])
        for (const file of IMPLEMENTATION_FILES) {
            const source = readFileSync(join(process.cwd(), file), 'utf8')
            expect(source, file).not.toMatch(/#[0-9A-Fa-f]{3,8}\b/)
            expect(source, file).not.toMatch(/rgba?\(/)
            expect(source, file).not.toMatch(/hsla?\(/)
        }
    })

    it('matches the approved palette and rejects other colour functions', () => {
        const fromCss = [...allowedColours(css)].sort()
        const approved = [...approvedPalette.colours].sort()
        expect(fromCss).toEqual(approved)
        expect(css).not.toMatch(/hsla?\(/i)
        expect(css).not.toMatch(/oklch\(/i)
        expect(css).not.toMatch(/color-mix\(/i)
        const named = new RegExp(`(?<![\\w-])(?:${NAMED_COLOURS.join('|')})(?![\\w-])`, 'i')
        expect(css).not.toMatch(named)

        const sheen = extractExactRule(css, '.jr-sheen')
        const sheenColours = colorLiterals(sheen)
        expect(sheenColours.length).toBeGreaterThan(0)
        const teal = tealPaletteHexes()
        expect(teal.size).toBeGreaterThan(0)
        for (const literal of sheenColours) {
            const hex = literal.startsWith('#') ? literal : channelsToHex(literal)
            expect(hex, literal).toBeTruthy()
            expect(teal.has(hex ?? ''), literal).toBe(true)
        }
    })

    it('paints nothing on the overlay root', () => {
        const root = extractExactRule(css, '.cs-metal')
        expect(root).toMatch(/background:\s*none/)
        expect(root).not.toMatch(/backdrop-filter/)
        expect(root).not.toMatch(/(?<![\w-])filter\s*:/)
        expect(root).not.toMatch(/(?<![\w-])opacity\s*:/)
        expect(root).not.toMatch(/mix-blend-mode/)
        expect(css).not.toMatch(/\.cs-metal::before/)
        expect(css).not.toMatch(/\.cs-metal::after/)
    })

    it('paints no stroke and declares no stroke token', () => {
        expect(css).not.toContain('--cs-stroke')
        expect(css).not.toMatch(/var\(--cs-mint\)/)
        expect(css).not.toMatch(/var\(--cs-emerald\)/)
        expect(css).toContain('background-image: var(--cs-emerald-deep)')
        expect(css).toContain('background-image: var(--cs-emerald-hi)')
        const edge = extractExactRule(css, '.cs-edge .cs-line')
        expect(edge).toMatch(/color:\s*transparent/)
        expect(edge).toContain('text-shadow: var(--cs-shadow)')
        const strokes = [...css.matchAll(/-webkit-text-stroke\s*:\s*([^;]+)/g)].map((match) => match[1].trim())
        expect(strokes).toEqual(['0'])
    })

    it('tilts one line with a static rotate and hides the reflection', () => {
        expect(css).toMatch(/--cs-tilt:\s*-45deg/)
        expect(css).toMatch(/\.cs-word\s*\{[^}]*rotate:\s*var\(--cs-tilt\)/)
        expect(css).toMatch(/--cs-cx:\s*62%/)
        expect(css).toMatch(/--cs-cy:\s*69%/)
        expect(css).toMatch(/container-type:\s*size/)
        expect(css).toMatch(/--cs-fs:\s*clamp\(16px,\s*12\.5cqw,\s*72px\)/)
        const containers = extractAtBlocks(css, 'container')
        const wide = containers.find((block) => block.header.replace(/\s+/g, ' ').includes('min-aspect-ratio: 79/100'))
        expect(wide).toBeTruthy()
        expect(wide?.body).toContain('--cs-cy: 72%')
        expect(wide?.body).toMatch(/10\.6cqw/)
        expect(css).toMatch(/\.cs-line\s*\{[^}]*display:\s*inline-block/)
        expect(css).toMatch(/\.cs-line\s*\+\s*\.cs-line\s*\{[^}]*0\.25em/)
        expect(extractExactRule(css, '.cs-refl')).toMatch(/display:\s*none/)
        const frames = keyframeBodies(css)
        expect(frames.length).toBeGreaterThan(0)
        for (const frame of frames) {
            for (const block of frame.blocks) {
                expect(declarationProps(block), frame.name).not.toContain('rotate')
            }
        }
    })

    it('uses flow-root on the layer, bob, and word', () => {
        expect(css).toMatch(/\.cs-layer\s*\{[^}]*display:\s*flow-root/)
        expect(css).toMatch(/\.cs-bob\s*,\s*\.cs-word\s*\{[^}]*display:\s*flow-root/)
    })

    it('animates only transform and opacity', () => {
        const frames = keyframeBodies(css).filter(
            (frame) => frame.name.startsWith('cs-') || frame.name === 'jr-sheen',
        )
        const names = frames.map((frame) => frame.name).sort()
        expect(names).toEqual(['cs-bob', 'cs-intro', 'cs-light', 'cs-refl', 'cs-settle', 'jr-sheen'])
        for (const frame of frames) {
            expect(frame.blocks.length).toBeGreaterThan(0)
            for (const block of frame.blocks) {
                for (const prop of declarationProps(block)) {
                    expect(KEYFRAME_PROPS.has(prop), `${frame.name} ${prop}`).toBe(true)
                }
            }
        }
    })

    it('matches the reduced-motion mid-state and the over-cap static pose', () => {
        const media = extractAtBlocks(css, 'media')
        const reduced = media.find((block) => block.header === '(prefers-reduced-motion: reduce)')
        const noPref = media.find((block) => block.header === '(prefers-reduced-motion: no-preference)')
        expect(reduced).toBeTruthy()
        expect(noPref).toBeTruthy()
        const reducedBody = reduced?.body ?? ''
        expect(reducedBody).toMatch(/\.cs-intro[\s\S]*\.cs-bob[\s\S]*\.cs-word[\s\S]*\.cs-hi[\s\S]*\.cs-refl[\s\S]*animation:\s*none/)
        expect(reducedBody).toContain('translate3d(0, calc(-0.5 * var(--cs-travel)), 0)')
        expect(reducedBody).toMatch(/\.cs-hi\s*\{[^}]*opacity:\s*0\.55/)
        expect(reducedBody).toContain('scaleX(0.86)')
        expect(reducedBody).not.toContain('data-cs-paused')

        const staticStart = css.indexOf('.cs-metal[data-cs-static="true"]')
        const supportsAt = css.indexOf('@supports', staticStart)
        const staticCss = css.slice(staticStart, supportsAt)
        expect(staticCss).toMatch(/\.cs-intro[\s\S]*\.cs-bob[\s\S]*\.cs-word[\s\S]*\.cs-hi[\s\S]*\.cs-refl[\s\S]*animation:\s*none/)
        expect(staticCss).toContain('translate3d(0, calc(-0.5 * var(--cs-travel)), 0)')
        expect(staticCss).toMatch(/\.cs-hi\s*\{[^}]*opacity:\s*0\.55/)
        expect(staticCss).toContain('scaleX(0.86)')

        expect(noPref?.body).toContain('data-cs-paused')
        expect(noPref?.body).toMatch(/animation-play-state:\s*paused/)
    })

    it('guards the join sheen against disabled and busy buttons', () => {
        expect(css).toContain('.jr-sheen:not(:disabled):not([aria-busy="true"]):hover')
        expect(css).toContain('.jr-sheen:not(:disabled):not([aria-busy="true"]):focus-visible')
    })
})
