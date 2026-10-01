/**
 * My Genetics action chips, before (glass) and after (section tabs).
 * No dev server and no auth. Tailwind is compiled for this fixture only.
 * Shop Playwright projects are skipped; viewports are set inside one project.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import sharp from 'sharp';

const ARTIFACT_DIR = '/opt/cursor/artifacts/genetics-card-tabs';
const FIXTURE = readFileSync(join(__dirname, 'action-card-tabs.fixture.html'), 'utf8');
const CSS_PATH = '/tmp/action-card-tabs.generated.css';
const WEB_ROOT = join(__dirname, '..', '..', '..');

test.beforeAll(() => {
  execFileSync(
    'npx',
    [
      'tailwindcss',
      '-c',
      'tailwind.config.ts',
      '-i',
      'tests/e2e/genetics/action-card-tabs.input.css',
      '-o',
      CSS_PATH,
      '--content',
      './src/components/genetics/hub/geneticsActionTabCta.ts,./tests/e2e/genetics/action-card-tabs.fixture.html',
      '--minify',
    ],
    { cwd: WEB_ROOT, stdio: 'pipe' },
  );
});

const VIEWPORTS = [
  { name: '390', width: 390, height: 1400 },
  { name: '1280', width: 1280, height: 900 },
] as const;

function linear(channel: number): number {
  const s = channel / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(rgb: [number, number, number]): number {
  return 0.2126 * linear(rgb[0]) + 0.7152 * linear(rgb[1]) + 0.0722 * linear(rgb[2]);
}

function contrast(a: [number, number, number], b: [number, number, number]): number {
  const hi = Math.max(luminance(a), luminance(b));
  const lo = Math.min(luminance(a), luminance(b));
  return (hi + 0.05) / (lo + 0.05);
}

async function fillPixel(png: Buffer): Promise<[number, number, number]> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // Bottom padding, horizontal center: inside the pill, clear of the border and the glyphs.
  const x = Math.max(2, Math.floor(info.width / 2));
  const y = Math.max(2, info.height - 5);
  const offset = (y * info.width + x) * 4;
  return [data[offset], data[offset + 1], data[offset + 2]];
}

test.beforeEach(({ }, info) => {
  test.skip(info.project.name !== 'laptop-1024', 'one project; 390 and 1280 are set inside');
});

test('four genetics chips at 390 and 1280, before and after, AA on bright cards', async ({ page }) => {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  const css = readFileSync(CSS_PATH, 'utf8');
  const html = FIXTURE.replace('</head>', `<style>${css}</style></head>`);

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    await page.evaluate((name) => {
      (window as unknown as { renderGeneticsChips: (viewport: string) => void }).renderGeneticsChips(name);
    }, viewport.name);

    const before = page.locator('[data-phase="before"]');
    const after = page.locator('[data-phase="after"]');
    await before.screenshot({ path: join(ARTIFACT_DIR, `before-${viewport.name}.png`) });
    await after.screenshot({ path: join(ARTIFACT_DIR, `after-${viewport.name}.png`) });

    const labels = after.locator('[data-chip="after"] [data-chip-label]');
    await expect(labels).toHaveText(['DNA', 'Labs', 'Catalog', 'Panels']);
    const aria = await after.locator('[data-chip="after"]').evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('aria-label')),
    );
    expect(aria).toEqual(['Upload DNA', 'Upload Labs', 'Browse Catalog', 'View Panels']);

    const count = await labels.count();
    for (let i = 0; i < count; i += 1) {
      const metrics = await labels.nth(i).evaluate((el) => {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
          whiteSpace: style.whiteSpace,
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          height: rect.height,
          lineHeight: parseFloat(style.lineHeight),
        };
      });
      expect(metrics.whiteSpace).toBe('nowrap');
      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
      expect(metrics.height).toBeLessThan(metrics.lineHeight * 1.6);
    }

    const chip = after.locator('[data-chip="after"]').first();
    const bg = await fillPixel(await chip.screenshot());
    const text = await chip.evaluate((el) => {
      const parsed = getComputedStyle(el).color.match(/\d+/g)?.slice(0, 3).map(Number) ?? [0, 0, 0];
      return parsed as [number, number, number];
    });
    const ratio = contrast(text, bg);
    expect(text, `text ${text.join(',')}`).toEqual([45, 165, 160]);
    expect(bg[0], `rest fill ${bg.join(',')}`).toBeLessThan(80);
    expect(ratio, `rest contrast ${ratio.toFixed(2)} on ${bg.join(',')}`).toBeGreaterThanOrEqual(4.5);

    await chip.hover();
    await after.screenshot({ path: join(ARTIFACT_DIR, `after-hover-${viewport.name}.png`) });
    const hoverBg = await fillPixel(await chip.screenshot());
    const hoverRatio = contrast(text, hoverBg);
    expect(hoverBg[0], `hover fill ${hoverBg.join(',')}`).toBeLessThan(80);
    expect(hoverRatio, `hover contrast ${hoverRatio.toFixed(2)} on ${hoverBg.join(',')}`).toBeGreaterThanOrEqual(4.5);

    await page.keyboard.press('Tab');
    const focused = page.locator('[data-card-link]:focus-visible [data-chip="after"]');
    await expect.poll(async () => focused.evaluate((el) => getComputedStyle(el).boxShadow), {
      timeout: 1000,
    }).toMatch(/rgba?\(45,\s*165,\s*160/);
    await after.screenshot({ path: join(ARTIFACT_DIR, `after-focus-${viewport.name}.png`) });
  }
});
