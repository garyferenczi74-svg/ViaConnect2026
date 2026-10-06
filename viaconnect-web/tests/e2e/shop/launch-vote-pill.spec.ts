/**
 * Brief 70 pill harness. No dev server and no auth.
 * Markup is built here so the runner does not import a CSS module from TSX.
 * Shop Playwright is not part of CI.
 */
import { execSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { LAUNCH_SASH_CLEARANCE_PX, fitLaunchSashLabel, launchSashOffsetInFrame } from '../../../src/components/shop/launch-sash-place'

const CSS = readFileSync(join(process.cwd(), 'src/components/ui/stardust-button.css'), 'utf8')
const OVERLAY_CSS = readFileSync(join(process.cwd(), 'src/components/shop/launch-vote-pill.css'), 'utf8')
const ARTIFACT_DIR = '/opt/cursor/artifacts/launch-vote'

const VIEWPORTS = [
    { name: '390', width: 390, height: 844 },
    { name: '1024', width: 1024, height: 768 },
    { name: '1280', width: 1280, height: 800 },
] as const

const FIT_VIEWPORTS = VIEWPORTS

const GLYPH = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4M8 7l4 4 4-4"/></svg>`

const TERMS = '25% off your first order of this product if you have not ordered before, or your next order if you have. Terms apply.'

function pageHtml(tone: 'white' | 'black', state: 'rest' | 'voted' | 'popular' | 'confirm' | 'static'): string {
    const rest = `
      <button type="button" class="vc-stardust" data-size="card" data-state="rest" data-interactive="true" data-testid="launch-vote-pill">
        <span class="vc-stardust-labels">
          <span class="vc-stardust-label vc-stardust-label-rest">Launching Soon</span>
          <span class="vc-stardust-label vc-stardust-label-alt">Vote for the next product launch</span>
        </span>
        <span class="vc-stardust-glyphs" aria-hidden="true">
          <span class="vc-stardust-glyph vc-stardust-glyph-rest">${GLYPH}</span>
          <span class="vc-stardust-glyph vc-stardust-glyph-alt">${GLYPH}</span>
        </span>
      </button>`
    const staticSash = `
      <span class="vc-stardust" data-size="card" data-state="rest" data-interactive="false" data-testid="launch-vote-pill">
        <span class="vc-stardust-labels">
          <span class="vc-stardust-label vc-stardust-label-rest">Launching Soon</span>
        </span>
      </span>`
    const voted = `<span class="vc-stardust" data-size="card" data-state="voted" data-testid="launch-vote-pill" role="status"><span class="vc-stardust-labels"><span class="vc-stardust-label">You voted. 25% off at launch</span></span></span>`
    const popular = `<span class="vc-stardust" data-size="card" data-state="popular" data-testid="launch-vote-pill"><span class="vc-stardust-labels vc-stardust-labels-stack"><span class="vc-stardust-label">By Popular Demand</span><span class="vc-stardust-detail">Releases Oct 5</span></span></span>`
    const confirm = `${rest}
      <div class="vc-vote-dialog"><div class="vc-vote-dialog-card" role="dialog" aria-modal="true">
        <h2>Vote for Creatine Fixture?</h2>
        <p>One vote per product. Votes can't be undone.</p>
        <button type="button" class="vc-vote-dialog-submit">Submit vote</button>
        <button type="button" class="vc-vote-dialog-cancel">Cancel</button>
      </div></div>`
    const body = state === 'voted' ? voted : state === 'popular' ? popular : state === 'confirm' ? confirm : state === 'static' ? staticSash : rest
    const terms = state === 'rest' || state === 'confirm'
        ? `<div class="vc-launch-vote-notes" data-testid="launch-vote-terms"><span class="vc-stardust-note">${TERMS}</span></div>`
        : ''
    const bottleFill = tone === 'black'
        ? 'linear-gradient(90deg, #050505 0%, #2c2c2c 28%, #4a4a4a 46%, #111111 58%, #2a2a2a 100%)'
        : 'linear-gradient(90deg, #8b939b 0%, #e6e8eb 22%, #ffffff 42%, #f7f7f8 56%, #c5c9ce 100%)'
    return `<!DOCTYPE html><html><head><style>
      ${CSS}
      ${OVERLAY_CSS}
      body { margin: 0; background: #0F1A2E; font-family: Inter, sans-serif; }
      .stack { width: 280px; margin: 40px auto; }
      .card { position: relative; width: 280px; height: 360px; background: #ffffff; overflow: hidden; border-radius: 12px; }
      .bottle-shape {
        position: absolute;
        left: 50%;
        top: 7%;
        width: 62%;
        height: 84%;
        transform: translateX(-50%);
        border-radius: 36px 36px 24px 24px;
        background: ${bottleFill};
      }
    </style></head><body>
      <div class="stack">
      <div class="card" data-testid="bottle" data-tone="${tone}">
        <div class="bottle-shape" data-testid="bottle-shape"></div>
        <div class="vc-launch-vote" data-size="card">${body}</div>
      </div>
      ${terms}
      </div>
    </body></html>`
}

function cssColor(value: string): string {
    return value.replace(/\s/g, '')
}

test.beforeEach(({ }, info) => {
    test.skip(info.project.name !== 'laptop-1024', 'one desktop project; viewports are set inside')
})

test('states A through D and confirm at 390 and 1280', async ({ page }) => {
    mkdirSync(ARTIFACT_DIR, { recursive: true })
    for (const viewport of VIEWPORTS) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        const restWidths: number[] = []
        for (const tone of ['white', 'black'] as const) {
            await page.setContent(pageHtml(tone, 'rest'), { waitUntil: 'domcontentloaded' })
            const pill = page.getByTestId('launch-vote-pill')
            const restPaint = await pill.evaluate((node) => {
                const style = getComputedStyle(node)
                return { background: style.backgroundColor, blur: style.backdropFilter }
            })
            expect(cssColor(restPaint.background)).toBe('rgba(42,76,158,0.12)')
            expect(restPaint.blur).toContain('blur')
            await tuckSash(page)
            const before = await pill.boundingBox()
            restWidths.push(before?.width ?? -1)
            await page.screenshot({
                path: join(ARTIFACT_DIR, `A-rest-${tone}-${viewport.name}.png`),
            })
            const placed = await pill.evaluate((node) => {
                const style = getComputedStyle(node)
                const overlay = node.parentElement ? getComputedStyle(node.parentElement) : null
                return {
                    transform: style.transform,
                    origin: style.transformOrigin,
                    overflow: overlay?.overflow ?? '',
                }
            })
            expect(placed.transform).toContain('matrix')
            expect(placed.origin.startsWith('0px')).toBe(false)
            expect(placed.overflow).toBe('hidden')
            const cardBox = await page.getByTestId('bottle').boundingBox()
            const restCenterX = (before?.x ?? 0) + (before?.width ?? 0) / 2
            const restCenterY = (before?.y ?? 0) + (before?.height ?? 0) / 2
            expect(restCenterX).toBeLessThan((cardBox?.x ?? 0) + (cardBox?.width ?? 0) * 0.45)
            expect(restCenterY).toBeLessThan((cardBox?.y ?? 0) + (cardBox?.height ?? 0) * 0.45)
            const clearance = await pill.evaluate(readMinPad)
            expect(clearance).toBeGreaterThanOrEqual(8)
            const restLabel = await pill.evaluate(readSharedLabel)
            expect(restLabel.restCenterDelta).toBeLessThanOrEqual(1)
            expect(restLabel.lines).toBeLessThanOrEqual(3)
            expect(restLabel.lines).toBeGreaterThan(0)
            const terms = page.getByTestId('launch-vote-terms')
            const termsBox = await terms.boundingBox()
            expect(termsBox?.y ?? 0).toBeGreaterThanOrEqual((cardBox?.y ?? 0) + (cardBox?.height ?? 0) - 1)
            const termsPaint = await terms.locator('.vc-stardust-note').evaluate((node) => getComputedStyle(node).backgroundColor)
            expect(cssColor(termsPaint)).toBe('rgba(42,76,158,0.12)')
            expect(await terms.evaluate((node) => node.closest('[data-testid="bottle"]') === null)).toBe(true)
            await pill.hover()
            await expect.poll(async () => cssColor(await pill.evaluate((node) => getComputedStyle(node).backgroundColor))).toBe('rgba(15,77,51,0.2)')
            const after = await pill.boundingBox()
            expect(before?.width).toBe(after?.width)
            expect(before?.height).toBe(after?.height)
            expect(before?.x).toBe(after?.x)
            expect(before?.y).toBe(after?.y)
            const hoverLabel = await pill.evaluate(readSharedLabel)
            expect(hoverLabel.clipped, `${tone} ${viewport.name}`).toBe(false)
            expect(hoverLabel.lines).toBeGreaterThan(0)
            expect(hoverLabel.lines).toBeLessThanOrEqual(3)
            expect(hoverLabel.clamp === 'none' || hoverLabel.clamp === 'unset' || hoverLabel.clamp === '').toBe(true)
            expect(hoverLabel.text).toBe('Vote for the next product launch')
            const hoverClearance = await pill.evaluate(readMinPad)
            expect(hoverClearance, `${tone} ${viewport.name} hover`).toBeGreaterThanOrEqual(8)
            await page.screenshot({
                path: join(ARTIFACT_DIR, `B-hover-${tone}-${viewport.name}.png`),
            })
            await page.keyboard.press('Tab')
            await expect(pill).toBeFocused()
            const focused = await pill.boundingBox()
            expect(focused?.width).toBe(before?.width)
            expect(focused?.height).toBe(before?.height)
            expect(await pill.evaluate((node) => getComputedStyle(node.querySelector('.vc-stardust-label-alt') as Element).visibility)).toBe('visible')
            const box = await pill.boundingBox()
            if (!box) throw new Error('missing pill box')
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
            await page.mouse.down()
            const active = await pill.boundingBox()
            expect(active?.width).toBe(before?.width)
            expect(active?.height).toBe(before?.height)
            const activeLabel = await pill.evaluate(readSharedLabel)
            expect(activeLabel.clipped).toBe(false)
            expect(activeLabel.lines).toBeLessThanOrEqual(3)
            expect(activeLabel.text).toBe('Vote for the next product launch')
            const metrics = await pill.evaluate((node) => {
                const style = getComputedStyle(node)
                const labels = [...node.querySelectorAll('.vc-stardust-label')]
                const restLabel = node.querySelector('.vc-stardust-label-rest')
                const clipped = restLabel
                    ? getComputedStyle(restLabel).visibility !== 'hidden' &&
                      (restLabel.scrollHeight > restLabel.clientHeight + 1 ||
                          restLabel.scrollWidth > restLabel.clientWidth + 1)
                    : false
                return {
                    borderLeft: style.borderLeftWidth,
                    borderRight: style.borderRightWidth,
                    boxSizing: style.boxSizing,
                    appearance: style.appearance,
                    clipped,
                    restText: restLabel?.textContent ?? '',
                    text: labels.map((label) => label.textContent).join('|'),
                }
            })
            expect(metrics.borderLeft).toBe('1px')
            expect(metrics.borderRight).toBe('1px')
            expect(metrics.boxSizing).toBe('border-box')
            expect(metrics.appearance).toBe('none')
            expect(metrics.clipped).toBe(false)
            expect(metrics.text).toContain('Launching Soon')
            expect(metrics.text).toContain('Vote for the next product launch')
            await page.mouse.up()
            await page.setContent(pageHtml(tone, 'static'), { waitUntil: 'domcontentloaded' })
            await tuckSash(page)
            const staticPill = page.getByTestId('launch-vote-pill')
            await staticPill.hover()
            expect(cssColor(await staticPill.evaluate((node) => getComputedStyle(node).backgroundColor))).toBe('rgba(42,76,158,0.12)')
            await page.screenshot({
                path: join(ARTIFACT_DIR, `E-static-${tone}-${viewport.name}.png`),
            })
            for (const state of ['voted', 'popular', 'confirm'] as const) {
                await page.setContent(pageHtml(tone, state), { waitUntil: 'domcontentloaded' })
                await tuckSash(page)
                if (state !== 'confirm') {
                    const painted = await page.getByTestId('launch-vote-pill').evaluate((node) => getComputedStyle(node).backgroundColor)
                    expect(cssColor(painted)).toBe('rgba(15,77,51,0.2)')
                }
                const label = state === 'voted' ? 'C-voted' : state === 'popular' ? 'D-popular' : 'confirm'
                await page.screenshot({
                    path: join(ARTIFACT_DIR, `${label}-${tone}-${viewport.name}.png`),
                })
            }
        }
        expect(restWidths[0]).toBe(restWidths[1])
        expect(restWidths[0]).toBeGreaterThan(0)
    }
})

