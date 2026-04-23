// Prompt #117 §4.4: ViaConnect brand asset generator.
//
// Produces assets/icon.png (1024x1024) and assets/splash.png (2732x2732)
// from the authoritative ViaConnect brand mark at public/icon.svg.
// Deterministic; no random seeds. Safe to re-run.
//
// Prerequisites:
//   sharp (already in dependencies from Prompt #106)
//
// Run:
//   node scripts/generate-app-store-assets.mjs
//
// Output consumed by:
//   npx capacitor-assets generate --assetPath assets
//
// Safe-zone rationale:
//   - Icon 1024: mark rendered at 80% (820x820) centered; iOS corner-
//     radius clipping + Android adaptive crop both preserve it.
//   - Splash 2732: mark + wordmark + tagline stay within centered
//     1200x1200 so Capacitor center-crop survives every device aspect
//     ratio (9:16 phones through 4:3 iPads).
//   - Zero alpha (`flatten`) — iOS App Store rejects any transparency.

import sharp from 'sharp';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const BRAND = {
  navy:   '#0B1120',   // matches public/icon.svg background
  teal:   '#22D3EE',   // matches public/icon.svg ring color
  orange: '#B75F19',   // matches public/icon.svg V letter
  ink:    '#F5F7FB',   // splash wordmark color
};

const REPO_ROOT = resolve(process.cwd());
const BRAND_SVG_PATH = resolve(REPO_ROOT, 'public/icon.svg');

/**
 * Splash wordmark: "ViaConnect" + tagline "BUILT FOR YOUR BIOLOGY".
 * Paired with the brand mark above. No emojis; no em-dashes.
 */
function wordmarkSVG({ width = 1400, height = 360 } = {}) {
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"
         xmlns="http://www.w3.org/2000/svg">
      <text x="50%" y="45%" text-anchor="middle" dominant-baseline="middle"
            font-family="Instrument Sans, system-ui, sans-serif"
            font-size="180" font-weight="600" fill="${BRAND.ink}">ViaConnect</text>
      <text x="50%" y="80%" text-anchor="middle" dominant-baseline="middle"
            font-family="Instrument Sans, system-ui, sans-serif"
            font-size="64" font-weight="400" fill="${BRAND.teal}"
            letter-spacing="6">BUILT FOR YOUR BIOLOGY</text>
    </svg>
  `;
}

/**
 * Strip the rounded-corner background from the brand SVG so we can
 * composite the MARK ONLY onto our own canvas. The original icon.svg
 * has a rx="6" rect; iOS applies its own corner radius and rejects
 * rounded-corner source images, so we want a full-bleed square canvas
 * with just the foreground elements.
 */
async function extractMarkSVG() {
  const original = await readFile(BRAND_SVG_PATH, 'utf8');
  // Remove the <rect> background; keep the foreground (V letter + circle + dot).
  // Regex tolerates attribute order or whitespace variations.
  return original.replace(/<rect\b[^>]*\/>/i, '');
}

async function generateIcon() {
  const size = 1024;
  const markSize = Math.round(size * 0.80);          // 820x820 safe-zone
  const offset = Math.round((size - markSize) / 2);  // centered

  const canvas = await sharp({
    create: { width: size, height: size, channels: 4, background: BRAND.navy },
  }).png().toBuffer();

  const markSVG = await extractMarkSVG();
  const mark = await sharp(Buffer.from(markSVG))
    .resize(markSize, markSize)
    .png()
    .toBuffer();

  await sharp(canvas)
    .composite([{ input: mark, top: offset, left: offset }])
    .flatten({ background: BRAND.navy })
    .png({ compressionLevel: 9 })
    .toFile(resolve(REPO_ROOT, 'assets/icon.png'));

  console.log('  assets/icon.png written (1024x1024, alpha stripped)');
}

async function generateSplash() {
  const size = 2732;

  const canvas = await sharp({
    create: { width: size, height: size, channels: 4, background: BRAND.navy },
  }).png().toBuffer();

  // Brand mark: upper portion of the 1200x1200 safe zone
  const markSize = 600;
  const markLeft = Math.round((size - markSize) / 2);
  const markTop  = Math.round(size / 2 - markSize - 60);

  const markSVG = await extractMarkSVG();
  const mark = await sharp(Buffer.from(markSVG))
    .resize(markSize, markSize)
    .png()
    .toBuffer();

  // Wordmark: below vertical center
  const wmWidth = 1400;
  const wmHeight = 360;
  const wmLeft = Math.round((size - wmWidth) / 2);
  const wmTop  = Math.round(size / 2 + 40);

  const wordmark = await sharp(Buffer.from(wordmarkSVG({ width: wmWidth, height: wmHeight })))
    .png()
    .toBuffer();

  await sharp(canvas)
    .composite([
      { input: mark,     top: markTop, left: markLeft },
      { input: wordmark, top: wmTop,   left: wmLeft   },
    ])
    .flatten({ background: BRAND.navy })
    .png({ compressionLevel: 9 })
    .toFile(resolve(REPO_ROOT, 'assets/splash.png'));

  console.log('  assets/splash.png written (2732x2732, alpha stripped)');
}

async function main() {
  await mkdir(resolve(REPO_ROOT, 'assets'), { recursive: true });
  await generateIcon();
  await generateSplash();
  console.log('');
  console.log('Source mark: public/icon.svg');
  console.log('Next steps:');
  console.log('  1. Visual QA checklist (Prompt #117 §4.7)');
  console.log('  2. npx capacitor-assets generate --assetPath assets');
  console.log('  3. node scripts/generate-pwa-icons.mjs (fallback if step 2 skips public/icons/)');
}

main().catch((err) => {
  console.error('asset generation failed:', err);
  process.exit(1);
});
