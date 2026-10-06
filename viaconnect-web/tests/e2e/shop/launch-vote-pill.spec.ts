/**
 * Brief 70 pill harness. No dev server and no auth.
 * Markup is built here so the runner does not import a CSS module from TSX.
 * Shop Playwright is not part of CI.
 */
import { execSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { LAUNCH_SASH_CLEARANCE_PX, fitLaunchSashLabel, launchSashOffsetInFrame } from '../../../src/components/shop/launch-sash-place'

const CSS = readFileSync(join(process.cwd(), 'src/components/ui/stardust-button.css'), 'utf8')
const OVERLAY_CSS = readFileSync(join(process.cwd(), 'src/components/shop/launch-vote-pill.css'), 'utf8')
const ARTIFACT_DIR = '/opt/cursor/artifacts/launch-vote'
const A8_DIR = '/opt/cursor/artifacts/launch-vote-a8'

/**
 * VIACURA wordmark ink on the MTHFR+ bottle
 * (mthfr-plus-folate-metabolism.png, 3000×4000).
 * Gold ink is R>150, G>100, B<110, and R>G. Rows and columns with 15 or
 * fewer ink pixels are dropped so a one-pixel antialias speck is not the
 * box. Inclusive bounds are x 906–2094 and y 1429–1614. The test maps this
 * box through the rendered img's object-fit and object-position.
 */
const VIACURA_WORDMARK = { x: 906, y: 1429, w: 1189, h: 186 }

/**
 * VIACURA wordmark on histamine-relief-protocol.png, 3000×4000.
 * Same gold-ink rule as MTHFR+ (R>150, G>100, B<110, R>G). The letters
 * sit higher on this bottle: inclusive bounds x 883–2117, y 1275–1460.
 */
const HISTAMINE_WORDMARK = { x: 883, y: 1275, w: 1235, h: 186 }

/** Lowest non-white bottle pixel in each 3000×4000 photo. Both bases sit on the same row. */
const BOTTLE_BASE_Y = { mthfr: 3398, histamine: 3395 } as const

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
    test.setTimeout(120_000)
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
    altScroll: number
    altClient: number
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
        altScroll: alt?.scrollHeight ?? 0,
        altClient: alt?.clientHeight ?? 0,
    }
}

