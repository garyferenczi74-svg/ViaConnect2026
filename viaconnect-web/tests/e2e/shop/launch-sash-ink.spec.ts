/**
 * Brief 72 A9. Measures the Launching Soon card in the signed-in shell,
 * not the fixed-width harness. The shell matches AppShell + MobileNavWrapper
 * + ShopCategoryPage + PlpProductGrid:
 *   sidebar 260px at >=1024, main overflow-y auto,
 *   p-4 (16) and lg:p-6 (24), shop px-4 / md:px-6,
 *   grid 2 / 3 / 4 columns with gap 24 / 32 / 32.
 * Overlay scrollbars leave the content box full (151px at 390, 207px at 1280).
 * A 10px classic scrollbar on main shrinks it to 146px and 204.5px.
 * Ink is every gold pixel of VIACURA, including the V serif.
 */
import { execSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'

const ARTIFACT_DIR = '/opt/cursor/artifacts/launch-vote-a9'
const MTHFR_URL = 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Methylation%20SNP%20Support/mthfr-plus-folate-metabolism.png'
const HISTAMINE_URL = 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Advance%20Formulations/histamine-relief-protocol.png'

const VIEWPORTS = [
    { name: '390', width: 390, height: 900 },
    { name: '768', width: 768, height: 900 },
    { name: '1024', width: 1024, height: 900 },
    { name: '1280', width: 1280, height: 900 },
] as const

test.use({ channel: 'chrome' })

const LIVE_LAYOUT = `
  body { margin: 0; background: #0F1A2E; font-family: Inter, sans-serif; }
  .live-app { min-height: 100vh; background: #0F1A2E; color: #fff; }
  .live-sidebar { display: none; }
  .live-column { margin-left: 0; min-height: 100vh; display: flex; flex-direction: column; }
  .live-main { flex: 1; overflow-x: hidden; overflow-y: auto; }
  .live-pad { box-sizing: border-box; padding: 16px; }
  .live-shop { box-sizing: border-box; max-width: 80rem; margin-inline: auto; padding-inline: 16px; }
  .live-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
  .live-spacer { height: 1600px; }
  .live-main.scroll-off { scrollbar-width: none; }
  .live-main.scroll-off::-webkit-scrollbar { width: 0 !important; height: 0 !important; display: none; }
  .live-main.scroll-on { scrollbar-width: auto; overflow-y: scroll; }
  .live-main.scroll-on::-webkit-scrollbar { width: 10px; }
  .live-main.scroll-on::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.4); border-radius: 8px; }
  @media (min-width: 768px) {
    .live-shop { padding-inline: 24px; }
    .live-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 32px; }
    .md\\:aspect-\\[4\\/5\\] { aspect-ratio: 4 / 5; }
  }
  @media (min-width: 1024px) {
    .live-sidebar { display: block; position: fixed; inset: 0 auto 0 0; width: 260px; }
    .live-column { margin-left: 260px; }
    .live-pad { padding: 24px; }
  }
  @media (min-width: 1280px) {
    .live-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 32px; }
  }
  .relative { position: relative; }
  .overflow-hidden { overflow: hidden; }
  .block { display: block; }
  .w-full { width: 100%; }
  .flex { display: flex; }
  .flex-col { flex-direction: column; }
  .gap-1 { gap: 4px; }
  .gap-2 { gap: 8px; }
  .gap-3 { gap: 12px; }
  .h-full { height: 100%; }
  .items-end { align-items: flex-end; }
  .rounded-xl { border-radius: 12px; }
  .bg-white { background: #fff; }
  .shadow-md { box-shadow: 0 4px 6px rgba(0,0,0,0.15); }
  .absolute { position: absolute; }
  .z-10 { z-index: 10; }
  .aspect-\\[3\\/4\\] { aspect-ratio: 3 / 4; }
  a { color: inherit; text-decoration: none; }
`

function shellHtml(builtCss: string): string {
    return `<!DOCTYPE html><html data-sash-shell="live" data-bottle="${MTHFR_URL}" data-bottle-b="${HISTAMINE_URL}"><head><style>${builtCss}${LIVE_LAYOUT}</style></head><body><script>window.process={env:{NODE_ENV:"production"}}</script><div id="root"></div></body></html>`
}

function expectedCard(viewport: number, scrollbarPx: number): number {
    const sidebar = viewport >= 1024 ? 260 : 0
    const shell = viewport >= 1024 ? 24 : 16
    const shop = viewport >= 768 ? 24 : 16
    const cols = viewport >= 1280 ? 4 : viewport >= 768 ? 3 : 2
    const gap = viewport >= 768 ? 32 : 24
    const main = viewport - sidebar - scrollbarPx
    const grid = main - shell * 2 - shop * 2
    return (grid - (cols - 1) * gap) / cols
}

function extractInk(mthfrPath: string, histaminePath: string): Record<string, number[][]> {
    const out = '/tmp/a9-ink.json'
    execSync(
        `python3 - << 'PY'
import json
import numpy as np
from PIL import Image
bands = {"mthfr": (1355, 1625), "histamine": (1200, 1470)}
paths = {"mthfr": ${JSON.stringify(mthfrPath)}, "histamine": ${JSON.stringify(histaminePath)}}
out = {}
for key, path in paths.items():
    image = np.asarray(Image.open(path).convert("RGB"))
    y0, y1 = bands[key]
    sub = image[y0:y1, 700:1400].astype(int)
    red, green, blue = sub[..., 0], sub[..., 1], sub[..., 2]
    mask = (red > 150) & (green > 100) & (blue < 110) & (red > green)
    ys, xs = np.nonzero(mask)
    xs = xs + 700
    ys = ys + y0
    out[key] = np.stack([xs + 0.5, ys + 0.5], 1).round(1).tolist()
json.dump(out, open(${JSON.stringify(out)}, "w"))
print({k: len(v) for k, v in out.items()})
PY`,
        { stdio: 'inherit' },
    )
    return JSON.parse(readFileSync(out, 'utf8')) as Record<string, number[][]>
}

function measureCards(): Array<Record<string, unknown>> {
    const inkMap = (window as unknown as { __ink: Record<string, number[][]> }).__ink

    function objectOffset(token: string, container: number, content: number): number {
        if (token === 'left' || token === 'top' || token === '0%') return 0
        if (token === 'center' || token === '50%') return (container - content) / 2
        if (token === 'right' || token === 'bottom' || token === '100%') return container - content
        if (token.endsWith('%')) return (container - content) * (parseFloat(token) / 100)
        const px = parseFloat(token)
        return Number.isFinite(px) ? px : (container - content) / 2
    }

    function stadium(pill: HTMLElement) {
        const box = pill.getBoundingClientRect()
        const style = getComputedStyle(pill)
        const raw = style.transform
        const parts = raw.startsWith('matrix(')
            ? raw.slice(7, -1).split(',').map((value) => parseFloat(value))
            : [1, 0, 0, 1, 0, 0]
        const angle = Math.atan2(parts[1], parts[0])
        const width = pill.offsetWidth
        const height = pill.offsetHeight
        const radius = Math.min(height / 2, parseFloat(style.borderTopLeftRadius) || height / 2)
        const half = width / 2 - radius
        const ux = Math.cos(angle)
        const uy = Math.sin(angle)
        const cx = box.x + box.width / 2
        const cy = box.y + box.height / 2
        return {
            cx,
            cy,
            radius,
            half,
            ux,
            uy,
            p1x: cx - ux * half,
            p1y: cy - uy * half,
            p2x: cx + ux * half,
            p2y: cy + uy * half,
            width,
            height,
        }
    }

    function pointGap(sash: ReturnType<typeof stadium>, x: number, y: number): number {
        const dx = sash.p2x - sash.p1x
        const dy = sash.p2y - sash.p1y
        const length = dx * dx + dy * dy || 1
        const t = Math.max(0, Math.min(1, ((x - sash.p1x) * dx + (y - sash.p1y) * dy) / length))
        return Math.hypot(x - (sash.p1x + t * dx), y - (sash.p1y + t * dy)) - sash.radius
    }

    function segmentGap(sash: ReturnType<typeof stadium>, ax: number, ay: number, bx: number, by: number): number {
        let best = Number.POSITIVE_INFINITY
        for (let i = 0; i <= 80; i += 1) {
            const t = i / 80
            best = Math.min(best, pointGap(sash, ax + (bx - ax) * t, ay + (by - ay) * t))
        }
        return best
    }

    const main = document.querySelector('[data-testid="live-main"]') as HTMLElement
    const rows: Array<Record<string, unknown>> = []
    const frames = [...document.querySelectorAll('.vc-card-photo-frame')] as HTMLElement[]
    for (const frame of frames) {
        const img = frame.querySelector('img') as HTMLImageElement
        const pill = frame.parentElement?.querySelector('[data-testid="launch-vote-pill"]') as HTMLElement
        const overlay = frame.parentElement?.querySelector('[data-testid="launch-vote-overlay"]') as HTMLElement
        const fit = frame.querySelector('.vc-card-photo-fit') as HTMLElement
        const key = img.alt.includes('Histamine') ? 'histamine' : 'mthfr'
        const sash = stadium(pill)
        const imgRect = img.getBoundingClientRect()
        const frameRect = frame.getBoundingClientRect()
        const fitRect = fit.getBoundingClientRect()
        const overlayRect = overlay.getBoundingClientRect()
        const imgStyle = getComputedStyle(img)
        const cover = imgStyle.objectFit !== 'contain'
        const scale = cover
            ? Math.max(imgRect.width / img.naturalWidth, imgRect.height / img.naturalHeight)
            : Math.min(imgRect.width / img.naturalWidth, imgRect.height / img.naturalHeight)
        const drawnW = img.naturalWidth * scale
        const drawnH = img.naturalHeight * scale
        const pos = imgStyle.objectPosition.trim().split(/\s+/)
        const ox = objectOffset(pos[0] ?? '50%', imgRect.width, drawnW)
        const oy = objectOffset(pos[1] ?? '50%', imgRect.height, drawnH)
        let inkGap = Number.POSITIVE_INFINITY
        const pts = inkMap[key]
        for (let i = 0; i < pts.length; i += 1) {
            const x = imgRect.left + ox + pts[i][0] * scale
            const y = imgRect.top + oy + pts[i][1] * scale
            const gap = pointGap(sash, x, y) - scale * 0.5
            if (gap < inkGap) inkGap = gap
        }
        const reachX = Math.abs(sash.ux) * sash.half + sash.radius
        const reachY = Math.abs(sash.uy) * sash.half + sash.radius
        const capLeft = sash.cx - reachX - overlayRect.left
        const capTop = sash.cy - reachY - overlayRect.top
        const chip = [...frame.querySelectorAll('span')].find((node) => node.textContent === 'TIER 3') as HTMLElement | undefined
        let tierGap: number | null = null
        let tier: { width: number; height: number; top: number; color: string; background: string } | null = null
        if (chip) {
            const rect = chip.getBoundingClientRect()
            const radius = Math.min(rect.height / 2, rect.width / 2, parseFloat(getComputedStyle(chip).borderTopLeftRadius) || rect.height / 2)
            const cy = rect.top + rect.height / 2
            tierGap = segmentGap(sash, rect.left + radius, cy, rect.right - radius, cy) - radius
            const chipStyle = getComputedStyle(chip)
            tier = {
                width: rect.width,
                height: rect.height,
                top: rect.top - frameRect.top,
                color: chipStyle.color,
                background: chipStyle.backgroundColor,
            }
        }
        const alt = pill.querySelector('.vc-stardust-label-alt') as HTMLElement
        const rest = pill.querySelector('.vc-stardust-label-rest') as HTMLElement
        const altStyle = getComputedStyle(alt)
        const baseY = img.alt.includes('Histamine') ? 3395 : 3398
        const bottleBase = imgRect.top + oy + baseY * scale
        const frameStyle = getComputedStyle(frame)
        rows.push({
            key,
            alt: img.alt,
            frameWidth: frameRect.width,
            frameHeight: frameRect.height,
            scrollbar: main.offsetWidth - main.clientWidth,
            pillWidth: pill.offsetWidth,
            pillHeight: pill.offsetHeight,
            fontSize: getComputedStyle(pill).fontSize,
            pillLeft: pill.style.left,
            pillTop: pill.style.top,
            box: { x: pill.getBoundingClientRect().x, y: pill.getBoundingClientRect().y, w: pill.getBoundingClientRect().width, h: pill.getBoundingClientRect().height },
            capLeft,
            capTop,
            inkGap,
            tierGap,
            tier,
            photoScale: fitRect.width / frameRect.width,
            photoBottomGap: frameRect.bottom - fitRect.bottom,
            photoCenter: (fitRect.left + fitRect.width / 2) - (frameRect.left + frameRect.width / 2),
            baseFromFrameBottom: frameRect.bottom - bottleBase,
            bottleBase,
            frameBottom: frameRect.bottom,
            frameTransform: frameStyle.transform,
            clamp: altStyle.webkitLineClamp,
            whiteSpace: altStyle.whiteSpace,
            altText: alt.textContent,
            restText: rest.textContent,
            altScroll: alt.scrollHeight,
            altClient: alt.clientHeight,
            altScrollW: alt.scrollWidth,
            altClientW: alt.clientWidth,
            hover: pill.matches(':hover'),
            natural: [img.naturalWidth, img.naturalHeight],
        })
    }
    return rows
}

async function loadShell(page: Page, builtCss: string, bundlePath: string, ink: Record<string, number[][]>): Promise<void> {
    await page.setContent(shellHtml(builtCss), { waitUntil: 'domcontentloaded' })
    await page.addScriptTag({ path: bundlePath })
    await page.waitForSelector('[data-sash-placed="true"]', { state: 'attached', timeout: 8000 })
    await page.evaluate(() => document.fonts.ready)
    await expect.poll(async () => page.locator('img').nth(1).evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(2000)
    await page.evaluate((points) => {
        ;(window as unknown as { __ink: typeof points }).__ink = points
    }, ink)
}

async function readRows(page: Page): Promise<Array<Record<string, unknown>>> {
    return page.evaluate(measureCards)
}

/** Container queries resize the sash before ResizeObserver writes left/top. */
async function waitForPlacedCards(page: Page, target: number, tolerance = 1): Promise<void> {
    await page.waitForFunction(
        ({ next, slack }) => {
            const frames = [...document.querySelectorAll('.vc-card-photo-frame')] as HTMLElement[]
            if (frames.length < 2) return false
            return frames.every((photo) => {
                if (Math.abs(photo.getBoundingClientRect().width - next) >= slack) return false
                const overlay = photo.parentElement?.querySelector('[data-testid="launch-vote-overlay"]') as HTMLElement | null
                const pill = overlay?.querySelector('[data-testid="launch-vote-pill"]') as HTMLElement | null
                if (!overlay || !pill || pill.offsetWidth === 0 || pill.offsetHeight === 0) return false
                const signature = `${pill.offsetWidth}x${pill.offsetHeight}@${overlay.clientWidth}x${overlay.clientHeight}`
                return overlay.dataset.sashBox === signature
            })
        },
        { next: target, slack: tolerance },
    )
}

test('signed-in shop shell keeps the VIACURA ink clear of the card sash', async ({ page }) => {
    test.setTimeout(300_000)
    test.skip(test.info().project.name !== 'laptop-1024', 'viewports are set inside this test')
    execSync('npx vite build --config tests/e2e/shop/sash-fit.vite.config.ts', {
        cwd: process.cwd(),
        stdio: 'inherit',
    })
    mkdirSync(ARTIFACT_DIR, { recursive: true })
    const builtCss = readFileSync('/tmp/sash-fit-46e3/viaconnect-web.css', 'utf8')
    const bundlePath = '/tmp/sash-fit-46e3/sash-fit.js'
    const mthfrFile = '/tmp/bottles/mthfr.png'
    const histamineFile = '/tmp/bottles/histamine.png'
    execSync(`mkdir -p /tmp/bottles && test -s ${mthfrFile} || curl -fsSL -o ${mthfrFile} ${JSON.stringify(MTHFR_URL)}`, { stdio: 'inherit' })
    execSync(`test -s ${histamineFile} || curl -fsSL -o ${histamineFile} ${JSON.stringify(HISTAMINE_URL)}`, { stdio: 'inherit' })
    await page.route(MTHFR_URL, (route) => route.fulfill({ path: mthfrFile, contentType: 'image/png' }))
    await page.route(HISTAMINE_URL, (route) => route.fulfill({ path: histamineFile, contentType: 'image/png' }))
    const ink = extractInk(mthfrFile, histamineFile)
    expect(ink.mthfr.length).toBeGreaterThan(1000)
    expect(ink.histamine.length).toBeGreaterThan(1000)

    const pdp = readFileSync(join(process.cwd(), 'src/app/(app)/(consumer)/shop/product/[slug]/page.tsx'), 'utf8')
    expect(pdp).toContain('aspect-[4/5] w-full overflow-hidden rounded-2xl')
    expect(pdp).not.toContain('vc-card-photo-fit')

    const table: Array<Record<string, unknown>> = []
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    async function settleScrollbar(mode: 'off' | 'on'): Promise<number> {
        const consumed = await page.evaluate((which) => {
            const main = document.querySelector('[data-testid="live-main"]') as HTMLElement
            main.classList.toggle('scroll-off', which === 'off')
            main.classList.toggle('scroll-on', which === 'on')
            main.style.boxSizing = ''
            main.style.borderRight = ''
            const native = main.offsetWidth - main.clientWidth
            if (which === 'on' && native < 8) {
                main.style.boxSizing = 'border-box'
                main.style.borderRight = '10px solid transparent'
            }
            return main.offsetWidth - main.clientWidth
        }, mode)
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
        return consumed
    }

    for (const viewport of VIEWPORTS) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        for (const mode of ['off', 'on'] as const) {
            await loadShell(page, builtCss, bundlePath, ink)
            const scrollbar = await settleScrollbar(mode)
            const expected = expectedCard(viewport.width, mode === 'off' ? 0 : scrollbar)
            await waitForPlacedCards(page, expected, 0.8)
            const rest = await readRows(page)
            expect(rest).toHaveLength(2)
            for (const row of rest) {
                expect(row.frameWidth as number, `${viewport.name} ${mode} width`).toBeCloseTo(expected, 0)
                expect(row.natural).toEqual([3000, 4000])
                expect(row.inkGap as number, `${row.key} ${viewport.name} ${mode} rest ink`).toBeGreaterThanOrEqual(4)
                expect(row.capLeft as number, `${row.key} caps`).toBeGreaterThanOrEqual(8)
                expect(row.capTop as number, `${row.key} caps`).toBeGreaterThanOrEqual(8)
                expect(row.photoBottomGap as number).toBeLessThanOrEqual(1)
                expect(Math.abs(row.photoCenter as number)).toBeLessThanOrEqual(1)
                expect(row.baseFromFrameBottom as number).toBeGreaterThanOrEqual(8)
                expect(row.frameTransform).toBe('none')
                expect(row.restText).toBe('Launching Soon')
                expect(row.clamp === 'none' || row.clamp === 'unset' || row.clamp === '').toBe(true)
                if ((row.frameWidth as number) <= 190) {
                    expect(row.fontSize).toBe('11px')
                    expect(row.pillWidth as number).toBeGreaterThanOrEqual(96)
                    expect(row.pillWidth as number).toBeLessThanOrEqual(106)
                    expect(row.pillHeight as number).toBeLessThanOrEqual(44)
                } else {
                    expect(row.fontSize).toBe('12px')
                }
                if (row.key === 'histamine') {
                    expect(row.tierGap as number, `${viewport.name} ${mode} tier`).toBeGreaterThanOrEqual(4)
                    const tier = row.tier as { background: string; color: string }
                    expect(tier.color.replace(/\s/g, '')).toBe('rgb(255,255,255)')
                    expect(tier.background).toContain('26')
                }
            }
            const bases = rest.map((row) => row.bottleBase as number)
            const bottoms = rest.map((row) => row.frameBottom as number)
            expect(Math.abs(bottoms[0] - bottoms[1]), `${viewport.name} shared row`).toBeLessThanOrEqual(1)
            expect(Math.abs(bases[0] - bases[1]), `${viewport.name} shared baseline`).toBeLessThanOrEqual(2)

            const shotViewport = viewport.name === '390' || viewport.name === '1280'
            if (shotViewport && mode === 'off') {
                await page.locator('[data-testid="sash-grid"] > a').nth(0).screenshot({ path: join(ARTIFACT_DIR, `mthfr-${viewport.name}-rest.png`) })
                await page.locator('[data-testid="sash-grid"] > a').nth(1).screenshot({ path: join(ARTIFACT_DIR, `histamine-${viewport.name}-rest.png`) })
            }

            for (let index = 0; index < 2; index += 1) {
                const before = rest[index]
                await page.locator('[data-testid="sash-grid"] > a').nth(index).getByTestId('launch-vote-pill').hover()
                const hoverRows = await readRows(page)
                const hover = hoverRows[index]
                expect(hover.pillWidth).toBe(before.pillWidth)
                expect(hover.pillHeight).toBe(before.pillHeight)
                expect(hover.pillLeft).toBe(before.pillLeft)
                expect(hover.pillTop).toBe(before.pillTop)
                const beforeBox = before.box as { x: number; y: number; w: number; h: number }
                const hoverBox = hover.box as { x: number; y: number; w: number; h: number }
                expect(hoverBox.w).toBeCloseTo(beforeBox.w, 1)
                expect(hoverBox.h).toBeCloseTo(beforeBox.h, 1)
                expect(hoverBox.x).toBeCloseTo(beforeBox.x, 1)
                expect(hoverBox.y).toBeCloseTo(beforeBox.y, 1)
                expect(hover.inkGap as number, `${hover.key} ${viewport.name} ${mode} hover ink`).toBeGreaterThanOrEqual(4)
                expect(hover.capLeft as number).toBeGreaterThanOrEqual(8)
                expect(hover.capTop as number).toBeGreaterThanOrEqual(8)
                expect(hover.altText).toBe('Vote for the next product launch')
                expect(hover.altScroll as number).toBeLessThanOrEqual((hover.altClient as number) + 1)
                expect(hover.altScrollW as number).toBeLessThanOrEqual((hover.altClientW as number) + 1)
                expect(hover.clamp === 'none' || hover.clamp === 'unset' || hover.clamp === '').toBe(true)
                expect(hover.whiteSpace).not.toBe('nowrap')
                expect(hover.frameTransform).toBe('none')
                if (hover.key === 'histamine') expect(hover.tierGap as number).toBeGreaterThanOrEqual(4)
                table.push({
                    viewport: viewport.name,
                    scrollbar: mode === 'off' ? 'off' : 'on',
                    scrollbarPx: scrollbar,
                    product: before.key,
                    cardWidth: before.frameWidth,
                    sash: `${before.pillWidth}x${before.pillHeight}`,
                    fontSize: before.fontSize,
                    inkRest: round(before.inkGap),
                    inkHover: round(hover.inkGap),
                    capLeft: round(before.capLeft),
                    capTop: round(before.capTop),
                    tierGap: before.tierGap == null ? null : round(before.tierGap),
                    tierGapHover: hover.tierGap == null ? null : round(hover.tierGap),
                    photoScale: round(before.photoScale),
                    baseline: round(before.baseFromFrameBottom),
                })
            }
            if (shotViewport && mode === 'off') {
                await page.locator('[data-testid="sash-grid"] > a').nth(0).getByTestId('launch-vote-pill').hover()
                await page.locator('[data-testid="sash-grid"] > a').nth(0).screenshot({ path: join(ARTIFACT_DIR, `mthfr-${viewport.name}-hover.png`) })
                await page.locator('[data-testid="sash-grid"] > a').nth(1).getByTestId('launch-vote-pill').hover()
                await page.locator('[data-testid="sash-grid"] > a').nth(1).screenshot({ path: join(ARTIFACT_DIR, `histamine-${viewport.name}-hover.png`) })
            }
            await page.mouse.move(2, 2)
        }
    }

    await page.setViewportSize({ width: 390, height: 900 })
    await loadShell(page, builtCss, bundlePath, ink)
    await settleScrollbar('off')
    await page.evaluate((width) => {
        const grid = document.querySelector('[data-testid="sash-grid"]') as HTMLElement
        grid.style.display = 'block'
        grid.style.width = `${width}px`
    }, 146)
    await waitForPlacedCards(page, 146)
    const narrowRest = await readRows(page)
    for (const row of narrowRest) {
        expect(row.frameWidth as number).toBeCloseTo(146, 0)
        expect(row.inkGap as number, `${row.key} 146 rest`).toBeGreaterThanOrEqual(4)
        expect(row.capLeft as number).toBeGreaterThanOrEqual(8)
        expect(row.capTop as number).toBeGreaterThanOrEqual(8)
        if (row.key === 'histamine') expect(row.tierGap as number).toBeGreaterThanOrEqual(4)
    }
    expect(Math.abs((narrowRest[0].baseFromFrameBottom as number) - (narrowRest[1].baseFromFrameBottom as number))).toBeLessThanOrEqual(2)
    await page.locator('[data-testid="sash-grid"] > a').nth(0).screenshot({ path: join(ARTIFACT_DIR, 'mthfr-146-rest.png') })
    await page.locator('[data-testid="sash-grid"] > a').nth(1).screenshot({ path: join(ARTIFACT_DIR, 'histamine-146-rest.png') })
    for (let index = 0; index < 2; index += 1) {
        await page.locator('[data-testid="sash-grid"] > a').nth(index).getByTestId('launch-vote-pill').hover()
        const hover = (await readRows(page))[index]
        expect(hover.inkGap as number, `${hover.key} 146 hover`).toBeGreaterThanOrEqual(4)
        expect(hover.pillWidth).toBe(narrowRest[index].pillWidth)
        expect(hover.pillLeft).toBe(narrowRest[index].pillLeft)
        const name = hover.key === 'histamine' ? 'histamine' : 'mthfr'
        await page.locator('[data-testid="sash-grid"] > a').nth(index).screenshot({ path: join(ARTIFACT_DIR, `${name}-146-hover.png`) })
        table.push({
            viewport: '390-forced',
            scrollbar: 'off',
            scrollbarPx: 0,
            product: hover.key,
            cardWidth: narrowRest[index].frameWidth,
            sash: `${narrowRest[index].pillWidth}x${narrowRest[index].pillHeight}`,
            fontSize: narrowRest[index].fontSize,
            inkRest: round(narrowRest[index].inkGap),
            inkHover: round(hover.inkGap),
            capLeft: round(narrowRest[index].capLeft),
            capTop: round(narrowRest[index].capTop),
            tierGap: narrowRest[index].tierGap == null ? null : round(narrowRest[index].tierGap),
            tierGapHover: hover.tierGap == null ? null : round(hover.tierGap),
            photoScale: round(narrowRest[index].photoScale),
            baseline: round(narrowRest[index].baseFromFrameBottom),
        })
    }

    for (const aspect of [
        { name: '3/4', width: 390, height: 900 },
        { name: '4/5', width: 1280, height: 900 },
    ] as const) {
        await page.setViewportSize({ width: aspect.width, height: aspect.height })
        await loadShell(page, builtCss, bundlePath, ink)
        await settleScrollbar('off')
        for (let width = 146; width <= 220; width += 2) {
            await page.evaluate((next) => {
                const grid = document.querySelector('[data-testid="sash-grid"]') as HTMLElement
                grid.style.display = 'block'
                grid.style.width = `${next}px`
            }, width)
            await waitForPlacedCards(page, width)
            const rest = await readRows(page)
            expect(rest).toHaveLength(2)
            const where = `${aspect.name} ${width}px`
            expect(Math.abs((rest[0].frameWidth as number) - width), where).toBeLessThanOrEqual(1)
            expect(Math.abs((rest[0].baseFromFrameBottom as number) - (rest[1].baseFromFrameBottom as number)), where).toBeLessThanOrEqual(2)
            for (const row of rest) {
                expect(row.inkGap as number, `${where} ${row.key} rest`).toBeGreaterThanOrEqual(4)
                expect(Math.min(row.capLeft as number, row.capTop as number), `${where} caps`).toBeGreaterThanOrEqual(8)
                expect(row.photoBottomGap as number, where).toBeLessThanOrEqual(1)
                expect(row.frameTransform, where).toBe('none')
                if (row.key === 'histamine') expect(row.tierGap as number, `${where} tier`).toBeGreaterThanOrEqual(4)
            }
            for (let index = 0; index < 2; index += 1) {
                await page.locator('[data-testid="sash-grid"] > a').nth(index).getByTestId('launch-vote-pill').hover()
                const hover = (await readRows(page))[index]
                expect(hover.inkGap as number, `${where} ${hover.key} hover`).toBeGreaterThanOrEqual(4)
                expect(hover.pillWidth).toBe(rest[index].pillWidth)
                expect(hover.pillHeight).toBe(rest[index].pillHeight)
                expect(hover.pillLeft).toBe(rest[index].pillLeft)
                expect(hover.pillTop).toBe(rest[index].pillTop)
                expect(hover.altScroll as number).toBeLessThanOrEqual((hover.altClient as number) + 1)
                expect(hover.clamp === 'none' || hover.clamp === 'unset' || hover.clamp === '').toBe(true)
                if (hover.key === 'histamine') expect(hover.tierGap as number).toBeGreaterThanOrEqual(4)
            }
            await page.mouse.move(2, 2)
        }
    }

    writeFileSync(join(ARTIFACT_DIR, 'measurements.json'), JSON.stringify(table, null, 2))
    expect(pageErrors).toEqual([])
})

function round(value: unknown): number {
    return Math.round((value as number) * 100) / 100
}
