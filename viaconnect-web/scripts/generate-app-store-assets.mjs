// Prompt #117 §4.4: ViaConnect brand asset generator.
//
// Produces assets/icon.png (1024x1024) and assets/splash.png (2732x2732)
// from the locked ViaConnect design tokens. Deterministic; no random
// seeds. Safe to re-run.
//
// Prerequisites (one-time):
//   npm install --save-dev sharp
//
// Run:
//   node scripts/generate-app-store-assets.mjs
//
// Output consumed by:
//   npx capacitor-assets generate --assetPath assets
//
// Design anchors (Prompt #117 §4.1):
//   - Deep Navy #1A2744   canvas / background (full bleed, 0 alpha)
//   - Teal #2DA5A0        primary DNA helix mark
//   - Orange #B75E18      DNA rung accents (brand dual-accent)
//   - Ink #F5F7FB         splash wordmark typography
//   - Instrument Sans     splash wordmark + tagline (mark-only on icon)
//
// Safe-zone rationale:
//   - Icon 1024: centered 820x820 (80.1%) carries the mark so Android
//     adaptive icons + iOS corner-radius clipping keep it intact.
//   - Splash 2732: centered 1200x1200 (43.9%) carries mark + wordmark
//     so Capacitor's center-crop survives every aspect ratio from
//     9:16 phones to 4:3 iPads.
//   - Zero alpha anywhere — iOS App Store rejects icons with any
//     transparency. `flatten()` on both outputs enforces this.

import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const BRAND = {
  navy:   '#1A2744',
  card:   '#1E3054',
  teal:   '#2DA5A0',
  orange: '#B75E18',
  ink:    '#F5F7FB',
};

const REPO_ROOT = resolve(process.cwd());

/**
 * ViaConnect DNA helix mark.
 * 420x420 viewport for clean scaling to 614px (icon) and 600px (splash).
 * Two intertwining strands in teal + four crossbar rungs in orange.
 */
function logoMarkSVG() {
  return `
    <svg width="420" height="420" viewBox="0 0 420 420" xmlns="http://www.w3.org/2000/svg">
      <g stroke="${BRAND.teal}" stroke-width="18" fill="none" stroke-linecap="round">
        <path d="M 130 40 C 280 130, 140 210, 290 300 C 440 390, 130 380, 130 380" />
        <path d="M 290 40 C 140 130, 280 210, 130 300 C -20 390, 290 380, 290 380" />
      </g>
      <g stroke="${BRAND.orange}" stroke-width="10" stroke-linecap="round">
        <line x1="160" y1="105" x2="260" y2="105" />
        <line x1="160" y1="175" x2="260" y2="175" />
        <line x1="160" y1="245" x2="260" y2="245" />
        <line x1="160" y1="315" x2="260" y2="315" />
      </g>
    </svg>
  `;
}

/**
 * Splash wordmark: "ViaConnect" + tagline "BUILT FOR YOUR BIOLOGY".
 * No emojis; no em-dashes (standing rule).
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

async function generateIcon() {
  const size = 1024;
  const logoSize = Math.round(size * 0.60);         // 614px mark
  const offset = Math.round((size - logoSize) / 2); // centered

  const canvas = await sharp({
    create: { width: size, height: size, channels: 4, background: BRAND.navy },
  }).png().toBuffer();

  const logo = await sharp(Buffer.from(logoMarkSVG()))
    .resize(logoSize, logoSize)
    .png()
    .toBuffer();

  await sharp(canvas)
    .composite([{ input: logo, top: offset, left: offset }])
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

  // DNA mark: upper portion of the 1200x1200 safe zone
  const markSize = 600;
  const markLeft = Math.round((size - markSize) / 2);
  const markTop  = Math.round(size / 2 - markSize - 60);

  const mark = await sharp(Buffer.from(logoMarkSVG()))
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
  console.log('Next steps:');
  console.log('  1. Visual QA checklist (Prompt #117 §4.7)');
  console.log('  2. npx capacitor-assets generate --assetPath assets');
  console.log('  3. node scripts/generate-pwa-icons.mjs (fallback if step 2 skips public/icons/)');
}

main().catch((err) => {
  console.error('asset generation failed:', err);
  process.exit(1);
});
