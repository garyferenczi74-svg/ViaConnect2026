// Process assessment row: seven steps on one line from 1000px, a gliding
// highlight, and the section fitting a short laptop viewport under the nav.

import { expect, test, type Page } from '@playwright/test'

const STEP_LABELS = [
  'Demographics',
  'Health History',
  'Symptoms',
  'Medications and Supplements',
  'Lifestyle',
  'Genetics Upload',
  'Lab Upload',
] as const

const DESKTOP = [
  { width: 1007, height: 520 },
  { width: 1007, height: 560 },
  { width: 1440, height: 900 },
] as const

async function openProcess(page: Page) {
  await page.goto('/')
  await page.getByTestId('hero-headline').waitFor({ state: 'visible' })
  const menuButton = page.getByRole('button', { name: 'Open Menu' })
  if (await menuButton.isVisible()) {
    await menuButton.click()
  }
  const processLink = page.locator('header nav').getByRole('link', { name: 'Process', exact: true })
  await processLink.click()
  await expect.poll(async () => {
    const heading = page.getByTestId('process-heading')
    const nav = page.locator('header nav')
    const headingBox = await heading.boundingBox()
    const navBox = await nav.boundingBox()
    if (!headingBox || !navBox) return false
    return headingBox.y >= navBox.y + navBox.height - 1 && headingBox.y < navBox.y + navBox.height + 120
  }, { timeout: 8000 }).toBe(true)

  const settled = async (selector: string) => {
    await expect.poll(async () => {
      return page.locator(selector).evaluate((el) => {
        const nodes = el.getAttribute('data-testid') ? [el, ...Array.from(el.children)] : [el]
        return nodes.every((node) => {
          const style = getComputedStyle(node)
          if (Number(style.opacity) < 0.99) return false
          const transform = style.transform
          if (transform === 'none') return true
          const match = transform.match(/matrix\(([^)]+)\)/)
          if (!match?.[1]) return false
          const parts = match[1].split(',').map((part) => Number(part.trim()))
          return Math.abs(parts[5] ?? 0) < 1
        })
      })
    }, { timeout: 4000 }).toBe(true)
  }
  await settled('[data-testid="process-intro"]')
  const viewport = page.viewportSize()
  if (viewport && viewport.width >= 1000) {
    await settled('[data-testid="process-tiers"]')
  }
}

/** Clear space from the active circle's scaled edge plus its 18px glow to the label. */
async function circleLabelGap(page: Page, index: number): Promise<number> {
  return page.getByTestId(`process-step-${index}`).evaluate((el) => {
    const icon = el.querySelector('.process-icon')?.getBoundingClientRect()
    const label = el.querySelector('.process-label')?.getBoundingClientRect()
    if (!icon || !label) return Number.NaN
    const along = window.innerWidth >= 1000 ? label.top - icon.bottom : label.left - icon.right
    return along - 18
  })
}

async function stepTops(page: Page): Promise<number[]> {
  return page.getByTestId('process-steps').evaluate((row) => {
    return Array.from(row.querySelectorAll('li')).map((item) => (item as HTMLElement).offsetTop)
  })
}

