// Genomics fold: heading and both panel rows fit a short laptop screen.

import { expect, test, type Page } from '@playwright/test'

async function openGenomics(page: Page) {
  await page.goto('/')
  await page.getByTestId('hero-headline').waitFor({ state: 'visible' })
  await page.evaluate(() => {
    const section = document.getElementById('genomics')
    const nav = document.querySelector('header nav')
    if (!section || !nav) return
    const navBottom = nav.getBoundingClientRect().height
    const top = section.getBoundingClientRect().top + window.scrollY - navBottom
    window.scrollTo({ top, behavior: 'auto' })
  })
  await expect.poll(async () => {
    return page.locator('.genomics-intro').evaluate((el) => {
      const style = getComputedStyle(el)
      if (Number(style.opacity) < 0.99) return false
      if (style.transform === 'none') return true
      const match = style.transform.match(/matrix\(([^)]+)\)/)
      const translateY = match ? Number(match[1].split(',')[5]) : 0
      return Math.abs(translateY) < 1
    })
  }, { timeout: 5000 }).toBe(true)
  await expect.poll(async () => {
    return page.locator('.genomics-panel').evaluateAll((els) => {
      const visible = els.filter((el) => el.getBoundingClientRect().top < window.innerHeight - 8)
      if (visible.length === 0) return false
      return visible.every((el) => {
        const style = getComputedStyle(el)
        if (Number(style.opacity) < 0.99) return false
        if (style.transform === 'none') return true
        const match = style.transform.match(/matrix\(([^)]+)\)/)
        const translateY = match ? Number(match[1].split(',')[5]) : 0
        return Math.abs(translateY) < 1
      })
    })
  }, { timeout: 5000 }).toBe(true)
}

async function measure(page: Page) {
  return page.evaluate(() => {
    const nav = document.querySelector('header nav')?.getBoundingClientRect()
    const heading = document.querySelector('[data-testid="genomics-heading"]')?.getBoundingClientRect()
    const panels = [...document.querySelectorAll<HTMLElement>('.genomics-panel')].map((el) => el.getBoundingClientRect())
    const round = (n: number) => Math.round(n * 10) / 10
    if (!nav || !heading || panels.length < 6) return null
    const sortedTops = panels.map((box) => box.top).sort((a, b) => a - b)
    let rows = 0
    let lastTop = -999
    for (const top of sortedTops) {
      if (top - lastTop > 24) {
        rows += 1
        lastTop = top
      }
    }
    const last = panels[panels.length - 1]
    return {
      navBottom: round(nav.bottom),
      headingY: round(heading.y),
      headingH: round(heading.height),
      rows,
      panelBottom: round(Math.max(...panels.map((box) => box.bottom))),
      lastH: last ? round(last.height) : 0,
      viewport: window.innerHeight,
      clearance: round(window.innerHeight - Math.max(...panels.map((box) => box.bottom))),
    }
  })
}

test.describe('genomics fold', () => {
  for (const height of [520, 560]) {
    test(`heading and both card rows fit at 1007x${height}`, async ({ page }) => {
      await page.setViewportSize({ width: 1007, height })
      await openGenomics(page)
      const measured = await measure(page)
      expect(measured).not.toBeNull()
      if (!measured) return
      console.log(`genomics-fold ${height}`, JSON.stringify(measured))
      expect(measured.headingY).toBeGreaterThanOrEqual(measured.navBottom - 1)
      expect(measured.rows).toBe(2)
      expect(measured.panelBottom).toBeLessThanOrEqual(measured.viewport - 8)
      expect(measured.clearance).toBeGreaterThanOrEqual(8)
      await page.screenshot({
        path: `/opt/cursor/artifacts/genomics_fold_1007x${height}.png`,
        fullPage: false,
      })
    })
  }

  test('390 keeps a stacked genomics section', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openGenomics(page)
    const measured = await measure(page)
    expect(measured).not.toBeNull()
    if (!measured) return
    console.log('genomics-fold 390', JSON.stringify(measured))
    expect(measured.rows).toBeGreaterThanOrEqual(6)
    await expect(page.getByText('PeptideIQ', { exact: true })).toBeVisible()
    await page.screenshot({
      path: '/opt/cursor/artifacts/genomics_fold_390.png',
      fullPage: false,
    })
  })
})
