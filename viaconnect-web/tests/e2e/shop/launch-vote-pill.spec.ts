/**
 * Brief 70 pill harness. No dev server and no auth.
 * Markup is built here so the runner does not import a CSS module from TSX.
 * Shop Playwright is not part of CI.
 */
import { mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

const CSS = readFileSync(join(process.cwd(), 'src/components/ui/stardust-button.css'), 'utf8')
const OVERLAY_CSS = readFileSync(join(process.cwd(), 'src/components/shop/launch-vote-pill.css'), 'utf8')
const ARTIFACT_DIR = '/opt/cursor/artifacts/launch-vote'

const VIEWPORTS = [
    { name: '390', width: 390, height: 844 },
    { name: '1280', width: 1280, height: 800 },
] as const

function pageHtml(tone: 'white' | 'black', state: 'rest' | 'voted' | 'popular' | 'confirm'): string {
    const rest = `
      <button type="button" class="vc-stardust" data-size="card" data-state="rest" data-testid="launch-vote-pill">
        <span class="vc-stardust-labels">
          <span class="vc-stardust-label vc-stardust-label-rest">Launching Soon</span>
          <span class="vc-stardust-label vc-stardust-label-alt">Vote for the next product launch</span>
        </span>
      </button>
      <span class="vc-stardust-note">25% off your first order of this product if you have not ordered before, or your next order if you have. Terms apply.</span>`
    const voted = `<span class="vc-stardust" data-size="card" data-state="voted" data-testid="launch-vote-pill" role="status"><span class="vc-stardust-labels"><span class="vc-stardust-label">You voted. 25% off at launch</span></span></span>`
    const popular = `<span class="vc-stardust" data-size="card" data-state="popular" data-testid="launch-vote-pill"><span class="vc-stardust-labels vc-stardust-labels-stack"><span class="vc-stardust-label">By Popular Demand</span><span class="vc-stardust-detail">Releases Oct 5</span></span></span>`
    const confirm = `${rest}
      <div class="vc-vote-dialog"><div class="vc-vote-dialog-card" role="dialog" aria-modal="true">
        <h2>Vote for Creatine Fixture?</h2>
        <p>One vote per product. Votes can't be undone.</p>
        <button type="button" class="vc-vote-dialog-submit">Submit vote</button>
        <button type="button" class="vc-vote-dialog-cancel">Cancel</button>
      </div></div>`
    const body = state === 'voted' ? voted : state === 'popular' ? popular : state === 'confirm' ? confirm : rest
    const bottleFill = tone === 'black'
        ? 'linear-gradient(90deg, #050505 0%, #2c2c2c 28%, #4a4a4a 46%, #111111 58%, #2a2a2a 100%)'
        : 'linear-gradient(90deg, #8b939b 0%, #e6e8eb 22%, #ffffff 42%, #f7f7f8 56%, #c5c9ce 100%)'
    return `<!DOCTYPE html><html><head><style>
      ${CSS}
      ${OVERLAY_CSS}
      body { margin: 0; background: #0F1A2E; }
      .card { position: relative; width: 280px; height: 360px; margin: 40px auto; background: #ffffff; overflow: hidden; }
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
      <div class="card" data-testid="bottle" data-tone="${tone}">
        <div class="bottle-shape" data-testid="bottle-shape"></div>
        <div class="vc-launch-vote" data-size="card">${body}</div>
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
        for (const tone of ['white', 'black'] as const) {
            await page.setContent(pageHtml(tone, 'rest'), { waitUntil: 'domcontentloaded' })
            const pill = page.getByTestId('launch-vote-pill')
            const restPaint = await pill.evaluate((node) => {
                const style = getComputedStyle(node)
                return { background: style.backgroundColor, blur: style.backdropFilter }
            })
            expect(cssColor(restPaint.background)).toBe('rgba(10,25,41,0.18)')
            expect(restPaint.blur).toContain('blur')
            const before = await pill.boundingBox()
            await page.screenshot({
                path: join(ARTIFACT_DIR, `A-rest-${tone}-${viewport.name}.png`),
            })
            await pill.hover()
            await expect.poll(async () => cssColor(await pill.evaluate((node) => getComputedStyle(node).backgroundColor))).toBe('rgba(15,77,51,0.2)')
            const after = await pill.boundingBox()
            expect(before?.width).toBe(after?.width)
            expect(before?.height).toBe(after?.height)
            const bottle = await page.getByTestId('bottle').boundingBox()
            expect((after?.width ?? 0) <= (bottle?.width ?? 0) * 0.81).toBe(true)
            await page.screenshot({
                path: join(ARTIFACT_DIR, `B-hover-${tone}-${viewport.name}.png`),
            })
            for (const state of ['voted', 'popular', 'confirm'] as const) {
                await page.setContent(pageHtml(tone, state), { waitUntil: 'domcontentloaded' })
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
    }
})
