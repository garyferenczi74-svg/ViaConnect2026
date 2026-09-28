/**
 * Brief 67 harness. No dev server, no auth, no catalog photos.
 * Markup is built here. This file does not import ComingSoonOverlay,
 * because that module pulls CSS and next/font.
 * Backgrounds are white, seeded noise, and the navy fallback gradient.
 * Shop Playwright does not run in CI. These results are local evidence.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement as h, type CSSProperties } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test, type Page } from '@playwright/test'
import { COMING_SOON_OVERLAY_TEXT } from '../../../src/lib/shop/coming-soon-copy'

const CSS_PATH = join(process.cwd(), 'src/components/shop/coming-soon-metal.css')
const FONT_PATH = join(process.cwd(), 'tests/fixtures/fonts/playfair-display-600.woff2')
const BUTTON_CSS_PATH = join(process.cwd(), 'tests/e2e/shop/join-button-utilities.css')
const BUTTON_SOURCE = join(process.cwd(), 'src/components/shop/JoinWaitlistButton.tsx')
const ARTIFACT_DIR = '/opt/cursor/artifacts/brief67'
/** On-screen shadow reach stays about 0.2em after the pre-rotated offsets. Pad is 0.27em. */
const SHADOW_PAD_EM = 0.27

const SIZES = [
    { name: 'card-390', width: 167, height: 223, size: 'card' as const },
    { name: 'card-md', width: 219, height: 274, size: 'card' as const },
    { name: 'card-1440', width: 284, height: 355, size: 'card' as const },
    { name: 'pdp-390', width: 358, height: 448, size: 'pdp' as const },
    { name: 'pdp-1440', width: 592, height: 740, size: 'pdp' as const },
]

const BACKGROUNDS = ['white', 'noise', 'navy'] as const
type BackgroundName = (typeof BACKGROUNDS)[number]
type PoseName = 'small' | 'large' | 'dip' | 'final'

const FREEZE_MS: Record<PoseName, number> = {
    small: 120,
    large: 731.7,
    dip: 1594,
    final: 3000,
}

const EXPECTED_SCALE: Record<PoseName, number> = {
    small: 0.58,
    large: 1,
    dip: 0.65,
    final: 1,
}

const SCALE_TOLERANCE: Record<PoseName, number> = {
    small: 0.04,
    large: 0.015,
    dip: 0.025,
    final: 0.01,
}

interface PixelResult {
    project: string
    surface: string
    background: BackgroundName
    pose: PoseName
    changedIn: number
    changedOut: number
    apexRatio?: number
    centerX?: number
    centerY?: number
}

function overlayMarkup(size: 'card' | 'pdp', tone: 'onLight' | 'onDark' = 'onLight'): string {
    const words = COMING_SOON_OVERLAY_TEXT.split(' ')
    const layers = ['cs-edge', 'cs-deep', 'cs-hi'] as const
    const style = {
        '--cs-delay': '0s',
        '--font-coming-soon': '"Playfair Display"',
    } as CSSProperties
    return renderToStaticMarkup(
        h(
            'div',
            {
                'aria-hidden': true,
                'data-testid': 'coming-soon-overlay',
                className: 'cs-metal',
                'data-size': size,
                'data-tone': tone,
                'data-cs-paused': 'true',
                style,
            },
            h(
                'span',
                { className: 'cs-intro' },
                h('span', { className: 'cs-refl' }),
                h(
                    'span',
                    { className: 'cs-stage' },
                    h(
                        'span',
                        { className: 'cs-bob' },
                        h(
                            'span',
                            { className: 'cs-word' },
                            layers.map((layer) =>
                                h(
                                    'span',
                                    { key: layer, className: `cs-layer ${layer}` },
                                    words.map((word) =>
                                        h('span', { key: `${layer}-${word}`, className: 'cs-line' }, word),
                                    ),
                                ),
                            ),
                        ),
                    ),
                ),
            ),
        ),
    )
}

