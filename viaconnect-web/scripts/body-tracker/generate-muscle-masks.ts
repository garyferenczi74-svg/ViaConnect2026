// Prompt #157 + #157a Phase A: extract per-muscle alpha mask PNGs from
// the four reference images Gary deposits at scripts/body-tracker/
// 157_references/. Each generated PNG shows exactly one muscle as
// opaque white on a transparent background, sized identically to its
// source reference so the mask overlays the avatar pixel-perfectly
// when stretched via mask-size: 100% 100%.
//
// Inputs (Gary deposits these per #157a §1; URLs are
// https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Body%20Tracker/...):
//   scripts/body-tracker/157_references/Male_Avatar_Heat_Map_Sample.svg
//   scripts/body-tracker/157_references/Female_Heat_map_sample.svg
//
// References are SVG; sharp rasterizes them on read via .raw().toBuffer().
//
// Outputs:
//   public/body-tracker/masks/male/{neck,shoulders,chest,...}.png   (12 files)
//   public/body-tracker/masks/female/{neck,shoulders,chest,...}.png (12 files)
//
// The 157_references/ folder is .gitignored and is deleted after the
// masks are committed (#157a §1). Only the 24 generated PNGs ship to
// the repo.
//
// Run from the viaconnect-web/ directory:
//   npx tsx scripts/body-tracker/generate-muscle-masks.ts
//
// Notes on color thresholds and centroid maps:
//   - The COLOR_THRESHOLDS below are first-pass RGB ranges for the
//     red, yellow, green colored regions in the references. Adjust
//     bounds if a reference image's hue falls outside the ranges.
//   - The MALE_REGION_MAP and FEMALE_REGION_MAP centroid percentages
//     are first-pass estimates from the prompt brief; tune them by
//     visual inspection of the references if a muscle does not get
//     matched on the first pass.

import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs/promises';

type ColorBucket = 'red' | 'yellow' | 'green';

type SegmentId =
  | 'neck' | 'shoulders' | 'chest' | 'waist'
  | 'l_bicep' | 'r_bicep' | 'l_forearm' | 'r_forearm'
  | 'l_quad' | 'r_quad' | 'l_calf' | 'r_calf';

interface RegionEntry {
  color: ColorBucket;
  centroidXPct: number;
  centroidYPct: number;
  segment: SegmentId;
}

// Region centroid map. Each entry says: "in this reference image, the
// {color} region whose centroid sits at (centroidXPct, centroidYPct)
// of the image area is the {segment}". For the shoulders segment two
// entries (left + right deltoids) are unioned into a single
// shoulders.png mask per #157a §2.2. Centroids below are MEASURED
// against the actual reference SVGs via a one-pass diagnostic, not
// estimated; the matching is therefore zero-distance for legit
// components and noise components stay unmatched.
const MALE_REGION_MAP: RegionEntry[] = [
  { color: 'red',    centroidXPct: 49.3, centroidYPct: 20.9, segment: 'neck'      },
  { color: 'yellow', centroidXPct: 34.8, centroidYPct: 24.4, segment: 'shoulders' },
  { color: 'yellow', centroidXPct: 64.0, centroidYPct: 24.1, segment: 'shoulders' },
  { color: 'red',    centroidXPct: 49.4, centroidYPct: 27.8, segment: 'chest'     },
  { color: 'yellow', centroidXPct: 32.1, centroidYPct: 33.0, segment: 'l_bicep'   },
  { color: 'yellow', centroidXPct: 66.7, centroidYPct: 32.6, segment: 'r_bicep'   },
  { color: 'red',    centroidXPct: 49.6, centroidYPct: 41.3, segment: 'waist'     },
  { color: 'green',  centroidXPct: 26.7, centroidYPct: 42.2, segment: 'l_forearm' },
  { color: 'green',  centroidXPct: 72.2, centroidYPct: 42.1, segment: 'r_forearm' },
  { color: 'green',  centroidXPct: 41.2, centroidYPct: 60.0, segment: 'l_quad'    },
  { color: 'green',  centroidXPct: 58.9, centroidYPct: 60.1, segment: 'r_quad'    },
  { color: 'green',  centroidXPct: 39.1, centroidYPct: 77.9, segment: 'l_calf'    },
  { color: 'green',  centroidXPct: 61.1, centroidYPct: 78.0, segment: 'r_calf'    },
];

