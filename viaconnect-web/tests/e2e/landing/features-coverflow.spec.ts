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

    await page.screenshot({
      path: '/opt/cursor/artifacts/features_coverflow_1007x520.png',
      fullPage: false,
    })
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

    await page.screenshot({
      path: '/opt/cursor/artifacts/features_coverflow_390.png',
      fullPage: false,
    })
  })
})
