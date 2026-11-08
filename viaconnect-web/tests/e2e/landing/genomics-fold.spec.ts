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
    return page.locator('.genomics-panel-slot').evaluateAll((els) => {
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
      const actionsBox = await page.locator('.genomics-actions').evaluate((el) => {
        const actions = el.getBoundingClientRect()
        const panels = document.querySelector('.genomics-panels')?.getBoundingClientRect()
        return {
          bottom: Math.round(actions.bottom * 10) / 10,
          gap: panels ? Math.round((actions.top - panels.bottom) * 10) / 10 : null,
        }
      })
      const ctaRow = await page.locator('.genomics-actions a').evaluateAll((els) => {
        const boxes = els.map((el) => el.getBoundingClientRect())
        const tops = boxes.map((box) => Math.round(box.top))
        const rowTops = tops.filter((top, index) => tops.findIndex((other) => Math.abs(other - top) < 4) === index)
        return {
          count: els.length,
          hrefs: els.map((el) => el.getAttribute('href')),
          labels: els.map((el) => (el.textContent ?? '').replace(/\s+/g, ' ').trim()),
          rows: rowTops.length,
          overflow: (els[0]?.parentElement?.scrollWidth ?? 0) - (els[0]?.parentElement?.clientWidth ?? 0),
        }
      })
      if (height === 520) {
        expect(actionsBox.bottom).toBeLessThanOrEqual(height - 16)
        expect(actionsBox.gap).toBeGreaterThanOrEqual(28)
        expect(actionsBox.gap).toBeLessThanOrEqual(36)
        expect(ctaRow.count).toBe(3)
        expect(ctaRow.rows).toBe(1)
        expect(ctaRow.overflow).toBeLessThanOrEqual(1)
        expect(ctaRow.hrefs[0]).toBe('/shop/genex360')
        expect(ctaRow.labels[0]).toBe('Choose your test')
        expect(ctaRow.hrefs[1]).toBe('/shop?category=methylation')
        expect(ctaRow.labels[1]).toBe('Order GeneX360 full testing protocol')
        console.log(`genomics-actions 520`, JSON.stringify({ ...actionsBox, ...ctaRow }))
      }
      await page.screenshot({
        path: height === 520
          ? '/opt/cursor/artifacts/genomics_ctas_1007x520.png'
          : `/opt/cursor/artifacts/genomics_fold_1007x${height}.png`,
        fullPage: false,
      })
    })
  }

  test('descriptions stay closed until hover, then open', async ({ page }) => {
    await page.setViewportSize({ width: 1007, height: 520 })
    await openGenomics(page)

    const closed = await page.getByTestId('genomics-panel-GeneXM').locator('.genomics-panel-body').evaluate((el) => el.getBoundingClientRect().height)
    expect(closed).toBeLessThan(2)
    await page.screenshot({
      path: '/opt/cursor/artifacts/genomics_cards_rest_1007x520.png',
      fullPage: false,
    })

    const peptide = page.getByTestId('genomics-panel-PeptideIQ')
    await peptide.hover()
    await expect(peptide).toHaveAttribute('aria-expanded', 'true')
    await expect.poll(async () => {
      return peptide.locator('.genomics-panel-body').evaluate((el) => el.getBoundingClientRect().height)
    }).toBeGreaterThan(20)
    await page.screenshot({
      path: '/opt/cursor/artifacts/genomics_cards_hover_1007x520.png',
      fullPage: false,
    })
    await expect(page.getByText('Variants Explorer Preview', { exact: true })).toHaveCount(0)
  })

  test('390 keeps a stacked genomics section', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openGenomics(page)
    const measured = await measure(page)
    expect(measured).not.toBeNull()
    if (!measured) return
    console.log('genomics-fold 390', JSON.stringify(measured))
    expect(measured.rows).toBeGreaterThanOrEqual(6)
    const mobileCtas = await page.locator('.genomics-actions a').evaluateAll((els) => {
      const tops = els.map((el) => el.getBoundingClientRect().top)
      const rowTops = tops.filter((top, index) => tops.findIndex((other) => Math.abs(other - top) < 4) === index)
      return { count: els.length, rows: rowTops.length }
    })
    expect(mobileCtas.count).toBe(3)
    expect(mobileCtas.rows).toBe(3)
    await expect(page.getByText('PeptideIQ', { exact: true })).toBeVisible()
    await expect(page.getByText('Variants Explorer Preview', { exact: true })).toHaveCount(0)
    await page.locator('.genomics-actions').scrollIntoViewIfNeeded()
    await page.screenshot({
      path: '/opt/cursor/artifacts/genomics_ctas_390.png',
      fullPage: false,
    })
  })
})
