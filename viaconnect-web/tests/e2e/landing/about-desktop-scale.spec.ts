// About grows from 1200px. Laptop, tablet, and phone keep the Tailwind scale.

import { expect, test } from '@playwright/test'

const LOCKED = [
  { width: 1007, height: 520, heading: 48, lead: 18 },
  { width: 768, height: 1024, heading: 48, lead: 18 },
  { width: 390, height: 844, heading: 30, lead: 18 },
] as const

async function openAbout(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.getByTestId('hero-headline').waitFor({ state: 'visible' })
  await page.locator('#about h3').first().scrollIntoViewIfNeeded()
  await expect.poll(async () => {
    return page.locator('#about h3').first().evaluate((el) => Number(getComputedStyle(el).opacity))
  }).toBeGreaterThan(0.99)
  await page.evaluate(() => {
    const section = document.getElementById('about')
    const nav = document.querySelector('header nav')
    if (!section || !nav) return
    const top = section.getBoundingClientRect().top + window.scrollY - nav.getBoundingClientRect().height
    window.scrollTo({ top: Math.max(0, top), behavior: 'auto' })
  })
}

test.describe('about desktop scale', () => {
  for (const viewport of LOCKED) {
    test(`${viewport.width}x${viewport.height} keeps the current About type`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await openAbout(page)
      const measured = await page.evaluate(() => {
        const heading = getComputedStyle(document.querySelector('#about h2') as Element).fontSize
        const lead = getComputedStyle(document.querySelector('#about .about-lead') as Element).fontSize
        return {
          heading: parseFloat(heading),
          lead: parseFloat(lead),
          overflow: document.documentElement.scrollWidth - window.innerWidth,
        }
      })
      expect(measured.heading).toBe(viewport.heading)
      expect(measured.lead).toBe(viewport.lead)
      expect(measured.overflow).toBeLessThanOrEqual(1)
    })
  }

  test('1280, 1440, and 1920 enlarge About without overflow', async ({ page }) => {
    for (const viewport of [
      { width: 1280, height: 800 },
      { width: 1440, height: 900 },
      { width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize(viewport)
      await openAbout(page)
      const measured = await page.evaluate(() => {
        const heading = document.querySelector('#about h2') as HTMLElement
        const lead = document.querySelector('#about .about-lead') as HTMLElement
        const card = document.querySelector('#about .about-card') as HTMLElement
        const bio = document.querySelector('#about .about-bio') as HTMLElement
        const quote = document.querySelector('#about .about-quote-text') as HTMLElement
        return {
          heading: parseFloat(getComputedStyle(heading).fontSize),
          headingW: heading.getBoundingClientRect().width,
          lead: parseFloat(getComputedStyle(lead).fontSize),
          cardW: card.getBoundingClientRect().width,
          bio: parseFloat(getComputedStyle(bio).fontSize),
          quote: parseFloat(getComputedStyle(quote).fontSize),
          quoteOverflow: quote.scrollWidth - quote.clientWidth,
          overflow: document.documentElement.scrollWidth - window.innerWidth,
        }
      })
      expect(measured.heading, `${viewport.width} heading`).toBeGreaterThan(48)
      expect(measured.lead, `${viewport.width} lead`).toBeGreaterThan(18)
      expect(measured.bio, `${viewport.width} bio`).toBeGreaterThan(16)
      expect(measured.cardW, `${viewport.width} card`).toBeGreaterThan(520)
      expect(measured.quote, `${viewport.width} quote`).toBeGreaterThan(24)
      expect(measured.quoteOverflow).toBeLessThanOrEqual(1)
      expect(measured.overflow).toBeLessThanOrEqual(1)
    }
  })
})
