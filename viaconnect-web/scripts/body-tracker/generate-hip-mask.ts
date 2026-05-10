// Prompt #157r follow-up: generate hip.png alpha masks for the male
// and female SegmentalHeatMap silhouettes. The original
// generate-muscle-masks.ts pipeline extracts masks from labeled
// reference SVGs that are .gitignored and deleted post-generation,
// so hip cannot be added by re-running the original script (the
// references no longer exist). This script synthesizes the hip
// mask directly as a soft-edged ellipse painted at the iliac/hip
// region of the avatar, then writes it through the same
// sharp.blur(4).png() pipeline so the feather radius matches the
// existing 12 masks.
//
// Dimensions are inherited from each sex's waist.png (read at
// runtime via sharp.metadata()) so the new mask overlays the
// avatar at the same resolution as its torso-neighbour without
// stretching.
//
// Centroids match REGION_CENTROIDS_BY_SEX.hip in
// src/components/body-tracker/HoverSystem/constants.ts. Ellipse
// dimensions are slightly inside REGION_HIT_RECTS_BY_SEX.hip so
// the blurred edge feathers cleanly within the hit rect.
//
// Run from the viaconnect-web/ directory:
//   npx tsx scripts/body-tracker/generate-hip-mask.ts

import sharp from 'sharp';
import path from 'node:path';

interface HipParams {
  readonly cxPct: number;
  readonly cyPct: number;
  readonly widthPct: number;
  readonly heightPct: number;
}

const HIP_PARAMS: Record<'male' | 'female', HipParams> = {
  male:   { cxPct: 49.6, cyPct: 50.0, widthPct: 22, heightPct: 10 },
  female: { cxPct: 49.9, cyPct: 49.5, widthPct: 26, heightPct: 10 },
};

async function generateHipMask(sex: 'male' | 'female'): Promise<void> {
  const masksDir = path.resolve(process.cwd(), 'public', 'body-tracker', 'masks', sex);
  const waistPath = path.join(masksDir, 'waist.png');

  const waistMeta = await sharp(waistPath).metadata();
  const width = waistMeta.width;
  const height = waistMeta.height;
  if (!width || !height) {
    throw new Error(`[${sex}] could not read waist.png dimensions at ${waistPath}`);
  }
  console.log(`[${sex}] reference dimensions from waist.png: ${width}x${height}`);

  const { cxPct, cyPct, widthPct, heightPct } = HIP_PARAMS[sex];
  const cx = (cxPct / 100) * width;
  const cy = (cyPct / 100) * height;
  const rx = ((widthPct / 100) * width) / 2;
  const ry = ((heightPct / 100) * height) / 2;

  const buf = Buffer.alloc(width * height * 4);
  let pixelCount = 0;
  for (let y = 0; y < height; y++) {
    const ndy = (y - cy) / ry;
    const ndy2 = ndy * ndy;
    for (let x = 0; x < width; x++) {
      const ndx = (x - cx) / rx;
      if (ndx * ndx + ndy2 <= 1) {
        const i = (y * width + x) * 4;
        buf[i]     = 255;
        buf[i + 1] = 255;
        buf[i + 2] = 255;
        buf[i + 3] = 255;
        pixelCount++;
      }
    }
  }

  const outPath = path.join(masksDir, 'hip.png');
  await sharp(buf, { raw: { width, height, channels: 4 } })
    .blur(4)
    .png()
    .toFile(outPath);

  console.log(`[${sex}] wrote ${outPath} (${pixelCount} opaque pixels, ${width}x${height})`);
}

async function main(): Promise<void> {
  await generateHipMask('male');
  await generateHipMask('female');
  console.log('\nDone. Verify public/body-tracker/masks/{male,female}/hip.png visually before committing.');
  console.log('Each mask should show a soft-edged ellipse centered on the avatar\'s iliac region, opaque white on transparent.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