function readMinPad(node: HTMLElement): number {
    const pillNode = node
    const card = (pillNode.closest('[data-testid="bottle"]') as HTMLElement | null)
        ?? (pillNode.parentElement as HTMLElement)
    const w = pillNode.offsetWidth
    const h = pillNode.offsetHeight
    const style = getComputedStyle(pillNode)
    const origin = style.transformOrigin.split(' ').map((part) => parseFloat(part))
    const matrix = new DOMMatrix(style.transform)
    const cardRect = card.getBoundingClientRect()
    const host = pillNode.offsetParent as HTMLElement
    const hostRect = host.getBoundingClientRect()
    const radius = h / 2
    const samples: Array<[number, number]> = []
    for (let i = 0; i <= 12; i += 1) {
        const leftAngle = Math.PI / 2 + (Math.PI * i) / 12
        const rightAngle = -Math.PI / 2 + (Math.PI * i) / 12
        samples.push([radius + Math.cos(leftAngle) * radius, radius + Math.sin(leftAngle) * radius])
        samples.push([w - radius + Math.cos(rightAngle) * radius, radius + Math.sin(rightAngle) * radius])
    }
    for (let i = 0; i <= 8; i += 1) {
        const x = radius + ((w - radius * 2) * i) / 8
        samples.push([x, 0])
        samples.push([x, h])
    }
    let minPad = Number.POSITIVE_INFINITY
    for (const [x, y] of samples) {
        const point = matrix.transformPoint(new DOMPoint(x - origin[0], y - origin[1]))
        const sx = hostRect.left + pillNode.offsetLeft + origin[0] + point.x
        const sy = hostRect.top + pillNode.offsetTop + origin[1] + point.y
        minPad = Math.min(minPad, sx - cardRect.left, sy - cardRect.top, cardRect.right - sx, cardRect.bottom - sy)
    }
    return minPad
}