test.describe('process assessment row', () => {
  for (const { width, height } of DESKTOP) {
    test(`seven steps share one row and the fold fits at ${width}x${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height })
      await openProcess(page)

      const tops = await stepTops(page)
      expect(tops).toHaveLength(7)
      for (const top of tops) {
        expect(Math.abs(top - tops[0])).toBeLessThanOrEqual(1)
      }

      const boxes = []
      for (let index = 0; index < STEP_LABELS.length; index += 1) {
        const step = page.getByTestId(`process-step-${index}`)
        await expect(step).toContainText(STEP_LABELS[index])
        const box = await step.boundingBox()
        expect(box, STEP_LABELS[index]).not.toBeNull()
        if (!box) continue
        boxes.push(box)
        expect(box.y).toBeGreaterThanOrEqual(0)
        expect(box.x).toBeGreaterThanOrEqual(-1)
        expect(box.x + box.width).toBeLessThanOrEqual(width + 1)

        const label = step.locator('.process-label')
        const overflow = await label.evaluate((el) => el.scrollWidth - el.clientWidth)
        expect(overflow).toBeLessThanOrEqual(1)
        const lines = await label.evaluate((el) => {
          const style = getComputedStyle(el)
          const lineHeight = Number.parseFloat(style.lineHeight)
          if (!Number.isFinite(lineHeight) || lineHeight <= 0) return 1
          return el.getBoundingClientRect().height / lineHeight
        })
        expect(lines).toBeLessThanOrEqual(2.15)
      }

      expect(boxes).toHaveLength(7)
      for (let index = 1; index < boxes.length; index += 1) {
        expect(boxes[index].x).toBeGreaterThan(boxes[index - 1].x + 8)
        expect(Math.abs(boxes[index].y - boxes[0].y)).toBeLessThanOrEqual(1)
      }

      const nav = await page.locator('header nav').boundingBox()
      const heading = await page.getByTestId('process-heading').boundingBox()
      const tiers = await page.getByTestId('process-tiers').boundingBox()
      expect(nav).not.toBeNull()
      expect(heading).not.toBeNull()
      expect(tiers).not.toBeNull()
      if (nav && heading) {
        expect(heading.y).toBeGreaterThanOrEqual(nav.y + nav.height - 1)
      }
      if (tiers) {
        expect(tiers.y + tiers.height).toBeLessThanOrEqual(height - 16)
      }

      const gaps = await page.evaluate(() => {
        const rect = (selector: string) => document.querySelector(selector)?.getBoundingClientRect()
        const intro = rect('[data-testid="process-intro"]')
        const steps = rect('.process-steps')
        const note = rect('[data-testid="process-note"]')
        const tierRow = rect('[data-testid="process-tiers"]')
        const cards = [...document.querySelectorAll('.process-tier')].map((el) => el.getBoundingClientRect())
        const stepBoxes = [...document.querySelectorAll('[data-testid^="process-step-"]')].map((el) => el.getBoundingClientRect())
        if (!intro || !steps || !note || !tierRow || cards.length < 2 || stepBoxes.length < 2) return null
        return {
          introToSteps: steps.top - intro.bottom,
          stepsToNote: note.top - steps.bottom,
          noteToTiers: tierRow.top - note.bottom,
          tierGap: cards[1].left - cards[0].right,
          stepGap: stepBoxes[1].left - stepBoxes[0].right,
          clearance: window.innerHeight - tierRow.bottom,
        }
      })
      expect(gaps).not.toBeNull()
      if (gaps) {
        expect(Math.abs(gaps.introToSteps - gaps.stepsToNote)).toBeLessThanOrEqual(2)
        expect(Math.abs(gaps.stepsToNote - gaps.noteToTiers)).toBeLessThanOrEqual(2)
        expect(gaps.introToSteps).toBeGreaterThanOrEqual(16)
        expect(gaps.clearance).toBeGreaterThanOrEqual(16)
        expect(Math.abs(gaps.stepGap - gaps.tierGap)).toBeLessThanOrEqual(2)
        expect(Math.abs(gaps.stepGap - gaps.introToSteps)).toBeLessThanOrEqual(2)
      }

      await page.screenshot({
        path: `/opt/cursor/artifacts/process_gaps_${width}x${height}.png`,
        fullPage: false,
      })

      await expect(page.getByText('Physical', { exact: true })).toHaveCount(0)
      await expect(page.getByText('Neuro', { exact: true })).toHaveCount(0)
      await expect(page.getByText('Emotional', { exact: true })).toHaveCount(0)
      await expect(page.getByText('Optional', { exact: true })).toHaveCount(2)
      await expect(page.locator('[data-slot="fluid-hover-highlight"]')).toHaveCount(0)

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1)
    })
  }

  test('highlight glides across every step and follows keyboard focus', async ({ page }) => {
    await page.setViewportSize({ width: 1007, height: 520 })
    await openProcess(page)

    const iconOf = (index: number) => page.getByTestId(`process-step-${index}`).locator('[data-icon-active="true"]')

    await page.getByTestId('process-step-0').focus()
    await page.keyboard.press('Tab')
    await expect(page.getByTestId('process-step-1')).toBeFocused()
    await expect(page.getByTestId('process-step-1')).toHaveAttribute('data-active', 'true')
    await expect(iconOf(1)).toBeVisible()
    const focusRing = await page.getByTestId('process-step-1').locator('.process-icon').evaluate((el) => {
      const style = getComputedStyle(el)
      return style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 1
    })
    expect(focusRing).toBe(true)
    await page.screenshot({
      path: '/opt/cursor/artifacts/process_circle_focus_1007x520.png',
      fullPage: false,
    })

    const centers: number[] = []
    const labelGaps: number[] = []
    const labelGapTarget = Math.min(16, Math.max(10, 520 * 0.014))
    for (let index = 0; index < STEP_LABELS.length; index += 1) {
      const step = page.getByTestId(`process-step-${index}`)
      await step.hover()
      await expect(step).toHaveAttribute('data-active', 'true')
      const icon = iconOf(index)
      await expect(icon).toBeVisible()
      await expect.poll(async () => icon.evaluate((el) => getComputedStyle(el).transform)).toContain('1.08')
      const box = await icon.boundingBox()
      expect(box).not.toBeNull()
      if (box) centers.push(box.x + box.width / 2)
      const labelGap = await circleLabelGap(page, index)
      labelGaps.push(labelGap)
      expect(Math.abs(labelGap - labelGapTarget)).toBeLessThan(2)
      expect(Math.abs(labelGap - labelGaps[0])).toBeLessThan(1.5)
      if (index === 0) {
        await page.screenshot({
          path: '/opt/cursor/artifacts/process_circle_step1_1007x520.png',
          fullPage: false,
        })
      }
      if (index === 3) {
        await page.screenshot({
          path: '/opt/cursor/artifacts/process_circle_step4_1007x520.png',
          fullPage: false,
        })
        await page.screenshot({
          path: '/opt/cursor/artifacts/process_label_gap_step4_1007x520.png',
          fullPage: false,
        })
      }
      if (index === 6) {
        await page.screenshot({
          path: '/opt/cursor/artifacts/process_circle_step7_1007x520.png',
          fullPage: false,
        })
      }
    }

    for (let index = 1; index < centers.length; index += 1) {
      expect(centers[index]).toBeGreaterThan(centers[index - 1] + 8)
    }

    await page.screenshot({
      path: '/opt/cursor/artifacts/process_fold_1007x520.png',
      fullPage: false,
    })
  })

  test('1007x560 and 1440x900 keep the row and a visible highlight', async ({ page }) => {
    for (const viewport of [
      { width: 1007, height: 560, shot: '/opt/cursor/artifacts/process_fold_1007x560.png' },
      { width: 1440, height: 900, shot: '/opt/cursor/artifacts/process_fold_1440x900.png' },
    ]) {
      await page.setViewportSize(viewport)
      await openProcess(page)
      const tops = await stepTops(page)
      expect(tops).toHaveLength(7)
      for (const top of tops) expect(Math.abs(top - tops[0])).toBeLessThanOrEqual(1)
      await page.getByTestId('process-step-4').hover()
      await expect(page.getByTestId('process-step-4')).toHaveAttribute('data-active', 'true')
      await expect(page.getByTestId('process-step-4').locator('[data-icon-active="true"]')).toBeVisible()
      await expect(page.locator('[data-slot="fluid-hover-highlight"]')).toHaveCount(0)
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1)
      await page.screenshot({ path: viewport.shot, fullPage: false })
    }
  })

  test('highlight auto-advances across step 1, a middle step, and step 7, then loops', async ({ page }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width: 1007, height: 520 })
    await openProcess(page)
    const steps = page.getByTestId('process-steps')
    await expect(steps).toHaveAttribute('data-autoplay', 'running')

    const waitForStep = async (index: number) => {
      await expect.poll(async () => {
        const active = await page.getByTestId(`process-step-${index}`).getAttribute('data-active')
        const mode = await steps.getAttribute('data-autoplay')
        return active === 'true' && mode === 'running'
      }, { timeout: 20_000 }).toBe(true)
      await expect(page.getByTestId(`process-step-${index}`).locator('[data-icon-active="true"]')).toBeVisible()
    }

    await waitForStep(0)
    await page.screenshot({
      path: '/opt/cursor/artifacts/process_circle_auto_step1_1007x520.png',
      fullPage: false,
    })
    await waitForStep(3)
    await page.screenshot({
      path: '/opt/cursor/artifacts/process_circle_auto_step4_1007x520.png',
      fullPage: false,
    })
    await waitForStep(6)
    await page.screenshot({
      path: '/opt/cursor/artifacts/process_circle_auto_step7_1007x520.png',
      fullPage: false,
    })
    await waitForStep(0)

    await page.getByTestId('process-step-4').hover()
    await expect(steps).toHaveAttribute('data-autoplay', 'paused')
    await expect(page.getByTestId('process-step-4')).toHaveAttribute('data-active', 'true')
    await page.waitForTimeout(2200)
    await expect(page.getByTestId('process-step-4')).toHaveAttribute('data-active', 'true')
    await page.mouse.move(4, 4)
    await expect(page.getByTestId('process-step-4')).toHaveAttribute('data-active', 'true')
    await waitForStep(5)
  })

  test('reduced motion does not cycle and only highlights on hover', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 1007, height: 520 })
    await openProcess(page)
    await page.waitForTimeout(2200)
    await expect(page.getByTestId('process-steps')).toHaveAttribute('data-autoplay', 'off')
    await expect(page.locator('[data-icon-active="true"]')).toHaveCount(0)
    await page.getByTestId('process-step-2').hover()
    await expect(page.getByTestId('process-step-2')).toHaveAttribute('data-active', 'true')
    await expect(page.getByTestId('process-step-2').locator('[data-icon-active="true"]')).toBeVisible()
    await page.mouse.move(4, 4)
    await expect(page.locator('[data-icon-active="true"]')).toHaveCount(0)
  })

  test('step circles use the tier accent and light the matching card', async ({ page }) => {
    await page.setViewportSize({ width: 1007, height: 520 })
    await openProcess(page)

    const accentOf = async (index: number) => {
      return page.getByTestId(`process-step-${index}`).locator('.process-icon').evaluate((el) => {
        const style = getComputedStyle(el)
        return { border: style.borderColor, shadow: style.boxShadow, glyph: getComputedStyle(el.querySelector('.process-icon-glyph') as Element).color }
      })
    }
    const tierGlow = async (tier: number) => {
      return page.locator('.process-tier').nth(tier).locator('.pillar-inner').evaluate((el) => getComputedStyle(el).boxShadow)
    }
    const optionalVisibility = async (index: number) => {
      return page.getByTestId(`process-step-${index}`).locator('.process-optional').evaluate((el) => getComputedStyle(el).visibility)
    }

    await expect(page.getByTestId('process-step-5').locator('.process-optional')).toBeAttached()
    expect(await optionalVisibility(5)).toBe('hidden')
    expect(await optionalVisibility(6)).toBe('hidden')

    await page.getByTestId('process-step-1').hover()
    await expect.poll(async () => (await accentOf(1)).border).toContain('69, 122, 0')
    await expect.poll(async () => tierGlow(0)).toContain('69, 122, 0')
    expect(await tierGlow(1)).not.toContain('45, 165, 160')
    await page.screenshot({ path: '/opt/cursor/artifacts/process_tier_sync_1_1007x520.png', fullPage: false })

    await page.getByTestId('process-step-4').hover()
    await expect.poll(async () => (await accentOf(4)).shadow).toContain('45, 165, 160')
    await expect.poll(async () => tierGlow(1)).toContain('45, 165, 160')
    await page.screenshot({ path: '/opt/cursor/artifacts/process_tier_sync_2_1007x520.png', fullPage: false })

    await page.getByTestId('process-step-5').hover()
    await expect.poll(async () => (await accentOf(5)).border).toContain('226, 122, 44')
    await expect.poll(async () => tierGlow(2)).toContain('226, 122, 44')
    expect(await optionalVisibility(5)).toBe('visible')
    expect(await optionalVisibility(6)).toBe('hidden')
    await page.screenshot({ path: '/opt/cursor/artifacts/process_tier_sync_3_1007x520.png', fullPage: false })

    await page.getByTestId('process-step-6').hover()
    await expect.poll(async () => (await accentOf(6)).glyph).toContain('226, 122, 44')
    expect(await optionalVisibility(6)).toBe('visible')
    await page.screenshot({ path: '/opt/cursor/artifacts/process_optional_lab_1007x520.png', fullPage: false })

    await page.mouse.move(8, 8)
    await page.getByTestId('process-step-5').focus()
    await page.keyboard.press('Tab')
    await expect(page.getByTestId('process-step-6')).toBeFocused()
    expect(await optionalVisibility(6)).toBe('visible')
    expect(await optionalVisibility(5)).toBe('hidden')
  })

  test('mobile carousel snaps one card at a time and the cycle advances slides', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openProcess(page)

    const row = page.getByTestId('process-steps')
    const metrics = await row.evaluate((el) => {
      const items = Array.from(el.querySelectorAll('li')) as HTMLElement[]
      const first = items[0]
      const second = items[1]
      return {
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        count: items.length,
        tops: items.map((item) => item.offsetTop),
        firstWidth: first?.offsetWidth ?? 0,
        secondLeft: second?.offsetLeft ?? 0,
        dots: document.querySelectorAll('[data-testid^="process-dot-"]').length,
      }
    })
    expect(metrics.count).toBe(7)
    expect(metrics.dots).toBe(7)
    expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth + 40)
    expect(metrics.firstWidth / metrics.clientWidth).toBeGreaterThan(0.72)
    expect(metrics.firstWidth / metrics.clientWidth).toBeLessThan(0.9)
    expect(metrics.secondLeft).toBeLessThan(metrics.clientWidth)
    for (const top of metrics.tops) {
      expect(Math.abs(top - metrics.tops[0])).toBeLessThanOrEqual(1)
    }

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1)

    await expect(row).toHaveAttribute('data-autoplay', 'running')
    const firstIndex = await row.getAttribute('data-active-index')
    await expect.poll(async () => row.getAttribute('data-active-index'), { timeout: 8_000 }).not.toBe(firstIndex)

    await page.getByTestId('process-dot-0').click()
    await expect(page.getByTestId('process-step-0')).toHaveAttribute('data-active', 'true')
    await expect.poll(async () => row.evaluate((el) => el.scrollLeft)).toBeLessThan(24)
    await page.screenshot({
      path: '/opt/cursor/artifacts/process_carousel_slide1_390.png',
      fullPage: false,
    })

    await page.getByTestId('process-dot-3').click()
    await expect(page.getByTestId('process-step-3')).toHaveAttribute('data-active', 'true')
    await expect.poll(async () => row.evaluate((el) => el.scrollLeft)).toBeGreaterThan(80)
    await expect(page.getByTestId('process-step-3').locator('[data-icon-active="true"]')).toBeVisible()
    await expect.poll(async () => {
      return page.getByTestId('process-step-3').locator('.process-icon').evaluate((el) => getComputedStyle(el).borderColor)
    }).toContain('45, 165, 160')
    await expect.poll(async () => {
      return page.getByTestId('process-step-3').locator('.process-icon').evaluate((el) => getComputedStyle(el).transform)
    }).toContain('1.08')
    const mobileGap = await circleLabelGap(page, 3)
    const mobileTarget = Math.min(16, Math.max(10, 844 * 0.014))
    expect(Math.abs(mobileGap - mobileTarget)).toBeLessThan(2)
    await expect(page.locator('[data-slot="fluid-hover-highlight"]')).toHaveCount(0)
    await page.screenshot({
      path: '/opt/cursor/artifacts/process_tier_sync_390.png',
      fullPage: false,
    })
    await page.screenshot({
      path: '/opt/cursor/artifacts/process_circle_carousel_390.png',
      fullPage: false,
    })
    await page.screenshot({
      path: '/opt/cursor/artifacts/process_label_gap_carousel_390.png',
      fullPage: false,
    })

    await page.getByTestId('process-carousel-next').click()
    await expect(page.getByTestId('process-step-4')).toHaveAttribute('data-active', 'true')
  })
})
