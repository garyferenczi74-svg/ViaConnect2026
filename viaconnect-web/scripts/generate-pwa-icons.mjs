// Prompt #117 §5.4: PWA icon fallback generator.
//
// Runs only if @capacitor/assets skips populating public/icons/ (some
// versions emit native only). Re-derives the three PWA icons the
// manifest references from assets/icon.png.
//
// Prerequisites: assets/icon.png must exist (from
// scripts/generate-app-store-assets.mjs). Sharp must be installed.
//
// Run:
//   node scripts/generate-pwa-icons.mjs
//
// Outputs:
//   public/icons/icon-192.png          Android Chrome home-screen
//   public/icons/icon-512.png          Android Chrome splash source
//   public/icons/icon-512-maskable.png Adaptive launcher crop survival
//
// Maskable rationale (Prompt #117 §5.2): Android launchers crop to
// whatever shape the OEM specified. The maskable variant insets the
// existing icon to 80% of the canvas so every shape crop preserves
// the mark. The source icon already reserves a 80.1% safe zone, so
// the inset is mechanical.

import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const BRAND_NAVY = '#1A2744';
const REPO_ROOT = resolve(process.cwd());

async function makePWAIcon(size, { maskable = false } = {}) {
  const src = resolve(REPO_ROOT, 'assets/icon.png');
  const out = resolve(REPO_ROOT, `public/icons/icon-${size}${maskable ? '-maskable' : ''}.png`);

  if (maskable) {
    // Inset content to 80% so adaptive launcher crops preserve the mark.
    const innerSize = Math.round(size * 0.80);
    const offset = Math.round((size - innerSize) / 2);

    const canvas = await sharp({
      create: { width: size, height: size, channels: 4, background: BRAND_NAVY },
    }).png().toBuffer();

    const inner = await sharp(src).resize(innerSize, innerSize).toBuffer();

    await sharp(canvas)
      .composite([{ input: inner, top: offset, left: offset }])
      .flatten({ background: BRAND_NAVY })
      .png({ compressionLevel: 9 })
      .toFile(out);
  } else {
    // Standard PWA: direct downscale from the 1024 source.
    await sharp(src)
      .resize(size, size)
      .flatten({ background: BRAND_NAVY })
      .png({ compressionLevel: 9 })
      .toFile(out);
  }

  console.log(`  ${out.replace(REPO_ROOT + '\\', '').replace(REPO_ROOT + '/', '')}`);
}

async function main() {
  await mkdir(resolve(REPO_ROOT, 'public/icons'), { recursive: true });
  await makePWAIcon(192);
  await makePWAIcon(512);
  await makePWAIcon(512, { maskable: true });
  console.log('');
  console.log('Verify in Chrome DevTools:  Application > Manifest (no warnings expected)');
}

main().catch((err) => {
  console.error('pwa icon generation failed:', err);
  process.exit(1);
});