function readSharedLabel(node: HTMLElement): {
    clipped: boolean
    lines: number
    clamp: string
    text: string
    restCenterDelta: number
} {
    const alt = node.querySelector<HTMLElement>('.vc-stardust-label-alt')
    const rest = node.querySelector<HTMLElement>('.vc-stardust-label-rest')
    const labels = node.querySelector<HTMLElement>('.vc-stardust-labels')
    const shown = [alt, rest].filter((el): el is HTMLElement => {
        if (!el) return false
        return getComputedStyle(el).visibility !== 'hidden'
    })
    const clipped = shown.some((el) => el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1)
    const altStyle = alt ? getComputedStyle(alt) : null
    const line = altStyle ? parseFloat(altStyle.lineHeight) || 15 : 15
    const lines = alt ? Math.round(alt.scrollHeight / line) : 0
    let restCenterDelta = 0
    if (labels && rest && getComputedStyle(rest).visibility !== 'hidden' && rest.offsetParent === labels) {
        const slack = labels.clientHeight - rest.offsetHeight
        restCenterDelta = Math.abs(rest.offsetTop - slack / 2)
    }
    return {
        clipped,
        lines,
        clamp: altStyle?.webkitLineClamp ?? '',
        text: alt?.textContent ?? '',
        restCenterDelta,
    }
}

