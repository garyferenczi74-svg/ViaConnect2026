// Features coverflow: no arrow or dot chrome. Side-card clicks and swipes
// still move the front card.

import { expect, test, type Page } from '@playwright/test'

async function openFeatures(page: Page) {
  await page.goto('/')
  await page.getByTestId('hero-headline').waitFor({ state: 'visible' })
  const menuButton = page.getByRole('button', { name: 'Open Menu' })
  if (await menuButton.isVisible()) {
    await menuButton.click()
  }
  await page.locator('header nav').getByRole('link', { name: 'Features', exact: true }).click()
  await expect.poll(async () => {
    const heading = page.getByTestId('features-heading')
    const nav = page.locator('header nav')
    const headingBox = await heading.boundingBox()
    const navBox = await nav.boundingBox()
    if (!headingBox || !navBox) return false
    return headingBox.y >= navBox.y + navBox.height - 1 && headingBox.y < navBox.y + navBox.height + 160
  }, { timeout: 8000 }).toBe(true)
  await page.getByTestId('features-coverflow').hover()
}

async function settleFeatures(page: Page) {
  await page.evaluate(() => {
    const section = document.getElementById('features')
    if (!section) return
    const margin = Number.parseFloat(getComputedStyle(section).scrollMarginTop) || 80
    const top = section.getBoundingClientRect().top + window.scrollY - margin
    window.scrollTo({ top, behavior: 'auto' })
  })
  await expect.poll(async () => {
    return page.locator('.features-intro').evaluate((el) => {
      const style = getComputedStyle(el)
      if (Number(style.opacity) < 0.99) return false
      if (style.transform === 'none') return true
      const match = style.transform.match(/matrix\(([^)]+)\)/)
      const translateY = match ? Number(match[1].split(',')[5]) : 0
      return Math.abs(translateY) < 1
    })
  }, { timeout: 4000 }).toBe(true)
}

async function foldMeasure(page: Page) {
  return page.evaluate(() => {
    const nav = document.querySelector('header nav')?.getBoundingClientRect()
    const heading = document.querySelector('[data-testid="features-heading"]')?.getBoundingClientRect()
    const subtitle = [...document.querySelectorAll('#features .features-subtitle')].find((el) => getComputedStyle(el).display !== 'none')?.getBoundingClientRect()
    const stage = document.querySelector('#features [aria-roledescription="carousel"]')?.getBoundingClientRect()
    const card = document.querySelector('#features [data-active="true"]')?.getBoundingClientRect()
    const round = (n: number) => Math.round(n * 10) / 10
    if (!nav || !heading || !subtitle || !stage || !card) return null
    return {
      navBottom: round(nav.bottom),
      headingY: round(heading.y),
      gapAbove: round(card.top - subtitle.bottom),
      gapBelow: round(window.innerHeight - card.bottom),
      cardBottom: round(card.bottom),
      cardH: round(card.height),
      viewport: window.innerHeight,
    }
  })
}

async function activeCardId(page: Page): Promise<string> {
  const testId = await page.locator('[data-testid^="features-coverflow-card-"][data-active="true"]').getAttribute('data-testid')
  return testId ?? ''
}

test.describe('features coverflow navigation', () => {
  test('1007x520 has no arrows or dots, and a side card click advances', async ({ page }) => {
    await page.setViewportSize({ width: 1007, height: 520 })
    await openFeatures(page)

    await expect(page.getByRole('button', { name: 'Previous feature' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Next feature' })).toHaveCount(0)
    await expect(page.getByTestId('features-coverflow-controls')).toHaveCount(0)
    await expect(page.getByRole('tablist', { name: 'Feature slides' })).toHaveCount(0)

    const before = await activeCardId(page)
    const point = await page.evaluate(() => {
      const cards = [...document.querySelectorAll<HTMLElement>('[data-testid^="features-coverflow-card-"]')]
      const side = cards
        .filter((el) => el.getAttribute('data-active') !== 'true' && Number(getComputedStyle(el).opacity) > 0.35)
        .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left)[0]
      if (!side) return null
      const rect = side.getBoundingClientRect()
      return { x: rect.left + rect.width * 0.3, y: rect.top + rect.height * 0.4 }
    })
    expect(point).not.toBeNull()
    if (!point) return
    await page.mouse.click(point.x, point.y)
    await expect.poll(async () => activeCardId(page)).not.toBe(before)

    const live = page.locator('[aria-live="polite"]')
    await expect(live).toHaveClass(/sr-only/)
    await expect(live).toContainText('of')

    await settleFeatures(page)
    await page.screenshot({
      path: '/opt/cursor/artifacts/features_fold_fit_1007x520.png',
      fullPage: false,
    })
  })

  test('the carousel footer fits under the nav at 1007x520 and 1007x560', async ({ page }) => {
    for (const height of [520, 560]) {
      await page.setViewportSize({ width: 1007, height })
      await openFeatures(page)
      await settleFeatures(page)
      const measured = await foldMeasure(page)
      expect(measured, `${height}`).not.toBeNull()
      if (!measured) continue
      console.log(`features-fold ${height}`, JSON.stringify(measured))
      expect(measured.headingY).toBeGreaterThan(measured.navBottom - 1)
      expect(measured.cardBottom).toBeLessThanOrEqual(measured.viewport - 8)
      expect(measured.gapAbove).toBeGreaterThanOrEqual(12)
      expect(measured.gapBelow).toBeGreaterThanOrEqual(12)
      expect(Math.abs(measured.gapAbove - measured.gapBelow)).toBeLessThanOrEqual(12)
      await page.screenshot({
        path: `/opt/cursor/artifacts/features_fold_fit_1007x${height}.png`,
        fullPage: false,
      })
    }
  })

  test('a swipe advances the carousel and 390 has no control row', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openFeatures(page)

    await expect(page.getByRole('button', { name: 'Previous feature' })).toHaveCount(0)
    await expect(page.getByTestId('features-coverflow-controls')).toHaveCount(0)

    const stage = page.getByTestId('features-coverflow').locator('[aria-roledescription="carousel"]')
    const before = await activeCardId(page)
    const box = await stage.boundingBox()
    expect(box).not.toBeNull()
    if (!box) return
    const y = box.y + box.height / 2
    const x = box.x + box.width / 2
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x - 120, y, { steps: 8 })
    await page.mouse.up()
    await expect.poll(async () => activeCardId(page)).not.toBe(before)

    await settleFeatures(page)
    await page.screenshot({
      path: '/opt/cursor/artifacts/features_fold_fit_390.png',
      fullPage: false,
    })
  })
})
