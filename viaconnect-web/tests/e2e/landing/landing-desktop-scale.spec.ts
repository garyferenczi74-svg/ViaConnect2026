// Desktop scale for the landing folds. The short-laptop rules stay in
// force below 1200px, so 1007x520 must keep the laptop measurements.

import { expect, test, type Page } from '@playwright/test'

async function align(page: Page, id: string) {
  await page.evaluate((sectionId) => {
    const section = document.getElementById(sectionId)
    const nav = document.querySelector('header nav')
    if (!section || !nav) return
    const top = section.getBoundingClientRect().top + window.scrollY - nav.getBoundingClientRect().height
    window.scrollTo({ top: Math.max(0, top), behavior: 'auto' })
  }, id)
}

test.describe('landing desktop scale', () => {
  test('1007x520 keeps the laptop genomics fold', async ({ page }) => {
    await page.setViewportSize({ width: 1007, height: 520 })
    await page.goto('/')
    await page.getByTestId('hero-headline').waitFor()
    await align(page, 'genomics')
    const measured = await page.locator('.genomics-panel').first().evaluate((el) => {
      const panel = el.getBoundingClientRect()
      const cta = document.querySelector('.genomics-cta')
      const panels = document.querySelector('.genomics-panels')?.getBoundingClientRect()
      const actions = document.querySelector('.genomics-actions')?.getBoundingClientRect()
      return {
        panelH: Math.round(panel.height),
        ctaSize: cta ? getComputedStyle(cta).fontSize : '',
        gap: panels && actions ? Math.round(actions.top - panels.bottom) : 0,
      }
    })
    expect(measured.panelH).toBeLessThanOrEqual(120)
    expect(measured.ctaSize).toBe('12.5px')
    expect(measured.gap).toBeGreaterThanOrEqual(28)
    expect(measured.gap).toBeLessThanOrEqual(36)
  })

  test('1280, 1440, and 1920 scale genomics, features, and process', async ({ page }) => {
    for (const viewport of [
      { width: 1280, height: 800 },
      { width: 1440, height: 900 },
      { width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize(viewport)
      await page.goto('/')
      await page.getByTestId('hero-headline').waitFor()

      await align(page, 'genomics')
      const genomics = await page.evaluate(() => {
        const panel = document.querySelector('.genomics-panel')?.getBoundingClientRect()
        const heading = getComputedStyle(document.querySelector('#genomics h2') as Element).fontSize
        const ctas = [...document.querySelectorAll('.genomics-cta')].map((el) => Math.round(el.getBoundingClientRect().top))
        const rows = ctas.filter((top, index) => ctas.findIndex((other) => Math.abs(other - top) < 4) === index)
        return {
          panelH: panel ? Math.round(panel.height) : 0,
          panelW: panel ? Math.round(panel.width) : 0,
          heading,
          ctaSize: getComputedStyle(document.querySelector('.genomics-cta') as Element).fontSize,
          rows: rows.length,
          overflow: document.documentElement.scrollWidth - window.innerWidth,
        }
      })
      expect(genomics.panelH, `${viewport.width} panel`).toBeGreaterThanOrEqual(190)
      expect(genomics.panelW, `${viewport.width} panel width`).toBeLessThanOrEqual(420)
      expect(parseFloat(genomics.heading), viewport.width.toString()).toBeGreaterThanOrEqual(40)
      expect(genomics.ctaSize).toBe('16px')
      expect(genomics.rows).toBe(1)
      expect(genomics.overflow).toBeLessThanOrEqual(1)

      await align(page, 'features')
      const cardBottom = await page.locator('[data-testid^="features-coverflow-card-"]').first().evaluate((el) => el.getBoundingClientRect().bottom)
      expect(cardBottom, `${viewport.width} feature card`).toBeLessThanOrEqual(viewport.height - 8)

      await align(page, 'process')
      const tierH = await page.locator('.process-tier').first().evaluate((el) => el.getBoundingClientRect().height)
      expect(tierH, `${viewport.width} tier`).toBeGreaterThanOrEqual(160)
      const noteOverflow = await page.locator('.process-note-copy').evaluate((el) => el.scrollWidth - el.clientWidth)
      expect(noteOverflow).toBeLessThanOrEqual(1)
    }
  })
})