function measureAgainst(args: {
    word: { x: number; y: number; w: number; h: number } | null
    badgeText: string | null
    hypothetical: Array<{ name: string; width: number; height: number; clearance: number }>
}): {
    gap: number | null
    mapped: {
        left: number
        top: number
        right: number
        bottom: number
        scale: number
        fit: string
        objectPosition: string
        frameWidth: number
        frameHeight: number
    } | null
    badgeGap: number | null
    badge: { left: number; top: number; right: number; bottom: number; width: number; height: number } | null
    pillWidth: number
    pillHeight: number
    fontSize: string
    padding: string
    lineHeight: string
    hypotheticalGaps: Record<string, number>
} {
    function objectOffset(token: string, container: number, content: number): number {
        if (token === 'left' || token === 'top' || token === '0%') return 0
        if (token === 'center' || token === '50%') return (container - content) / 2
        if (token === 'right' || token === 'bottom' || token === '100%') return container - content
        if (token.endsWith('%')) return (container - content) * (parseFloat(token) / 100)
        const px = parseFloat(token)
        return Number.isFinite(px) ? px : (container - content) / 2
    }
    function stadiumGap(
        pill: HTMLElement,
        target: { left: number; top: number; right: number; bottom: number },
    ): number {
        const w = pill.offsetWidth
        const h = pill.offsetHeight
        const style = getComputedStyle(pill)
        const origin = style.transformOrigin.split(' ').map((part) => parseFloat(part))
        const matrix = new DOMMatrix(style.transform).inverse()
        const host = pill.offsetParent as HTMLElement
        const hostRect = host.getBoundingClientRect()
        const originX = hostRect.left + pill.offsetLeft + origin[0]
        const originY = hostRect.top + pill.offsetTop + origin[1]
        const radius = h / 2
        let best = Number.POSITIVE_INFINITY
        for (let i = 0; i <= 64; i += 1) {
            for (let j = 0; j <= 24; j += 1) {
                const sx = target.left + ((target.right - target.left) * i) / 64
                const sy = target.top + ((target.bottom - target.top) * j) / 24
                const local = matrix.transformPoint(new DOMPoint(sx - originX, sy - originY))
                const lx = local.x + origin[0]
                const ly = local.y + origin[1]
                const axisX = Math.max(radius, Math.min(w - radius, lx))
                const gap = Math.hypot(lx - axisX, ly - h / 2) - radius
                if (gap < best) best = gap
            }
        }
        return best
    }
    function hypotheticalGap(
        word: { left: number; top: number; right: number; bottom: number },
        frameLeft: number,
        frameTop: number,
        width: number,
        height: number,
        clearance: number,
    ): number {
        const radius = height / 2
        const reach = (width / 2 - radius) * Math.SQRT1_2 + radius
        const cx = frameLeft + clearance + reach
        const cy = frameTop + clearance + reach
        const c = Math.SQRT1_2
        let best = Number.POSITIVE_INFINITY
        for (let i = 0; i <= 48; i += 1) {
            for (let j = 0; j <= 16; j += 1) {
                const sx = word.left + ((word.right - word.left) * i) / 48
                const sy = word.top + ((word.bottom - word.top) * j) / 16
                const dx = sx - cx
                const dy = sy - cy
                const lx = (dx - dy) * c
                const ly = (dx + dy) * c
                const half = width / 2 - radius
                const axis = Math.max(-half, Math.min(half, lx))
                const gap = Math.hypot(lx - axis, ly) - radius
                if (gap < best) best = gap
            }
        }
        return best
    }
    const node = document.querySelector('[data-testid="launch-vote-pill"]') as HTMLElement
    const frame = node.parentElement as HTMLElement
    const frameRect = frame.getBoundingClientRect()
    const style = getComputedStyle(node)
    let mapped: {
        left: number
        top: number
        right: number
        bottom: number
        scale: number
        fit: string
        objectPosition: string
        frameWidth: number
        frameHeight: number
    } | null = null
    let gap: number | null = null
    if (args.word) {
        const img = document.querySelector('img') as HTMLImageElement
        const rect = img.getBoundingClientRect()
        const imgStyle = getComputedStyle(img)
        const fit = imgStyle.objectFit
        const scale = fit === 'contain'
            ? Math.min(rect.width / img.naturalWidth, rect.height / img.naturalHeight)
            : Math.max(rect.width / img.naturalWidth, rect.height / img.naturalHeight)
        const drawnW = img.naturalWidth * scale
        const drawnH = img.naturalHeight * scale
        const parts = imgStyle.objectPosition.trim().split(/\s+/)
        const ox = objectOffset(parts[0] ?? '50%', rect.width, drawnW)
        const oy = objectOffset(parts[1] ?? '50%', rect.height, drawnH)
        const left = rect.left + ox + args.word.x * scale
        const top = rect.top + oy + args.word.y * scale
        mapped = {
            left,
            top,
            right: left + args.word.w * scale,
            bottom: top + args.word.h * scale,
            scale,
            fit,
            objectPosition: imgStyle.objectPosition,
            frameWidth: rect.width,
            frameHeight: rect.height,
        }
        gap = stadiumGap(node, mapped)
    }
    let badgeGap: number | null = null
    let badge: { left: number; top: number; right: number; bottom: number; width: number; height: number } | null = null
    if (args.badgeText) {
        const chip = [...document.querySelectorAll('span')].find((el) => el.textContent === args.badgeText) as HTMLElement | undefined
        if (chip) {
            const rect = chip.getBoundingClientRect()
            badge = { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height }
            badgeGap = stadiumGap(node, badge)
        }
    }
    const hypotheticalGaps: Record<string, number> = {}
    if (mapped) {
        for (const item of args.hypothetical) {
            hypotheticalGaps[item.name] = hypotheticalGap(mapped, frameRect.left, frameRect.top, item.width, item.height, item.clearance)
        }
    }
    return {
        gap,
        mapped,
        badgeGap,
        badge,
        pillWidth: node.offsetWidth,
        pillHeight: node.offsetHeight,
        fontSize: style.fontSize,
        padding: style.padding,
        lineHeight: style.lineHeight,
        hypotheticalGaps,
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
  .absolute { position: absolute; }
  .top-3 { top: 12px; }
  .right-3 { right: 12px; }
  .z-10 { z-index: 10; }
  .items-end { align-items: flex-end; }
  .gap-1 { gap: 4px; }
  .absolute.top-3.right-3 > span {
    box-sizing: border-box;
    font-size: 11px;
    line-height: 1.25;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    padding: 4px 8px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.8);
  }
  @media (min-width: 768px) {
    .md\\:aspect-\\[4\\/5\\] { aspect-ratio: 4 / 5; }
  }
`

function realHarness(
    surface: 'card' | 'pdp',
    builtCss: string,
    bottle?: string,
    product?: string,
    pairBottle?: string,
): string {
    const bottleAttr = bottle ? ` data-bottle="${bottle}"` : ''
    const productAttr = product ? ` data-product="${product}"` : ''
    const pairAttr = pairBottle ? ` data-sash-pair="1" data-bottle-b="${pairBottle}"` : ''
    return `<!DOCTYPE html><html data-sash-surface="${surface}"${bottleAttr}${productAttr}${pairAttr}><head><style>${builtCss}${REAL_LAYOUT}</style></head><body><script>window.process={env:{NODE_ENV:"production"}}</script><div id="root"></div></body></html>`
}

function readPairBaselines(bases: { mthfr: number; histamine: number }): Array<{
    alt: string
    baseY: number
    frameBottom: number
    baseFromFrameBottom: number
    imgBottomGap: number
    clipped: boolean
}> {
    function objectOffset(token: string, container: number, content: number): number {
        if (token === 'left' || token === 'top' || token === '0%') return 0
        if (token === 'center' || token === '50%') return (container - content) / 2
        if (token === 'right' || token === 'bottom' || token === '100%') return container - content
        if (token.endsWith('%')) return (container - content) * (parseFloat(token) / 100)
        const px = parseFloat(token)
        return Number.isFinite(px) ? px : (container - content) / 2
    }
    return [...document.querySelectorAll('.vc-card-photo-frame')].map((frame) => {
        const img = frame.querySelector('img') as HTMLImageElement
        const frameRect = frame.getBoundingClientRect()
        const imgRect = img.getBoundingClientRect()
        const style = getComputedStyle(img)
        const scale = style.objectFit === 'contain'
            ? Math.min(imgRect.width / img.naturalWidth, imgRect.height / img.naturalHeight)
            : Math.max(imgRect.width / img.naturalWidth, imgRect.height / img.naturalHeight)
        const drawnH = img.naturalHeight * scale
        const parts = style.objectPosition.trim().split(/\s+/)
        const oy = objectOffset(parts[1] ?? '50%', imgRect.height, drawnH)
        const imageY = img.alt.includes('Histamine') ? bases.histamine : bases.mthfr
        const baseY = imgRect.top + oy + imageY * scale
        return {
            alt: img.alt,
            baseY,
            frameBottom: frameRect.bottom,
            baseFromFrameBottom: frameRect.bottom - baseY,
            imgBottomGap: frameRect.bottom - imgRect.bottom,
            clipped: baseY >= frameRect.bottom - 1 || baseY <= frameRect.top,
        }
    })
}

function readBottleBaseline(imageY: number): number {
    const img = document.querySelector('img') as HTMLImageElement
    const frame = (img.closest('.vc-card-photo-frame') ?? img.parentElement) as HTMLElement
    const frameRect = frame.getBoundingClientRect()
    const imgRect = img.getBoundingClientRect()
    const style = getComputedStyle(img)
    const scale = style.objectFit === 'contain'
        ? Math.min(imgRect.width / img.naturalWidth, imgRect.height / img.naturalHeight)
        : Math.max(imgRect.width / img.naturalWidth, imgRect.height / img.naturalHeight)
    const drawnH = img.naturalHeight * scale
    const parts = style.objectPosition.trim().split(/\s+/)
    const token = parts[1] ?? '50%'
    const oy = token === 'top' || token === '0%'
        ? 0
        : token === 'bottom' || token === '100%'
            ? imgRect.height - drawnH
            : token === 'center' || token === '50%'
                ? (imgRect.height - drawnH) / 2
                : token.endsWith('%')
                    ? (imgRect.height - drawnH) * (parseFloat(token) / 100)
                    : (imgRect.height - drawnH) / 2
    const baseY = imgRect.top + oy + imageY * scale
    return frameRect.bottom - baseY
}

function readPhotoFit(): { scaleX: number; imgBottomGap: number; imgTopGap: number; frameWidth: number } {
    const img = document.querySelector('img') as HTMLImageElement
    const frame = (img.closest('.vc-card-photo-frame') ?? img.parentElement) as HTMLElement
    const fit = img.closest('.vc-card-photo-fit') as HTMLElement | null
    const box = (fit ?? img).getBoundingClientRect()
    const frameRect = frame.getBoundingClientRect()
    const imgRect = img.getBoundingClientRect()
    return {
        scaleX: box.width / frameRect.width,
        imgBottomGap: frameRect.bottom - imgRect.bottom,
        imgTopGap: imgRect.top - frameRect.top,
        frameWidth: frameRect.width,
    }
}

test('real ProductCard and PDP caps clear by 8px at 390, 1024, and 1280', async ({ page }) => {
    test.setTimeout(180_000)
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
            const phoneCard = surface === 'card' && fit.frameWidth < 190
            if (phoneCard) {
                expect(fit.fontSize, `${surface} ${viewport.name}`).toBe('11px')
                expect(fit.padding).toBe('0px')
                expect(fit.pillWidth).toBeGreaterThanOrEqual(96)
                expect(fit.pillWidth).toBeLessThanOrEqual(106)
                expect(fit.pillHeight).toBeLessThanOrEqual(44)
            } else if (surface === 'card') {
                expect(fit.fontSize, `${surface} ${viewport.name}`).toBe('12px')
                expect(fit.pillWidth).toBeGreaterThan(108)
                expect(fit.pillWidth).toBeLessThanOrEqual(124)
                expect(fit.pillHeight).toBeLessThanOrEqual(54)
            } else {
                expect(fit.fontSize, `${surface} ${viewport.name}`).toBe('12px')
                expect(fit.pillWidth).toBeGreaterThanOrEqual(114)
                expect(fit.pillWidth).toBeLessThanOrEqual(124)
                expect(fit.pillHeight).toBeLessThanOrEqual(54)
            }
            expect(fit.restScroll).toBeLessThanOrEqual(1)
            if (surface === 'card') {
                const photo = await page.evaluate(readPhotoFit)
                if (phoneCard) {
                    expect(photo.scaleX, `${surface} ${viewport.name} photo scale`).toBeGreaterThan(0.9)
                    expect(photo.scaleX, `${surface} ${viewport.name} photo scale`).toBeLessThan(0.94)
                    expect(photo.imgBottomGap, `${surface} ${viewport.name} photo baseline`).toBeLessThanOrEqual(1)
                } else {
                    expect(photo.scaleX, `${surface} ${viewport.name} photo stays full bleed`).toBeGreaterThan(0.98)
                }
            }
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
            expect(hoverShared.altScroll, `${surface} ${viewport.name} hover scroll`).toBeLessThanOrEqual(hoverShared.altClient)
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

    mkdirSync(A8_DIR, { recursive: true })
    const bottleFile = '/tmp/bottles/mthfr.png'
    const histamineFile = '/tmp/bottles/histamine.png'
    execSync(
        `mkdir -p /tmp/bottles && test -s ${bottleFile} || curl -fsSL -o ${bottleFile} ${JSON.stringify('https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Methylation%20SNP%20Support/mthfr-plus-folate-metabolism.png')}`,
        { stdio: 'inherit' },
    )
    execSync(
        `test -s ${histamineFile} || curl -fsSL -o ${histamineFile} ${JSON.stringify('https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Advance%20Formulations/histamine-relief-protocol.png')}`,
        { stdio: 'inherit' },
    )
    const bottleUrl = 'https://bottle.test/mthfr.png'
    const histamineUrl = 'https://bottle.test/histamine.png'
    await page.route(bottleUrl, (route) => route.fulfill({ path: bottleFile, contentType: 'image/png' }))
    await page.route(histamineUrl, (route) => route.fulfill({ path: histamineFile, contentType: 'image/png' }))
    const measured: Array<Record<string, unknown>> = []
    const products = [
        { slug: 'mthfr', label: 'MTHFR+', url: bottleUrl, word: VIACURA_WORDMARK },
        { slug: 'histamine', label: 'Histamine Relief', url: histamineUrl, word: HISTAMINE_WORDMARK },
    ] as const
    for (const product of products) {
        for (const surface of ['card', 'pdp'] as const) {
            for (const viewport of [
                { name: '390', width: 390, height: 844 },
                { name: '1280', width: 1280, height: 800 },
            ] as const) {
                await page.setViewportSize({ width: viewport.width, height: viewport.height })
                await page.setContent(realHarness(surface, builtCss, product.url, product.slug), { waitUntil: 'domcontentloaded' })
                await page.addScriptTag({ path: bundlePath })
                await page.waitForSelector('[data-sash-placed="true"]', { state: 'attached', timeout: 8000 })
                await page.evaluate(() => document.fonts.ready)
                await expect.poll(async () => page.locator('img').first().evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(200)
                const pill = page.getByTestId('launch-vote-pill')
                const phoneCard = surface === 'card' && viewport.name === '390'
                const badge = page.getByText('TIER 3', { exact: true })
                if (product.slug === 'histamine' && surface === 'card') await expect(badge).toBeVisible()
                const restBox = await pill.boundingBox()
                const restShared = await pill.evaluate(readSharedLabel)
                expect(restShared.restCenterDelta).toBeLessThanOrEqual(1)
                expect(restShared.lines).toBeLessThanOrEqual(3)
                const restPad = await pill.evaluate(readMinPad)
                expect(restPad, `${product.label} ${surface} ${viewport.name} rest minPad`).toBeGreaterThanOrEqual(8)
                const restInk = await page.evaluate(measureAgainst, {
                    word: product.word,
                    badgeText: product.slug === 'histamine' && surface === 'card' ? 'TIER 3' : null,
                    hypothetical: [],
                })
                const where = `${product.label} ${surface} ${viewport.name} pill ${restInk.pillWidth}x${restInk.pillHeight} ${restInk.fontSize}`
                const lockedGap: Record<string, number> = {
                    'MTHFR+|card|1280': 13.46,
                    'MTHFR+|pdp|390': 89.13,
                    'MTHFR+|pdp|1280': 147.41,
                    'Histamine Relief|card|1280': 4.33,
                    'Histamine Relief|pdp|390': 73.82,
                    'Histamine Relief|pdp|1280': 126.92,
                }
                const lockedBadge: Record<string, number> = {
                    'Histamine Relief|card|390': 8.85,
                    'Histamine Relief|card|1280': 44.38,
                }
                const frameKey = `${product.label}|${surface}|${viewport.name}`
                if (lockedGap[frameKey] != null) expect(restInk.gap, frameKey).toBeCloseTo(lockedGap[frameKey], 0)
                if (lockedBadge[frameKey] != null) expect(restInk.badgeGap, frameKey).toBeCloseTo(lockedBadge[frameKey], 0)
                const photo = await page.evaluate(readPhotoFit)
                const bottleBaseline = await page.evaluate(readBottleBaseline, BOTTLE_BASE_Y[product.slug])
                if (phoneCard) {
                    expect(restInk.gap, `${where} rest wordmark`).toBeGreaterThanOrEqual(4)
                    expect(restInk.fontSize, where).toBe('11px')
                    expect(restInk.padding, where).toBe('0px')
                    expect(restInk.pillWidth, where).toBeGreaterThanOrEqual(96)
                    expect(restInk.pillWidth, where).toBeLessThanOrEqual(106)
                    expect(restInk.pillHeight, where).toBeLessThanOrEqual(44)
                    expect(photo.scaleX, where).toBeGreaterThan(0.9)
                    expect(photo.scaleX, where).toBeLessThan(0.94)
                    expect(photo.imgBottomGap, `${where} photo anchored to the frame bottom`).toBeLessThanOrEqual(1)
                    expect(photo.imgTopGap, `${where} freed space sits above the photo`).toBeGreaterThan(8)
                } else if (surface === 'card') {
                    expect(restInk.gap, `${where} rest wordmark`).toBeGreaterThanOrEqual(4)
                    expect(restInk.fontSize, where).toBe('12px')
                    expect(restInk.pillWidth, where).toBeGreaterThanOrEqual(116)
                    expect(restInk.pillWidth, where).toBeLessThanOrEqual(120)
                    expect(restInk.pillHeight, where).toBeGreaterThanOrEqual(46)
                    expect(restInk.pillHeight, where).toBeLessThanOrEqual(50)
                    expect(photo.scaleX, `${where} photo stays full bleed`).toBeGreaterThan(0.98)
                } else {
                    expect(restInk.gap, `${where} rest wordmark`).toBeGreaterThanOrEqual(4)
                    expect(restInk.fontSize, where).toBe('12px')
                    expect(restInk.pillWidth, where).toBeGreaterThanOrEqual(118)
                    expect(restInk.pillWidth, where).toBeLessThanOrEqual(122)
                    expect(restInk.pillHeight, where).toBeGreaterThanOrEqual(48)
                    expect(restInk.pillHeight, where).toBeLessThanOrEqual(52)
                    expect(photo.scaleX, `${where} photo stays full bleed`).toBeGreaterThan(0.98)
                }
                if (product.slug === 'histamine' && surface === 'card') {
                    expect(restInk.badgeGap, `${where} rest badge`).toBeGreaterThan(0)
                }
                const shot = `${product.slug}-${surface}`
                await page.locator('[data-testid="sash-grid"] > *').screenshot({
                    path: join(ARTIFACT_DIR, `dark-${shot}-rest-${viewport.name}.png`),
                })
                await page.locator('[data-testid="sash-grid"] > *').screenshot({
                    path: join(A8_DIR, `${shot}-rest-${viewport.name}.png`),
                })
                await pill.hover()
                const hoverBox = await pill.boundingBox()
                expect(hoverBox?.width).toBe(restBox?.width)
                expect(hoverBox?.height).toBe(restBox?.height)
                expect(hoverBox?.x).toBe(restBox?.x)
                expect(hoverBox?.y).toBe(restBox?.y)
                const hoverShared = await pill.evaluate(readSharedLabel)
                expect(hoverShared.clipped, `${where} hover`).toBe(false)
                expect(hoverShared.altScroll).toBeLessThanOrEqual(hoverShared.altClient)
                expect(hoverShared.lines).toBeGreaterThan(0)
                expect(hoverShared.lines).toBeLessThanOrEqual(3)
                expect(hoverShared.text).toBe('Vote for the next product launch')
                expect(hoverShared.text.includes('…') || hoverShared.text.includes('...')).toBe(false)
                expect(hoverShared.clamp === 'none' || hoverShared.clamp === 'unset' || hoverShared.clamp === '').toBe(true)
                const hoverPad = await pill.evaluate(readMinPad)
                expect(hoverPad, `${where} hover minPad`).toBeGreaterThanOrEqual(8)
                const hoverInk = await page.evaluate(measureAgainst, {
                    word: product.word,
                    badgeText: product.slug === 'histamine' && surface === 'card' ? 'TIER 3' : null,
                    hypothetical: [],
                })
                expect(hoverInk.gap, `${where} hover wordmark`).toBeGreaterThanOrEqual(4)
                if (product.slug === 'histamine' && surface === 'card') {
                    expect(hoverInk.badgeGap, `${where} hover badge`).toBeGreaterThan(0)
                }
                await page.locator('[data-testid="sash-grid"] > *').screenshot({
                    path: join(ARTIFACT_DIR, `dark-${shot}-hover-${viewport.name}.png`),
                })
                await page.locator('[data-testid="sash-grid"] > *').screenshot({
                    path: join(A8_DIR, `${shot}-hover-${viewport.name}.png`),
                })
                measured.push({
                    product: product.label,
                    surface,
                    viewport: viewport.name,
                    pillWidth: restInk.pillWidth,
                    pillHeight: restInk.pillHeight,
                    fontSize: restInk.fontSize,
                    padding: restInk.padding,
                    lineHeight: restInk.lineHeight,
                    restMinPad: restPad,
                    hoverMinPad: hoverPad,
                    restWordmarkGap: restInk.gap,
                    hoverWordmarkGap: hoverInk.gap,
                    restBadgeGap: restInk.badgeGap,
                    hoverBadgeGap: hoverInk.badgeGap,
                    hoverLines: hoverShared.lines,
                    photoScale: photo.scaleX,
                    photoBottomGap: photo.imgBottomGap,
                    photoTopGap: photo.imgTopGap,
                    bottleBaseline,
                })
            }
        }
    }

    await page.setViewportSize({ width: 390, height: 844 })
    await page.setContent(realHarness('card', builtCss, bottleUrl, 'mthfr', histamineUrl), { waitUntil: 'domcontentloaded' })
    await page.addScriptTag({ path: bundlePath })
    await expect(page.getByTestId('launch-vote-pill')).toHaveCount(2)
    await page.waitForSelector('[data-sash-placed="true"]', { state: 'attached', timeout: 8000 })
    await page.evaluate(() => document.fonts.ready)
    await expect.poll(async () => page.locator('img').nth(1).evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(200)
    const baselines = await page.evaluate(readPairBaselines, BOTTLE_BASE_Y)
    expect(baselines).toHaveLength(2)
    for (const row of baselines) {
        expect(row.clipped, row.alt).toBe(false)
        expect(row.imgBottomGap, `${row.alt} photo sits on the frame bottom`).toBeLessThanOrEqual(1)
        expect(row.baseFromFrameBottom, `${row.alt} bottle base is inside the frame`).toBeGreaterThanOrEqual(8)
    }
    expect(Math.abs(baselines[0].frameBottom - baselines[1].frameBottom), 'card frames share a row').toBeLessThanOrEqual(1)
    expect(
        Math.abs(baselines[0].baseY - baselines[1].baseY),
        'bottle bases share a baseline',
    ).toBeLessThanOrEqual(2)
    measured.push({
        product: 'pair',
        surface: 'card',
        viewport: '390',
        bottleBaseline: baselines,
    })
    writeFileSync(join(A8_DIR, 'measurements.json'), JSON.stringify(measured, null, 2))
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