async function tuckSash(page: Page): Promise<void> {
    const pills = page.getByTestId('launch-vote-pill')
    const count = await pills.count()
    for (let index = 0; index < count; index += 1) {
        await pills.nth(index).evaluate(fitLaunchSashLabel)
        const metrics = await pills.nth(index).evaluate((node) => {
            const pill = node as HTMLElement
            const frame = pill.parentElement as HTMLElement
            return {
                width: pill.offsetWidth,
                height: pill.offsetHeight,
                frameWidth: frame.clientWidth,
                frameHeight: frame.clientHeight,
            }
        })
        const next = launchSashOffsetInFrame(
            metrics.width,
            metrics.height,
            metrics.frameWidth,
            metrics.frameHeight,
            LAUNCH_SASH_CLEARANCE_PX + 1,
        )
        await pills.nth(index).evaluate((node, offset) => {
            const pill = node as HTMLElement
            pill.style.left = `${offset.left}px`
            pill.style.top = `${offset.top}px`
        }, next)
    }
}

const REAL_LAYOUT = `
  body { margin: 0; background: #0F1A2E; font-family: Inter, sans-serif; }
  .sash-shell { margin-left: 0; }
  @media (min-width: 1024px) { .sash-shell { margin-left: 260px; } }
  .sash-shop { box-sizing: border-box; max-width: 80rem; margin-inline: auto; padding-inline: 1rem; }
  @media (min-width: 768px) { .sash-shop { padding-inline: 1.5rem; } }
  .sash-plp { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.5rem; }
  @media (min-width: 768px) {
    .sash-plp { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2rem; }
  }
  @media (min-width: 1280px) {
    .sash-plp { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 2rem; }
  }
  .sash-pdp { display: grid; grid-template-columns: minmax(0, 1fr); gap: 2rem; }
  @media (min-width: 1024px) {
    .sash-pdp { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3rem; }
  }
  .relative { position: relative; }
  .overflow-hidden { overflow: hidden; }
  .block { display: block; }
  .w-full { width: 100%; }
  .flex { display: flex; }
  .flex-col { flex-direction: column; }
  .gap-2 { gap: 0.5rem; }
  .gap-3 { gap: 0.75rem; }
  .h-full { height: 100%; }
  .rounded-xl { border-radius: 0.75rem; }
  .rounded-2xl { border-radius: 1rem; }
  .bg-white { background: #fff; }
  .aspect-\\[3\\/4\\] { aspect-ratio: 3 / 4; }
  .aspect-\\[4\\/5\\] { aspect-ratio: 4 / 5; }
  @media (min-width: 768px) {
    .md\\:aspect-\\[4\\/5\\] { aspect-ratio: 4 / 5; }
  }
`