function frameHtml(name: string, width: number, height: number, size: 'card' | 'pdp', background: string): string {
    return `<div class="frame" data-surface="${name}" style="position:relative;width:${width}px;height:${height}px;overflow:hidden;background:${background}">${overlayMarkup(size, background.includes('1A2744') ? 'onDark' : 'onLight')}</div>`
}

function playfairFaceCss(): string {
    const b64 = readFileSync(FONT_PATH).toString('base64')
    return `@font-face{font-family:"Playfair Display";font-style:normal;font-weight:600;font-display:block;src:url(data:font/woff2;base64,${b64}) format("woff2");}`
}

function tealButtonClass(): string {
    const source = readFileSync(BUTTON_SOURCE, 'utf8')
    const focus = source.match(/const focusRing =\s*'([^']*)'/)?.[1]
    const teal = source.match(/const tealButton =\s*`([^`]*)`/)?.[1]
    if (!focus || !teal) throw new Error('tealButton source missing')
    return teal.replace(/\$\{focusRing\}/g, focus).replace(/\s+/g, ' ').trim()
}

async function mount(page: Page, body: string, fontCss: string): Promise<void> {
    await page.setContent(
        `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#111;}</style></head><body>${body}</body></html>`,
        { waitUntil: 'domcontentloaded' },
    )
    await page.addStyleTag({ content: fontCss })
    await page.addStyleTag({ path: CSS_PATH })
    await page.evaluate(async () => {
        await document.fonts.load('600 32px "Playfair Display"')
        await document.fonts.ready
    })
}

async function paintNoise(page: Page, seed: number): Promise<void> {
    await page.evaluate((noiseSeed) => {
        const frame = document.querySelector<HTMLElement>('.frame')
        if (!frame) throw new Error('frame missing')
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(frame.clientWidth))
        canvas.height = Math.max(1, Math.round(frame.clientHeight))
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('canvas missing')
        const image = ctx.createImageData(canvas.width, canvas.height)
        let state = noiseSeed >>> 0
        for (let index = 0; index < image.data.length; index += 4) {
            state = (Math.imul(state, 1664525) + 1013904223) >>> 0
            image.data[index] = state & 255
            image.data[index + 1] = (state >>> 8) & 255
            image.data[index + 2] = (state >>> 16) & 255
            image.data[index + 3] = 255
        }
        ctx.putImageData(image, 0, 0)
        frame.style.backgroundImage = `url(${canvas.toDataURL()})`
        frame.style.backgroundSize = '100% 100%'
    }, seed)
}

async function freeze(page: Page, pose: PoseName): Promise<{ scale: number }> {
    return page.evaluate((targetMs) => {
        document.querySelectorAll<HTMLElement>('.cs-metal').forEach((el) => {
            el.style.setProperty('--cs-delay', '0s')
            el.removeAttribute('data-cs-paused')
            el.removeAttribute('data-cs-static')
        })
        const animated = document.querySelectorAll<HTMLElement>('.cs-intro, .cs-word, .cs-hi')
        animated.forEach((el) => {
            el.style.animation = 'none'
        })
        document.body.getBoundingClientRect()
        animated.forEach((el) => {
            el.style.animation = ''
        })
        document.body.getBoundingClientRect()
        const anims = document.getAnimations()
        if (anims.length === 0) throw new Error('no animations to freeze')
        for (const anim of anims) {
            const effect = anim.effect as KeyframeEffect | null
            const target = effect?.target as Element | null
            if (target?.closest('.cs-metal')) anim.currentTime = targetMs
            anim.pause()
        }
        const word = document.querySelector<HTMLElement>('.cs-word')
        if (!word) throw new Error('overlay nodes missing')
        const transform = getComputedStyle(word).transform
        const matrix = transform === 'none' ? new DOMMatrix() : new DOMMatrix(transform)
        const scale = Math.hypot(matrix.a, matrix.b)
        return { scale }
    }, FREEZE_MS[pose])
}

