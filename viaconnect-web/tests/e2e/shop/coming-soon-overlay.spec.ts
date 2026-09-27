/**
 * Brief 67 harness. No dev server, no auth, no catalog photos.
 * Backgrounds are white, seeded noise, and the navy fallback gradient.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement as h, type CSSProperties } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test, type Page } from '@playwright/test'
import ts from 'typescript'
import { COMING_SOON_OVERLAY_TEXT } from '../../../src/lib/shop/coming-soon-copy'

const CSS_PATH = join(process.cwd(), 'src/components/shop/coming-soon-metal.css')
const ARTIFACT_DIR = '/opt/cursor/artifacts/brief67'
const BUTTON_STYLE = [
    'box-sizing:border-box',
    'width:240px',
    'height:48px',
    'padding:0',
    'margin:0',
    'border:0',
    'border-radius:12px',
    'background:#2DA5A0',
    'color:#ffffff',
    'font:600 16px/48px Arial,sans-serif',
].join(';')

const SIZES = [
    { name: 'card-390', width: 167, height: 223, size: 'card' as const },
    { name: 'card-md', width: 219, height: 274, size: 'card' as const },
    { name: 'card-1440', width: 284, height: 355, size: 'card' as const },
    { name: 'pdp-390', width: 358, height: 448, size: 'pdp' as const },
    { name: 'pdp-1440', width: 592, height: 740, size: 'pdp' as const },
]

const BACKGROUNDS = ['white', 'noise', 'navy'] as const
type BackgroundName = (typeof BACKGROUNDS)[number]
type PoseName = 'apex' | 'floor'

interface PixelResult {
    project: string
    surface: string
    background: BackgroundName
    pose: PoseName
    changedIn: number
    changedOut: number
    apexRatio?: number
}

function overlayMarkup(size: 'card' | 'pdp', tone: 'onLight' | 'onDark' = 'onLight'): string {
    const words = COMING_SOON_OVERLAY_TEXT.split(' ')
    const layers = ['cs-edge', 'cs-deep', 'cs-hi'] as const
    const style = {
        '--cs-delay': '0s',
        '--cs-intro-delay': '0s',
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

function schedulerFactorySource(): string {
    const src = readFileSync(join(process.cwd(), 'src/components/shop/coming-soon-motion.ts'), 'utf8')
    const js = ts.transpileModule(src, {
        compilerOptions: { target: ts.ScriptTarget.ES2020 },
    }).outputText
    const start = js.indexOf('function createMotionScheduler')
    const end = js.indexOf('let singleton')
    if (start < 0 || end < start) throw new Error('could not slice createMotionScheduler')
    return js.slice(start, end)
}

async function playfairFaceCss(): Promise<string> {
    const cssUrl = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&display=swap'
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    const cssRes = await fetch(cssUrl, { headers: { 'User-Agent': ua } })
    if (!cssRes.ok) throw new Error(`Playfair css ${cssRes.status}`)
    const css = await cssRes.text()
    const fontUrl = css.match(/url\((https:[^)]+)\)/)?.[1]
    if (!fontUrl) throw new Error('Playfair woff2 url missing')
    const fontRes = await fetch(fontUrl)
    if (!fontRes.ok) throw new Error(`Playfair woff2 ${fontRes.status}`)
    const b64 = Buffer.from(await fontRes.arrayBuffer()).toString('base64')
    return `@font-face{font-family:"Playfair Display";font-style:normal;font-weight:600;font-display:block;src:url(data:font/woff2;base64,${b64}) format("woff2");}`
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

async function freeze(page: Page, pose: PoseName): Promise<{ y: number; expected: number }> {
    return page.evaluate((which) => {
        document.querySelectorAll<HTMLElement>('.cs-metal').forEach((el) => {
            el.removeAttribute('data-cs-paused')
            el.removeAttribute('data-cs-static')
        })
        document.body.getBoundingClientRect()
        const anims = document.getAnimations()
        if (anims.length === 0) throw new Error('no animations to freeze')
        for (const anim of anims) {
            const named = anim as CSSAnimation
            const target = (anim.effect as KeyframeEffect | null)?.target as Element | null
            const name = named.animationName
                || (target?.classList.contains('cs-intro') ? 'cs-intro' : 'loop')
            anim.pause()
            anim.currentTime = name === 'cs-intro' ? 800 : which === 'floor' ? 1250 : 0
        }
        const bob = document.querySelector<HTMLElement>('.cs-bob')
        const stage = document.querySelector<HTMLElement>('.cs-stage')
        const root = document.querySelector<HTMLElement>('.cs-metal')
        if (!bob || !stage || !root) throw new Error('overlay nodes missing')
        const fontSize = Number.parseFloat(getComputedStyle(stage).fontSize)
        const travelEm = root.getAttribute('data-size') === 'pdp' ? 0.45 : 0.4
        const travel = travelEm * fontSize
        const transform = getComputedStyle(bob).transform
        const y = transform === 'none' ? 0 : new DOMMatrix(transform).m42
        const expected = which === 'apex' ? -travel : 0
        return { y, expected }
    }, pose)
}

async function pixelDiff(
    page: Page,
    hide: 'root' | 'edge',
): Promise<{ changedIn: number; changedOut: number }> {
    const meta = await page.evaluate(() => {
        const frame = document.querySelector<HTMLElement>('.frame')
        const stage = document.querySelector<HTMLElement>('.cs-stage')
        if (!frame || !stage) throw new Error('frame missing')
        const pad = 0.2 * Number.parseFloat(getComputedStyle(stage).fontSize)
        const origin = frame.getBoundingClientRect()
        const boxes = [...frame.querySelectorAll<HTMLElement>('.cs-word, .cs-refl')].map((el) => {
            const rect = el.getBoundingClientRect()
            return {
                x: rect.x - origin.x - pad,
                y: rect.y - origin.y - pad,
                w: rect.width + pad * 2,
                h: rect.height + pad * 2,
            }
        })
        return { boxes, dpr: window.devicePixelRatio || 1 }
    })
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
        async ({ onB64, offB64, boxes, dpr }) => {
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
                const cssX = x / dpr
                const cssY = y / dpr
                const inside = boxes.some((box) => cssX >= box.x && cssY >= box.y && cssX < box.x + box.w && cssY < box.y + box.h)
                if (inside) changedIn += 1
                else changedOut += 1
            }
            return { changedIn, changedOut }
        },
        { onB64: on.toString('base64'), offB64: off.toString('base64'), boxes: meta.boxes, dpr: meta.dpr },
    )
}

test.describe.configure({ mode: 'serial' })

test.describe('coming soon overlay harness', () => {
    let fontCss = ''

    test.beforeAll(async () => {
        fontCss = await playfairFaceCss()
        mkdirSync(ARTIFACT_DIR, { recursive: true })
    })

    test('L1 pixels stay inside the glyph, shadow, and reflection boxes', async ({ page }, testInfo) => {
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

                const drift = await page.evaluate(() => {
                    const edges = [...document.querySelectorAll<HTMLElement>('.cs-edge .cs-line')]
                    const fills = [...document.querySelectorAll<HTMLElement>('.cs-deep .cs-line')]
                    return edges.map((edge, index) =>
                        Math.abs(edge.getBoundingClientRect().top - fills[index].getBoundingClientRect().top),
                    )
                })
                for (const delta of drift) expect(delta).toBeLessThanOrEqual(0.5)

                for (const pose of ['apex', 'floor'] as const) {
                    const placed = await freeze(page, pose)
                    expect(Math.abs(placed.y - placed.expected), `${size.name} ${pose}`).toBeLessThan(1.25)
                    if (pose === 'apex') {
                        const ratio = await page.evaluate(() => {
                            const frame = document.querySelector<HTMLElement>('.frame')
                            const word = document.querySelector<HTMLElement>('.cs-word')
                            if (!frame || !word) throw new Error('word missing')
                            const frameRect = frame.getBoundingClientRect()
                            const wordRect = word.getBoundingClientRect()
                            return (wordRect.top - frameRect.top) / frameRect.height
                        })
                        expect(ratio, size.name).toBeGreaterThanOrEqual(0.6)
                        if (background === 'white') {
                            results.push({
                                project: testInfo.project.name,
                                surface: size.name,
                                background,
                                pose,
                                changedIn: 0,
                                changedOut: 0,
                                apexRatio: ratio,
                            })
                        }
                    }
                    const diff = await pixelDiff(page, 'root')
                    expect(diff.changedOut, `${testInfo.project.name} ${size.name} ${background} ${pose}`).toBe(0)
                    expect(diff.changedIn).toBeGreaterThan(0)
                    const row: PixelResult = {
                        project: testInfo.project.name,
                        surface: size.name,
                        background,
                        pose,
                        changedIn: diff.changedIn,
                        changedOut: diff.changedOut,
                    }
                    if (pose === 'apex' && background === 'white') {
                        const existing = results.find((item) => item.surface === size.name && item.pose === 'apex' && item.background === 'white')
                        if (existing) {
                            existing.changedIn = diff.changedIn
                            existing.changedOut = diff.changedOut
                        }
                    } else {
                        results.push(row)
                    }
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
                const bob = document.querySelector<HTMLElement>('.cs-bob')
                const hi = document.querySelector<HTMLElement>('.cs-hi')
                const refl = document.querySelector<HTMLElement>('.cs-refl')
                const stage = document.querySelector<HTMLElement>('.cs-stage')
                const root = document.querySelector<HTMLElement>('.cs-metal')
                if (!bob || !hi || !refl || !stage || !root) throw new Error('reduced nodes missing')
                const fontSize = Number.parseFloat(getComputedStyle(stage).fontSize)
                const travel = (root.getAttribute('data-size') === 'pdp' ? 0.45 : 0.4) * fontSize
                const bobTransform = getComputedStyle(bob).transform
                const y = bobTransform === 'none' ? 0 : new DOMMatrix(bobTransform).m42
                const reflTransform = getComputedStyle(refl).transform
                const scaleX = reflTransform === 'none' ? 1 : new DOMMatrix(reflTransform).a
                return {
                    anims: anims.length,
                    y,
                    expectedY: -0.5 * travel,
                    hiOpacity: getComputedStyle(hi).opacity,
                    scaleX,
                }
            })
            expect(state.anims, size.name).toBe(0)
            expect(Math.abs(state.y - state.expectedY), size.name).toBeLessThan(0.75)
            expect(state.hiOpacity).toBe('0.55')
            expect(Math.abs(state.scaleX - 0.86)).toBeLessThan(0.02)
            if (testInfo.project.name === 'desktop-1440') {
                await page.locator('.frame').screenshot({
                    path: join(ARTIFACT_DIR, `${size.name}-reduced.png`),
                })
            }
        }
    })

    test('at most 12 overlays in view keep running animations', async ({ page }) => {
        const cells = Array.from({ length: 20 }, () =>
            `<div class="cell" style="position:relative;width:64px;height:48px;overflow:hidden">${overlayMarkup('card')}</div>`,
        ).join('')
        await page.setViewportSize({ width: 400, height: 360 })
        await mount(
            page,
            `<div style="display:flex;flex-wrap:wrap;width:360px">${cells}</div>`,
            fontCss,
        )
        await page.evaluate((source) => {
            const createMotionScheduler = (0, eval)(`(${source})`) as () => {
                register(node: Element): void
            }
            const scheduler = createMotionScheduler()
            document.querySelectorAll('.cs-metal').forEach((el) => scheduler.register(el))
        }, schedulerFactorySource())
        await page.waitForFunction(() => {
            const nodes = [...document.querySelectorAll('.cs-metal')]
            const running = nodes.filter((node) => !node.hasAttribute('data-cs-paused') && !node.hasAttribute('data-cs-static')).length
            const stat = nodes.filter((node) => node.getAttribute('data-cs-static') === 'true').length
            return running === 12 && stat === 8
        })
        const runningAnims = await page.evaluate(() =>
            [...document.querySelectorAll('.cs-metal')].filter((overlay) =>
                overlay.getAnimations({ subtree: true }).some((anim) => anim.playState === 'running'),
            ).length,
        )
        expect(runningAnims).toBeGreaterThan(0)
        expect(runningAnims).toBeLessThanOrEqual(12)
    })

    test('fill layer paints inside the glyph box', async ({ page }) => {
        const size = SIZES[0]
        await page.setViewportSize({ width: 390, height: 700 })
        await mount(page, frameHtml(size.name, size.width, size.height, size.size, '#FFFFFF'), fontCss)
        await freeze(page, 'apex')
        const diff = await pixelDiff(page, 'edge')
        expect(diff.changedIn).toBeGreaterThan(0)
    })

    test('idle join button is unchanged and the sheen sweeps once', async ({ page }, testInfo) => {
        await page.setViewportSize({ width: 800, height: 400 })
        await page.setContent(
            `<!doctype html><html><body style="margin:16px;background:#0F1A2E">
                <button id="plain" style="${BUTTON_STYLE}">Join the Revolution</button>
                <button id="sheen" class="jr-sheen" style="${BUTTON_STYLE}">Join the Revolution</button>
            </body></html>`,
            { waitUntil: 'domcontentloaded' },
        )
        await page.addStyleTag({ path: CSS_PATH })
        const plain = await page.locator('#plain').screenshot()
        const sheen = await page.locator('#sheen').screenshot()
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
                let interior = 0
                let rim = 0
                for (let index = 0; index < dataA.length; index += 4) {
                    const delta = Math.abs(dataA[index] - dataB[index])
                        + Math.abs(dataA[index + 1] - dataB[index + 1])
                        + Math.abs(dataA[index + 2] - dataB[index + 2])
                        + Math.abs(dataA[index + 3] - dataB[index + 3])
                    if (delta === 0) continue
                    const pixel = index / 4
                    const x = pixel % a.width
                    const y = Math.floor(pixel / a.width)
                    const onRim = x < 2 || y < 2 || x >= a.width - 2 || y >= a.height - 2
                    if (onRim) rim += 1
                    else interior += 1
                }
                const button = document.querySelector<HTMLElement>('#sheen')
                return {
                    interior,
                    rim,
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
        // Opacity-0 pseudos do not paint the face. A few right-edge samples can
        // still differ where overflow clipping antialiases the rounded corner.
        expect(idle.interior).toBe(0)
        expect(idle.rim).toBeLessThanOrEqual(16)
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