function realHarness(surface: 'card' | 'pdp', builtCss: string, bottle?: string): string {
    const bottleAttr = bottle ? ` data-bottle="${bottle}"` : ''
    return `<!DOCTYPE html><html data-sash-surface="${surface}"${bottleAttr}><head><style>${builtCss}${REAL_LAYOUT}</style></head><body><script>window.process={env:{NODE_ENV:"production"}}</script><div id="root"></div></body></html>`
}

test('real ProductCard and PDP caps clear by 8px at 390, 1024, and 1280', async ({ page }) => {
    execSync('npx vite build --config tests/e2e/shop/sash-fit.vite.config.ts', {
        cwd: process.cwd(),
        stdio: 'inherit',
    })
    mkdirSync(ARTIFACT_DIR, { recursive: true })
    const builtCss = readFileSync('/tmp/sash-fit-46e3/viaconnect-web.css', 'utf8')
    const bundlePath = '/tmp/sash-fit-46e3/sash-fit.js'
    const cardSource = readFileSync(join(process.cwd(), 'src/components/shop/ProductCard.tsx'), 'utf8')
    const pdpSource = readFileSync(
        join(process.cwd(), 'src/app/(app)/(consumer)/shop/product/[slug]/page.tsx'),
        'utf8',
    )
    expect(cardSource).toContain('aspect-[3/4] md:aspect-[4/5]')
    expect(pdpSource).toContain('aspect-[4/5] w-full overflow-hidden rounded-2xl')
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    for (const surface of ['card', 'pdp'] as const) {
        for (const viewport of FIT_VIEWPORTS) {
            await page.setViewportSize({ width: viewport.width, height: viewport.height })
            await page.setContent(realHarness(surface, builtCss), { waitUntil: 'domcontentloaded' })
            await page.addScriptTag({ path: bundlePath })
            await page.waitForSelector('[data-sash-placed="true"]', { state: 'attached', timeout: 8000 })
            await page.evaluate(() => document.fonts.ready)
            const fit = await page.getByTestId('launch-vote-pill').evaluate((node) => {
                const pill = node as HTMLElement
                const frame = pill.parentElement as HTMLElement
                const rest = pill.querySelector('.vc-stardust-label-rest')
                const style = getComputedStyle(pill)
                const restStyle = rest ? getComputedStyle(rest) : null
                const w = pill.offsetWidth
                const h = pill.offsetHeight
                const origin = style.transformOrigin.split(' ').map((part) => parseFloat(part))
                const matrix = new DOMMatrix(style.transform)
                const frameRect = frame.getBoundingClientRect()
                const host = pill.offsetParent as HTMLElement
                const hostRect = host.getBoundingClientRect()
                const radius = h / 2
                const samples: Array<[number, number]> = []
                for (let i = 0; i <= 16; i += 1) {
                    const leftAngle = Math.PI / 2 + (Math.PI * i) / 16
                    const rightAngle = -Math.PI / 2 + (Math.PI * i) / 16
                    samples.push([radius + Math.cos(leftAngle) * radius, radius + Math.sin(leftAngle) * radius])
                    samples.push([w - radius + Math.cos(rightAngle) * radius, radius + Math.sin(rightAngle) * radius])
                }
                let minPad = Number.POSITIVE_INFINITY
                for (const [x, y] of samples) {
                    const point = matrix.transformPoint(new DOMPoint(x - origin[0], y - origin[1]))
                    const sx = hostRect.left + pill.offsetLeft + origin[0] + point.x
                    const sy = hostRect.top + pill.offsetTop + origin[1] + point.y
                    minPad = Math.min(
                        minPad,
                        sx - frameRect.left,
                        sy - frameRect.top,
                        frameRect.right - sx,
                        frameRect.bottom - sy,
                    )
                }
                const text = rest?.textContent ?? ''
                return {
                    minPad,
                    text,
                    fontSize: style.fontSize,
                    padding: style.padding,
                    frameWidth: frame.clientWidth,
                    frameHeight: frame.clientHeight,
                    pillWidth: w,
                    pillHeight: h,
                    restScroll: rest ? rest.scrollWidth - rest.clientWidth : 999,
                    ellipsis: text.includes('…') || text.includes('...'),
                    lineClamp: restStyle?.webkitLineClamp ?? '',
                }
            })
            expect(fit.ellipsis, `${surface} ${viewport.name}`).toBe(false)
            expect(fit.text).toBe('Launching Soon')
            expect(fit.fontSize).toBe('12px')
            expect(fit.padding).toBe('6px 14px')
            expect(fit.restScroll).toBeLessThanOrEqual(1)
            expect(fit.minPad, `${surface} ${viewport.name} frame ${fit.frameWidth}x${fit.frameHeight} pill ${fit.pillWidth}x${fit.pillHeight}`).toBeGreaterThanOrEqual(8)
            const restShared = await page.getByTestId('launch-vote-pill').evaluate(readSharedLabel)
            expect(restShared.restCenterDelta, `${surface} ${viewport.name} rest center`).toBeLessThanOrEqual(1)
            expect(restShared.lines).toBeLessThanOrEqual(3)
            if (viewport.name === '390' || viewport.name === '1280') {
                await page.locator('[data-testid="sash-grid"] > *').screenshot({
                    path: join(ARTIFACT_DIR, `${surface}-rest-${viewport.name}.png`),
                })
            }
            const before = await page.getByTestId('launch-vote-pill').boundingBox()
            await page.getByTestId('launch-vote-pill').hover()
            const after = await page.getByTestId('launch-vote-pill').boundingBox()
            expect(after?.width).toBe(before?.width)
            expect(after?.height).toBe(before?.height)
            expect(after?.x).toBe(before?.x)
            expect(after?.y).toBe(before?.y)
            const hoverShared = await page.getByTestId('launch-vote-pill').evaluate(readSharedLabel)
            expect(hoverShared.clipped, `${surface} ${viewport.name} hover`).toBe(false)
            expect(hoverShared.lines).toBeGreaterThan(0)
            expect(hoverShared.lines).toBeLessThanOrEqual(3)
            expect(hoverShared.text).toBe('Vote for the next product launch')
            expect(hoverShared.clamp === 'none' || hoverShared.clamp === 'unset' || hoverShared.clamp === '').toBe(true)
            const hoverPad = await page.getByTestId('launch-vote-pill').evaluate(readMinPad)
            expect(hoverPad, `${surface} ${viewport.name} hover minPad`).toBeGreaterThanOrEqual(8)
            const terms = page.getByTestId('launch-vote-terms')
            const termsBox = await terms.boundingBox()
            const frameBox = await page.getByTestId('launch-vote-overlay').boundingBox()
            expect(termsBox?.y ?? 0).toBeGreaterThanOrEqual((frameBox?.y ?? 0) + (frameBox?.height ?? 0) - 1)
            await page.locator('[data-testid="sash-grid"] > *').screenshot({
                path: join(ARTIFACT_DIR, `${surface}-hover-${viewport.name}.png`),
            })
        }
    }

    const bottleFile = '/tmp/bottles/mthfr.png'
    execSync(
        `mkdir -p /tmp/bottles && test -s ${bottleFile} || curl -fsSL -o ${bottleFile} ${JSON.stringify('https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Methylation%20SNP%20Support/mthfr-plus-folate-metabolism.png')}`,
        { stdio: 'inherit' },
    )
    const bottleUrl = 'https://bottle.test/mthfr.png'
    await page.route(bottleUrl, (route) => route.fulfill({ path: bottleFile, contentType: 'image/png' }))
    for (const viewport of [
        { name: '390', width: 390, height: 844 },
        { name: '1280', width: 1280, height: 800 },
    ] as const) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        await page.setContent(realHarness('card', builtCss, bottleUrl), { waitUntil: 'domcontentloaded' })
        await page.addScriptTag({ path: bundlePath })
        await page.waitForSelector('[data-sash-placed="true"]', { state: 'attached', timeout: 8000 })
        await page.evaluate(() => document.fonts.ready)
        await expect.poll(async () => page.locator('img').first().evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(200)
        const pill = page.getByTestId('launch-vote-pill')
        const restBox = await pill.boundingBox()
        const restShared = await pill.evaluate(readSharedLabel)
        expect(restShared.restCenterDelta).toBeLessThanOrEqual(1)
        expect(restShared.lines).toBeLessThanOrEqual(3)
        expect(await pill.evaluate(readMinPad)).toBeGreaterThanOrEqual(8)
        await page.locator('[data-testid="sash-grid"] > *').screenshot({
            path: join(ARTIFACT_DIR, `dark-mthfr-rest-${viewport.name}.png`),
        })
        await pill.hover()
        const hoverBox = await pill.boundingBox()
        expect(hoverBox?.width).toBe(restBox?.width)
        expect(hoverBox?.height).toBe(restBox?.height)
        expect(hoverBox?.x).toBe(restBox?.x)
        expect(hoverBox?.y).toBe(restBox?.y)
        const hoverShared = await pill.evaluate(readSharedLabel)
        expect(hoverShared.clipped, `dark ${viewport.name}`).toBe(false)
        expect(hoverShared.lines).toBeGreaterThan(0)
        expect(hoverShared.lines).toBeLessThanOrEqual(3)
        expect(hoverShared.text).toBe('Vote for the next product launch')
        expect(await pill.evaluate(readMinPad), `dark ${viewport.name} hover`).toBeGreaterThanOrEqual(8)
        await page.locator('[data-testid="sash-grid"] > *').screenshot({
            path: join(ARTIFACT_DIR, `dark-mthfr-hover-${viewport.name}.png`),
        })
    }
    expect(pageErrors).toEqual([])
})