async function pixelDiff(
    page: Page,
    hide: 'root' | 'edge',
): Promise<{ changedIn: number; changedOut: number }> {
    const meta = await page.evaluate((padEm) => {
        const frame = document.querySelector<HTMLElement>('.frame')
        const stage = document.querySelector<HTMLElement>('.cs-stage')
        if (!frame || !stage) throw new Error('frame missing')
        const pad = padEm * Number.parseFloat(getComputedStyle(stage).fontSize)
        const origin = frame.getBoundingClientRect()
        const boxes = [...frame.querySelectorAll<HTMLElement>('.cs-word')].map((el) => {
            const rect = el.getBoundingClientRect()
            return {
                x: rect.x - origin.x - pad,
                y: rect.y - origin.y - pad,
                w: rect.width + pad * 2,
                h: rect.height + pad * 2,
            }
        })
        return {
            boxes,
            frameW: origin.width,
            frameH: origin.height,
        }
    }, SHADOW_PAD_EM)
    const frame = page.locator('.frame')
    const on = await frame.screenshot()
    await page.evaluate((mode) => {
        if (mode === 'edge') {
            document.querySelectorAll<HTMLElement>('.cs-edge, .cs-refl').forEach((el) => {
                el.style.visibility = 'hidden'
            })
            return
        }
        document.querySelectorAll<HTMLElement>('.cs-metal').forEach((el) => {
            el.style.visibility = 'hidden'
        })
    }, hide)
    const off = await frame.screenshot()
    await page.evaluate(() => {
        document.querySelectorAll<HTMLElement>('.cs-metal, .cs-edge, .cs-refl').forEach((el) => {
            el.style.visibility = ''
        })
    })
    return page.evaluate(
        async ({ onB64, offB64, boxes, frameW, frameH }) => {
            const load = (b64: string) =>
                new Promise<HTMLImageElement>((resolve, reject) => {
                    const img = new Image()
                    img.onload = () => resolve(img)
                    img.onerror = () => reject(new Error('png load failed'))
                    img.src = `data:image/png;base64,${b64}`
                })
            const shown = await load(onB64)
            const hidden = await load(offB64)
            if (shown.width !== hidden.width || shown.height !== hidden.height) {
                throw new Error(`screenshot size ${shown.width}x${shown.height} vs ${hidden.width}x${hidden.height}`)
            }
            const canvas = document.createElement('canvas')
            canvas.width = shown.width
            canvas.height = shown.height
            const ctx = canvas.getContext('2d')
            if (!ctx) throw new Error('diff canvas missing')
            ctx.drawImage(shown, 0, 0)
            const dataOn = ctx.getImageData(0, 0, shown.width, shown.height).data
            ctx.clearRect(0, 0, shown.width, shown.height)
            ctx.drawImage(hidden, 0, 0)
            const dataOff = ctx.getImageData(0, 0, shown.width, shown.height).data
            let changedIn = 0
            let changedOut = 0
            for (let index = 0; index < dataOn.length; index += 4) {
                const delta = Math.abs(dataOn[index] - dataOff[index])
                    + Math.abs(dataOn[index + 1] - dataOff[index + 1])
                    + Math.abs(dataOn[index + 2] - dataOff[index + 2])
                    + Math.abs(dataOn[index + 3] - dataOff[index + 3])
                if (delta === 0) continue
                const pixel = index / 4
                const x = (pixel % shown.width) + 0.5
                const y = Math.floor(pixel / shown.width) + 0.5
                const cssX = x / (shown.width / frameW)
                const cssY = y / (shown.height / frameH)
                const inside = boxes.some((box) => cssX >= box.x && cssY >= box.y && cssX < box.x + box.w && cssY < box.y + box.h)
                if (inside) changedIn += 1
                else changedOut += 1
            }
            return { changedIn, changedOut }
        },
        { onB64: on.toString('base64'), offB64: off.toString('base64'), boxes: meta.boxes, frameW: meta.frameW, frameH: meta.frameH },
    )
}

test.describe.configure({ mode: 'serial' })