// Female reference inverts the bicep / forearm color assignments
// versus the male reference (biceps green, forearms yellow). Female
// l_quad is split into two connected components by an avatar muscle
// definition line; both halves are claimed via dual entries below
// so the mask unions them into a single l_quad.png.
const FEMALE_REGION_MAP: RegionEntry[] = [
  { color: 'red',    centroidXPct: 49.6, centroidYPct: 21.4, segment: 'neck'      },
  { color: 'yellow', centroidXPct: 38.7, centroidYPct: 25.4, segment: 'shoulders' },
  { color: 'yellow', centroidXPct: 60.8, centroidYPct: 25.4, segment: 'shoulders' },
  { color: 'red',    centroidXPct: 49.9, centroidYPct: 27.4, segment: 'chest'     },
  { color: 'green',  centroidXPct: 35.9, centroidYPct: 33.5, segment: 'l_bicep'   },
  { color: 'green',  centroidXPct: 64.0, centroidYPct: 33.6, segment: 'r_bicep'   },
  { color: 'red',    centroidXPct: 49.9, centroidYPct: 40.8, segment: 'waist'     },
  { color: 'yellow', centroidXPct: 31.1, centroidYPct: 42.7, segment: 'l_forearm' },
  { color: 'yellow', centroidXPct: 69.1, centroidYPct: 43.0, segment: 'r_forearm' },
  { color: 'green',  centroidXPct: 40.6, centroidYPct: 57.8, segment: 'l_quad'    },
  { color: 'green',  centroidXPct: 42.3, centroidYPct: 59.4, segment: 'l_quad'    },
  { color: 'green',  centroidXPct: 59.3, centroidYPct: 58.1, segment: 'r_quad'    },
  { color: 'green',  centroidXPct: 40.0, centroidYPct: 76.1, segment: 'l_calf'    },
  { color: 'green',  centroidXPct: 60.8, centroidYPct: 76.2, segment: 'r_calf'    },
];

// Per-sex color thresholds. The female reference uses green on the
// limb muscles where the male reference uses yellow; the female green
// also has softer anti-aliased edges that fall outside the tight male
// green range, producing thin slivers instead of full muscle masks.
// #157c widens the female green range (rMax 130->180, gMin 180->140,
// bMax 130->180) so the classifier captures the full anti-aliased
// muscle silhouette. Male thresholds are unchanged so male masks
// remain byte-identical to the #157 commit.
const COLOR_THRESHOLDS: Record<'male' | 'female', Record<ColorBucket, { rMin: number; rMax: number; gMin: number; gMax: number; bMin: number; bMax: number }>> = {
  male: {
    red:    { rMin: 180, rMax: 255, gMin:   0, gMax:  90, bMin:   0, bMax:  90 },
    yellow: { rMin: 200, rMax: 255, gMin: 180, gMax: 255, bMin:   0, bMax: 110 },
    green:  { rMin:   0, rMax: 130, gMin: 180, gMax: 255, bMin:   0, bMax: 130 },
  },
  female: {
    red:    { rMin: 180, rMax: 255, gMin:   0, gMax:  90, bMin:   0, bMax:  90 },
    yellow: { rMin: 200, rMax: 255, gMin: 180, gMax: 255, bMin:   0, bMax: 110 },
    green:  { rMin:   0, rMax: 180, gMin: 140, gMax: 255, bMin:   0, bMax: 180 },
  },
};

const COLOR_CODE: Record<ColorBucket, number> = { red: 1, yellow: 2, green: 3 };

// Female reference contains many sub-1000-pixel noise components from
// the avatar's muscle definition lines (which the threshold filters
// run on too). 500 keeps every legit muscle (smallest legit female
// component is l_quad lower half at ~1389 px) and cuts the noise.
const NOISE_THRESHOLD_PIXELS = 500;

interface ConnectedComponent {
  color: number;
  pixels: number[];
  centroidX: number;
  centroidY: number;
  bbox: { x: number; y: number; w: number; h: number };
}

function classifyPixels(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
  sex: 'male' | 'female',
): Uint8Array {
  const cls = new Uint8Array(width * height);
  const t = COLOR_THRESHOLDS[sex];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (r >= t.red.rMin    && r <= t.red.rMax    && g >= t.red.gMin    && g <= t.red.gMax    && b >= t.red.bMin    && b <= t.red.bMax)    { cls[y * width + x] = 1; continue; }
      if (r >= t.yellow.rMin && r <= t.yellow.rMax && g >= t.yellow.gMin && g <= t.yellow.gMax && b >= t.yellow.bMin && b <= t.yellow.bMax) { cls[y * width + x] = 2; continue; }
      if (r >= t.green.rMin  && r <= t.green.rMax  && g >= t.green.gMin  && g <= t.green.gMax  && b >= t.green.bMin  && b <= t.green.bMax)  { cls[y * width + x] = 3; continue; }
    }
  }
  return cls;
}

// Standard 4-connectivity flood-fill connected components labeling.
// Uses an iterative DFS stack so it does not blow the call stack on
// large blobs (chest + waist regions can each span 100k+ pixels at
// full reference resolution).
function labelConnectedComponents(
  classification: Uint8Array,
  width: number,
  height: number,
): ConnectedComponent[] {
  const components: ConnectedComponent[] = [];
  const visited = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (visited[idx] || classification[idx] === 0) continue;

      const color = classification[idx];
      const pixels: number[] = [];
      const stack: number[] = [idx];
      visited[idx] = 1;
      let minX = x, minY = y, maxX = x, maxY = y;
      let sumX = 0, sumY = 0;

      while (stack.length > 0) {
        const p = stack.pop() as number;
        const px = p % width;
        const py = (p / width) | 0;
        pixels.push(p);
        sumX += px;
        sumY += py;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;

        if (py > 0) {
          const n = p - width;
          if (!visited[n] && classification[n] === color) { visited[n] = 1; stack.push(n); }
        }
        if (py < height - 1) {
          const n = p + width;
          if (!visited[n] && classification[n] === color) { visited[n] = 1; stack.push(n); }
        }
        if (px > 0) {
          const n = p - 1;
          if (!visited[n] && classification[n] === color) { visited[n] = 1; stack.push(n); }
        }
        if (px < width - 1) {
          const n = p + 1;
          if (!visited[n] && classification[n] === color) { visited[n] = 1; stack.push(n); }
        }
      }

      if (pixels.length < NOISE_THRESHOLD_PIXELS) continue;

      components.push({
        color,
        pixels,
        centroidX: sumX / pixels.length,
        centroidY: sumY / pixels.length,
        bbox: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
      });
    }
  }

  return components;
}