function dismissHtml(): string {
    return `<!DOCTYPE html><html><head><style>
      ${CSS}
      ${OVERLAY_CSS}
      body { margin: 0; background: #0F1A2E; font-family: Inter, system-ui, sans-serif; }
      .card { position: relative; width: 180px; height: 240px; margin: 24px auto; background: #111; }
    </style></head><body>
      <a id="card" href="/shop/product/acat-plus-mitochondrial-support" style="position:fixed;inset:0;display:block;">
      <div class="vc-vote-dialog" id="dialog" data-testid="launch-vote-dialog">
        <div class="vc-vote-dialog-card" role="dialog" aria-modal="true" data-testid="launch-vote-confirm">
          <h2>Vote for ACAT+?</h2>
          <p>One vote per product. Votes can't be undone.</p>
          <div class="vc-vote-dialog-actions">
            <button type="button" class="vc-vote-dialog-submit">Submit vote</button>
            <button type="button" class="vc-vote-dialog-cancel">Cancel</button>
          </div>
        </div>
      </div>
      </a>
      <script>
        if (!document.documentElement.dataset.voteBound) {
          document.documentElement.dataset.voteBound = '1'
          const card = document.getElementById('card')
          const dialog = document.getElementById('dialog')
          window.__navigated = 0
          card.addEventListener('click', (event) => {
            window.__navigated += 1
            event.preventDefault()
          })
          function seal(event) { event.preventDefault(); event.stopPropagation() }
          function arm(event) {
            const origin = { x: event.clientX, y: event.clientY }
            const block = (next) => {
              if (typeof next.clientX !== 'number') return
              if (Math.abs(next.clientX - origin.x) > 24 || Math.abs(next.clientY - origin.y) > 24) return
              next.preventDefault()
              next.stopPropagation()
            }
            document.addEventListener('click', block, true)
            setTimeout(() => document.removeEventListener('click', block, true), 350)
          }
          function closeDialog(event) {
            seal(event)
            arm(event)
            dialog.remove()
          }
          dialog.addEventListener('pointerdown', (event) => event.stopPropagation())
          dialog.addEventListener('click', (event) => {
            seal(event)
            if (event.target === dialog) closeDialog(event)
          })
          const panel = dialog.querySelector('.vc-vote-dialog-card')
          panel.addEventListener('pointerdown', (event) => event.stopPropagation())
          panel.addEventListener('click', seal)
          dialog.querySelector('.vc-vote-dialog-cancel').addEventListener('click', closeDialog)
          dialog.querySelector('.vc-vote-dialog-submit').addEventListener('click', (event) => {
            seal(event)
            arm(event)
            dialog.remove()
          })
          document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape' || !dialog.isConnected) return
            event.preventDefault()
            event.stopPropagation()
            dialog.remove()
          })
        }
      </script>
    </body></html>`
}