test.describe('coming soon overlay harness', () => {
    let fontCss = ''

    test.beforeAll(() => {
        fontCss = playfairFaceCss()
        mkdirSync(ARTIFACT_DIR, { recursive: true })
    })

    test('L1 pixels stay inside the glyph and shadow boxes', async ({ page }, testInfo) => {
        test.setTimeout(180_000)
        const results: PixelResult[] = []
        for (const size of SIZES) {
            for (const background of BACKGROUNDS) {
                const bg = background === 'white'
                    ? '#FFFFFF'
                    : background === 'navy'
                      ? 'linear-gradient(to bottom right, #1A2744, #0F1A2E)'
                      : '#FFFFFF'
                await page.setViewportSize({
                    width: Math.max(size.width + 32, 390),
                    height: Math.max(size.height + 32, 700),
                })
                await mount(page, frameHtml(size.name, size.width, size.height, size.size, bg), fontCss)
                if (background === 'noise') await paintNoise(page, 67)
                const loaded = await page.evaluate(() => document.fonts.check('600 28px "Playfair Display"'))
                expect(loaded).toBe(true)

                for (const pose of ['small', 'large', 'dip', 'final'] as const) {
                    const placed = await freeze(page, pose)
                    expect(Math.abs(placed.scale - EXPECTED_SCALE[pose]), `${size.name} ${pose} scale ${placed.scale}`).toBeLessThan(SCALE_TOLERANCE[pose])
                    const place = await page.evaluate(() => {
                        const frame = document.querySelector<HTMLElement>('.frame')
                        const word = document.querySelector<HTMLElement>('.cs-word')
                        const refl = document.querySelector<HTMLElement>('.cs-refl')
                        if (!frame || !word || !refl) throw new Error('word missing')
                        const frameRect = frame.getBoundingClientRect()
                        const wordRect = word.getBoundingClientRect()
                        const centerX = (wordRect.left + wordRect.right) / 2
                        const centerY = (wordRect.top + wordRect.bottom) / 2
                        return {
                            centerX: (centerX - frameRect.left) / frameRect.width,
                            centerY: (centerY - frameRect.top) / frameRect.height,
                            insetLeft: (wordRect.left - frameRect.left) / frameRect.width,
                            insetRight: (frameRect.right - wordRect.right) / frameRect.width,
                            insetTop: (wordRect.top - frameRect.top) / frameRect.height,
                            insetBottom: (frameRect.bottom - wordRect.bottom) / frameRect.height,
                            wide: frameRect.width / frameRect.height >= 0.79,
                            rotate: getComputedStyle(word).rotate,
                            reflDisplay: getComputedStyle(refl).display,
                        }
                    })
                    expect(place.reflDisplay, size.name).toBe('none')
                    expect(place.rotate, size.name).toMatch(/-45deg/)
                    if (pose === 'large' || pose === 'final') {
                        expect(Math.abs(place.centerX - 0.5), `${size.name} ${pose} x`).toBeLessThan(0.01)
                        expect(Math.abs(place.centerY - (place.wide ? 0.52 : 0.49)), `${size.name} ${pose} y`).toBeLessThan(0.01)
                    }
                    if (pose === 'final') {
                        expect(place.insetLeft, `${size.name} left`).toBeGreaterThanOrEqual(0.08)
                        expect(place.insetRight, `${size.name} right`).toBeGreaterThanOrEqual(0.08)
                        expect(place.insetTop, `${size.name} top`).toBeGreaterThanOrEqual(0.08)
                        expect(place.insetBottom, `${size.name} bottom`).toBeGreaterThanOrEqual(0.08)
                    }
                    const checkPixels = pose === 'large' || pose === 'final'
                    const diff = checkPixels
                        ? await pixelDiff(page, 'root')
                        : { changedIn: 0, changedOut: 0 }
                    if (checkPixels) {
                        expect(diff.changedOut, `${testInfo.project.name} ${size.name} ${background} ${pose}`).toBe(0)
                        expect(diff.changedIn).toBeGreaterThan(0)
                    }
                    const row: PixelResult = {
                        project: testInfo.project.name,
                        surface: size.name,
                        background,
                        pose,
                        changedIn: diff.changedIn,
                        changedOut: diff.changedOut,
                    }
                    if ((pose === 'large' || pose === 'final') && background === 'white') {
                        row.centerX = place.centerX
                        row.centerY = place.centerY
                    }
                    results.push(row)
                    if (
                        testInfo.project.name === 'desktop-1440'
                        && background === 'white'
                        && (size.name === 'card-390' || size.name === 'card-1440' || size.name === 'pdp-390' || size.name === 'pdp-1440')
                    ) {
                        await page.locator('.frame').screenshot({
                            path: join(ARTIFACT_DIR, `${size.name}-${pose}.png`),
                        })
                    }
                }
            }
        }

        const props = await page.evaluate(() => {
            document.querySelectorAll<HTMLElement>('.cs-metal').forEach((el) => el.removeAttribute('data-cs-paused'))
            document.body.getBoundingClientRect()
            const meta = new Set(['offset', 'computedOffset', 'easing', 'composite'])
            const names: string[] = []
            for (const anim of document.getAnimations()) {
                const effect = anim.effect as KeyframeEffect | null
                if (!effect || typeof effect.getKeyframes !== 'function') continue
                for (const frame of effect.getKeyframes()) {
                    for (const key of Object.keys(frame)) {
                        if (!meta.has(key)) names.push(key)
                    }
                }
            }
            return names
        })
        expect(props.length).toBeGreaterThan(0)
        for (const prop of props) expect(['transform', 'opacity']).toContain(prop)

        writeFileSync(
            `/tmp/brief67-pixel-${testInfo.project.name}.json`,
            JSON.stringify(results, null, 2),
        )
        console.log(`PIXEL ${testInfo.project.name} ${JSON.stringify(results)}`)
    })

    test('reduced motion holds the static mid-state', async ({ page }, testInfo) => {
        await page.emulateMedia({ reducedMotion: 'reduce' })
        const shots = [
            SIZES[0],
            SIZES[2],
            SIZES[3],
            SIZES[4],
        ]
        for (const size of shots) {
            await page.setViewportSize({
                width: Math.max(size.width + 32, 390),
                height: Math.max(size.height + 32, 700),
            })
            await mount(
                page,
                frameHtml(size.name, size.width, size.height, size.size, '#FFFFFF'),
                fontCss,
            )
            const state = await page.evaluate(() => {
                const anims = document.getAnimations().filter((anim) => {
                    const target = (anim.effect as KeyframeEffect | null)?.target as Element | null
                    return Boolean(target?.closest('.cs-metal'))
                })
                const word = document.querySelector<HTMLElement>('.cs-word')
                const hi = document.querySelector<HTMLElement>('.cs-hi')
                const refl = document.querySelector<HTMLElement>('.cs-refl')
                const bob = document.querySelector<HTMLElement>('.cs-bob')
                if (!word || !hi || !refl || !bob) throw new Error('reduced nodes missing')
                const transform = getComputedStyle(word).transform
                const matrix = transform === 'none' ? new DOMMatrix() : new DOMMatrix(transform)
                return {
                    anims: anims.length,
                    scale: Math.hypot(matrix.a, matrix.b),
                    bobTransform: getComputedStyle(bob).transform,
                    hiOpacity: getComputedStyle(hi).opacity,
                    reflDisplay: getComputedStyle(refl).display,
                    wordWillChange: getComputedStyle(word).willChange,
                    hiWillChange: getComputedStyle(hi).willChange,
                }
            })
            expect(state.anims, size.name).toBe(0)
            expect(Math.abs(state.scale - 1), size.name).toBeLessThan(0.01)
            expect(state.bobTransform, size.name).toBe('none')
            expect(state.hiOpacity).toBe('0.55')
            expect(state.reflDisplay, size.name).toBe('none')
            expect(state.wordWillChange, size.name).toBe('transform')
            expect(state.hiWillChange, size.name).toBe('opacity')
            if (testInfo.project.name === 'desktop-1440') {
                await page.locator('.frame').screenshot({
                    path: join(ARTIFACT_DIR, `${size.name}-reduced.png`),
                })
            }
        }
    })

    test('fill layer paints inside the glyph box', async ({ page }) => {
        const size = SIZES[0]
        await page.setViewportSize({ width: 390, height: 700 })
        await mount(page, frameHtml(size.name, size.width, size.height, size.size, '#FFFFFF'), fontCss)
        await freeze(page, 'final')
        const diff = await pixelDiff(page, 'edge')
        expect(diff.changedIn).toBeGreaterThan(0)
    })

    test('idle join button is unchanged and the sheen sweeps once', async ({ page }, testInfo) => {
        const teal = tealButtonClass()
        const utilities = readFileSync(BUTTON_CSS_PATH, 'utf8')
        for (const token of teal.split(' ')) {
            const escaped = token.replace(/([!#:.[\]/])/g, '\\$1')
            expect(utilities, token).toContain(escaped)
        }
        await page.setViewportSize({ width: 800, height: 400 })
        // Compiled utility values (radius 1rem, teal #2DA5A0, 44px, weight 500).
        // Inline, because the generated rgb(.../var()) form does not resolve here.
        const face = [
            'appearance:none',
            '-webkit-appearance:none',
            'background-color:#2DA5A0',
            'color:#fff',
            'border:0',
            'border-radius:1rem',
            'min-height:44px',
            'padding:0.75rem 0',
            'font-weight:500',
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'gap:0.5rem',
            'width:100%',
            'box-sizing:border-box',
            'font:500 16px/1.5 Arial,sans-serif',
        ].join(';')
        await page.setContent(
            `<!doctype html><html><body style="margin:16px;background:#0F1A2E">
                <div style="width:280px"><button id="plain" type="button" class="${teal}" style="${face}">Join the Revolution</button></div>
                <div style="width:280px"><button id="sheen" type="button" class="${teal} jr-sheen" style="${face}">Join the Revolution</button></div>
            </body></html>`,
            { waitUntil: 'domcontentloaded' },
        )
        await page.addStyleTag({ path: BUTTON_CSS_PATH })
        await page.addStyleTag({ path: CSS_PATH })
        // Element screenshots can leave the pointer on the button. On engines
        // that match (hover: hover) that starts the 200ms hairline transition,
        // so park the pointer and let opacity settle before each capture.
        const parkPointer = async () => {
            await page.mouse.move(0, 0)
            await page.waitForFunction(() => {
                const button = document.querySelector('#sheen')
                if (!button) return false
                const before = Number(getComputedStyle(button, '::before').opacity)
                const after = Number(getComputedStyle(button, '::after').opacity)
                return before === 0 && after === 0
            })
        }
        await parkPointer()
        const plain = await page.locator('#plain').screenshot()
        await parkPointer()
        const sheen = await page.locator('#sheen').screenshot()
        await parkPointer()
        const idle = await page.evaluate(
            async ({ plainB64, sheenB64 }) => {
                const load = (b64: string) =>
                    new Promise<HTMLImageElement>((resolve, reject) => {
                        const img = new Image()
                        img.onload = () => resolve(img)
                        img.onerror = () => reject(new Error('button png failed'))
                        img.src = `data:image/png;base64,${b64}`
                    })
                const a = await load(plainB64)
                const b = await load(sheenB64)
                const canvas = document.createElement('canvas')
                canvas.width = a.width
                canvas.height = a.height
                const ctx = canvas.getContext('2d')
                if (!ctx) throw new Error('button canvas missing')
                ctx.drawImage(a, 0, 0)
                const dataA = ctx.getImageData(0, 0, a.width, a.height).data
                ctx.drawImage(b, 0, 0)
                const dataB = ctx.getImageData(0, 0, a.width, a.height).data
                const plainEl = document.querySelector<HTMLElement>('#plain')
                const box = plainEl?.getBoundingClientRect()
                const scale = box && box.width > 0 ? a.width / box.width : 1
                const radiusCss = plainEl ? parseFloat(getComputedStyle(plainEl).borderTopLeftRadius) : 16
                const radius = Number.isFinite(radiusCss) ? radiusCss * scale : 16 * scale
                // Antialiasing sits on the rounded outline, including the quarter-circle
                // corners, so a rectangular inset misses the arc.
                const stroke = 2 * scale
                const halfW = a.width / 2
                const halfH = a.height / 2
                const innerW = Math.max(0, halfW - radius)
                const innerH = Math.max(0, halfH - radius)
                let interior = 0
                let rim = 0
                const samples: string[] = []
                for (let index = 0; index < dataA.length; index += 4) {
                    const delta = Math.abs(dataA[index] - dataB[index])
                        + Math.abs(dataA[index + 1] - dataB[index + 1])
                        + Math.abs(dataA[index + 2] - dataB[index + 2])
                        + Math.abs(dataA[index + 3] - dataB[index + 3])
                    if (delta === 0) continue
                    const pixel = index / 4
                    const x = pixel % a.width
                    const y = Math.floor(pixel / a.width)
                    const qx = Math.abs(x + 0.5 - halfW) - innerW
                    const qy = Math.abs(y + 0.5 - halfH) - innerH
                    const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0))
                    const inside = Math.min(Math.max(qx, qy), 0)
                    const edge = Math.abs(outside + inside - radius)
                    const onRim = edge <= stroke
                    if (onRim) rim += 1
                    else {
                        interior += 1
                        if (samples.length < 8) samples.push(`${x},${y}:${delta}`)
                    }
                }
                const button = document.querySelector<HTMLElement>('#sheen')
                return {
                    interior,
                    rim,
                    samples,
                    widthA: a.width,
                    widthB: b.width,
                    heightA: a.height,
                    heightB: b.height,
                    beforeOpacity: button ? getComputedStyle(button, '::before').opacity : '',
                    afterOpacity: button ? getComputedStyle(button, '::after').opacity : '',
                }
            },
            { plainB64: plain.toString('base64'), sheenB64: sheen.toString('base64') },
        )
        expect(idle.widthA).toBe(idle.widthB)
        expect(idle.heightA).toBe(idle.heightB)
        // Opacity-0 pseudos do not paint the face. Outline antialiasing along the
        // 1rem radius can still differ by about 2px, which is a small share of the bitmap.
        expect(idle.interior, idle.samples.join(' ')).toBe(0)
        expect(idle.rim).toBeLessThan(idle.widthA * idle.heightA * 0.15)
        expect(idle.beforeOpacity).toBe('0')
        expect(idle.afterOpacity).toBe('0')

        const canHover = await page.evaluate(() => matchMedia('(hover: hover)').matches)
        if (testInfo.project.name === 'desktop-1440') expect(canHover).toBe(true)
        if (!canHover) return
        await page.hover('#sheen')
        await page.waitForFunction(() => {
            const button = document.querySelector('#sheen')
            return Boolean(button) && getComputedStyle(button, '::before').opacity === '1'
        })
        const hover = await page.evaluate(() => {
            const button = document.querySelector<HTMLElement>('#sheen')
            if (!button) throw new Error('sheen button missing')
            const anims = document.getAnimations().filter((anim) => (anim as CSSAnimation).animationName === 'jr-sheen')
            return {
                hairline: getComputedStyle(button, '::before').opacity,
                iterations: anims.map((anim) => (anim.effect as KeyframeEffect).getTiming().iterations),
            }
        })
        expect(hover.hairline).toBe('1')
        expect(hover.iterations.length).toBeGreaterThan(0)
        for (const iterations of hover.iterations) expect(iterations).toBe(1)

        await page.mouse.move(0, 0)
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.hover('#sheen')
        await page.waitForFunction(() => {
            const button = document.querySelector('#sheen')
            return Boolean(button) && getComputedStyle(button, '::before').opacity === '1'
        })
        const reduced = await page.evaluate(() => {
            const button = document.querySelector<HTMLElement>('#sheen')
            if (!button) throw new Error('sheen button missing')
            const anims = document.getAnimations().filter((anim) => (anim as CSSAnimation).animationName === 'jr-sheen')
            return {
                hairline: getComputedStyle(button, '::before').opacity,
                sweeps: anims.length,
            }
        })
        expect(reduced.sweeps).toBe(0)
        expect(reduced.hairline).toBe('1')
    })
})
