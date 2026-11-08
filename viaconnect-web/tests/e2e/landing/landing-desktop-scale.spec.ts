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
        const actions = document.querySelector('.genomics-actions')?.getBoundingClientRect()
        return {
          panelH: panel ? Math.round(panel.height) : 0,
          panelW: panel ? Math.round(panel.width) : 0,
          heading,
          ctaSize: getComputedStyle(document.querySelector('.genomics-cta') as Element).fontSize,
          rows: rows.length,
          actionsBottom: actions ? Math.round(actions.bottom) : 0,
          overflow: document.documentElement.scrollWidth - window.innerWidth,
        }
      })
      expect(genomics.panelH, `${viewport.width} panel`).toBeGreaterThanOrEqual(200)
      expect(genomics.panelW, `${viewport.width} panel width`).toBeGreaterThanOrEqual(340)
      expect(genomics.panelW, `${viewport.width} panel width cap`).toBeLessThanOrEqual(620)
      expect(parseFloat(genomics.heading), viewport.width.toString()).toBeGreaterThanOrEqual(44)
      expect(genomics.ctaSize).toBe('17px')
      expect(genomics.rows).toBe(1)
      expect(genomics.actionsBottom, `${viewport.width} buttons`).toBeLessThanOrEqual(viewport.height - 4)
      expect(genomics.overflow).toBeLessThanOrEqual(1)

      await align(page, 'features')
      const feature = await page.locator('#features [data-active="true"]').evaluate((el) => {
        const box = el.getBoundingClientRect()
        return { bottom: box.bottom, width: box.width }
      })
      expect(feature.bottom, `${viewport.width} feature card`).toBeLessThanOrEqual(viewport.height - 8)
      expect(feature.width, `${viewport.width} feature width`).toBeGreaterThanOrEqual(340)

      await align(page, 'process')
      const tier = await page.locator('.process-tier').first().evaluate((el) => {
        const box = el.getBoundingClientRect()
        const body = el.querySelector('.pillar-body')
        const title = el.querySelector('.pillar-title')
        return {
          height: box.height,
          bottom: box.bottom,
          body: body ? parseFloat(getComputedStyle(body).fontSize) : 0,
          title: title ? parseFloat(getComputedStyle(title).fontSize) : 0,
          clipped: body ? body.scrollHeight - body.clientHeight : 0,
        }
      })
      expect(tier.body, `${viewport.width} tier body`).toBeGreaterThanOrEqual(16.8)
      expect(tier.title, `${viewport.width} tier title`).toBeGreaterThanOrEqual(21)
      expect(tier.height, `${viewport.width} tier`).toBeLessThanOrEqual(360)
      expect(tier.clipped, `${viewport.width} tier clip`).toBeLessThanOrEqual(1)
      expect(tier.bottom, `${viewport.width} tier bottom`).toBeLessThanOrEqual(viewport.height - 8)
      const tiers = await page.locator('#process .process-tier').evaluateAll((els) =>
        els.map((el) => {
          const box = el.getBoundingClientRect()
          return { w: Math.round(box.width), h: Math.round(box.height), layoutH: (el as HTMLElement).offsetHeight }
        }),
      )
      expect(tiers, `${viewport.width} tier count`).toHaveLength(3)
      for (const card of tiers) {
        expect(Math.abs(card.w - tiers[0].w), `${viewport.width} tier width`).toBeLessThanOrEqual(1)
        expect(Math.abs(card.h - tiers[0].h), `${viewport.width} tier height`).toBeLessThanOrEqual(1)
      }
      const beforeHover = tiers[0].layoutH
      await page.locator('#process .process-tier').first().hover()
      const afterHover = await page.locator('#process .process-tier').evaluateAll((els) =>
        els.map((el) => (el as HTMLElement).offsetHeight),
      )
      expect(afterHover[0], `${viewport.width} hover height`).toBe(beforeHover)
      for (const height of afterHover) {
        expect(Math.abs(height - afterHover[0]), `${viewport.width} hover match`).toBeLessThanOrEqual(1)
      }
      const noteOverflow = await page.locator('.process-note-copy').evaluate((el) => el.scrollWidth - el.clientWidth)
      expect(noteOverflow).toBeLessThanOrEqual(1)
    }
  })
})