async function navigatedCount(page: import('@playwright/test').Page): Promise<number> {
    return page.evaluate(() => {
        const win = window as Window & { __navigated?: number }
        return win.__navigated ?? 0
    })
}

test('Cancel, overlay, Submit, and Escape do not open the product', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })

    await page.setContent(dismissHtml(), { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Vote for ACAT+?' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(1)
    expect(await navigatedCount(page)).toBe(0)

    const cancel = page.getByRole('button', { name: 'Cancel' })
    const cancelBox = await cancel.boundingBox()
    if (!cancelBox) throw new Error('missing Cancel box')
    await cancel.click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(await navigatedCount(page)).toBe(0)
    expect(page.url()).not.toContain('acat-plus-mitochondrial-support')
    await page.mouse.click(cancelBox.x + cancelBox.width / 2, cancelBox.y + cancelBox.height / 2)
    expect(await navigatedCount(page)).toBe(0)
    await page.locator('#card').click()
    expect(await navigatedCount(page)).toBe(1)

    await page.setContent(dismissHtml(), { waitUntil: 'domcontentloaded' })
    await page.getByTestId('launch-vote-dialog').click({ position: { x: 8, y: 8 } })
    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(await navigatedCount(page)).toBe(0)
    expect(page.url()).not.toContain('acat-plus-mitochondrial-support')

    await page.setContent(dismissHtml(), { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Submit vote' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(await navigatedCount(page)).toBe(0)
    expect(page.url()).not.toContain('acat-plus-mitochondrial-support')

    await page.setContent(dismissHtml(), { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Submit vote' }).focus()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(await navigatedCount(page)).toBe(0)
    expect(page.url()).not.toContain('acat-plus-mitochondrial-support')
})