function findMatchingComponent(
  components: ConnectedComponent[],
  region: RegionEntry,
  width: number,
  height: number,
  alreadyClaimed: Set<ConnectedComponent>,
): ConnectedComponent | null {
  const targetX = (region.centroidXPct / 100) * width;
  const targetY = (region.centroidYPct / 100) * height;
  const colorCode = COLOR_CODE[region.color];

  let best: ConnectedComponent | null = null;
  let bestDist = Infinity;
  for (const c of components) {
    if (c.color !== colorCode) continue;
    if (alreadyClaimed.has(c)) continue;
    const dx = c.centroidX - targetX;
    const dy = c.centroidY - targetY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < bestDist) { bestDist = dist; best = c; }
  }
  return best;
}

async function writeMaskPng(
  pixels: number[],
  width: number,
  height: number,
  outPath: string,
): Promise<void> {
  const buf = Buffer.alloc(width * height * 4);
  for (const p of pixels) {
    const o = p * 4;
    buf[o]     = 255;
    buf[o + 1] = 255;
    buf[o + 2] = 255;
    buf[o + 3] = 255;
  }
  await sharp(buf, { raw: { width, height, channels: 4 } }).png().toFile(outPath);
}

async function generateMasksForSex(
  sex: 'male' | 'female',
  referencePath: string,
  regionMap: RegionEntry[],
  outputDir: string,
): Promise<void> {
  console.log(`\n[${sex}] generating masks from ${path.basename(referencePath)}`);

  try {
    await fs.access(referencePath);
  } catch {
    console.error(`[${sex}] reference not found at ${referencePath}`);
    console.error(`[${sex}] deposit the file per #157a §1, then rerun.`);
    return;
  }

  await fs.mkdir(outputDir, { recursive: true });

  const reference = sharp(referencePath).ensureAlpha();
  const { data, info } = await reference.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  console.log(`[${sex}] reference dimensions: ${width}x${height}`);

  const classification = classifyPixels(data, width, height, channels, sex);
  const components = labelConnectedComponents(classification, width, height);
  console.log(`[${sex}] detected ${components.length} colored components above ${NOISE_THRESHOLD_PIXELS}-pixel noise floor`);

  const bySegment = new Map<SegmentId, RegionEntry[]>();
  for (const r of regionMap) {
    const list = bySegment.get(r.segment) ?? [];
    list.push(r);
    bySegment.set(r.segment, list);
  }

  const claimed = new Set<ConnectedComponent>();
  for (const [segment, entries] of bySegment) {
    const matchedPixels: number[] = [];
    let matchedCount = 0;

    for (const entry of entries) {
      const m = findMatchingComponent(components, entry, width, height, claimed);
      if (!m) {
        console.warn(`[${sex}] no component matched ${segment} (looking for ${entry.color} near ${entry.centroidXPct}%, ${entry.centroidYPct}%)`);
        continue;
      }
      claimed.add(m);
      matchedCount++;
      matchedPixels.push(...m.pixels);
    }

    if (matchedPixels.length === 0) {
      console.warn(`[${sex}] segment ${segment} has zero matched pixels — skipping`);
      continue;
    }

    const outPath = path.join(outputDir, `${segment}.png`);
    await writeMaskPng(matchedPixels, width, height, outPath);
    console.log(`[${sex}] wrote ${segment}.png (${matchedPixels.length} pixels, ${matchedCount} component(s))`);
  }
}

async function main(): Promise<void> {
  const cwd = process.cwd();
  const refDir = path.resolve(cwd, 'scripts', 'body-tracker', '157_references');
  const outRoot = path.resolve(cwd, 'public', 'body-tracker', 'masks');

  await generateMasksForSex(
    'male',
    path.join(refDir, 'Male_Avatar_Heat_Map_Sample.svg'),
    MALE_REGION_MAP,
    path.join(outRoot, 'male'),
  );
  await generateMasksForSex(
    'female',
    path.join(refDir, 'Female_Heat_map_sample.svg'),
    FEMALE_REGION_MAP,
    path.join(outRoot, 'female'),
  );

  console.log('\nDone. Inspect public/body-tracker/masks/{male,female}/*.png visually before committing.');
  console.log('Each mask should show ONE muscle silhouette as opaque white on transparent.');
  console.log('If a mask is empty, partial, or merged with a neighbor, tune the centroid percentages or color thresholds at the top of this script and rerun.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
