/**
 * src/components/journey/coaching/journeyPathBuilder.ts
 *
 * Pure SVG path builder for the Journey hero graph (Prompt 208k Task T3).
 * Exported for unit testing.
 *
 * Rules: no em-dashes, no en-dashes, no emojis, no React, no I/O.
 */

/**
 * Builds an SVG path string from a series of optional score values (0 to 100).
 *
 * A null entry is an HONEST GAP: the line BREAKS there and a new M command is
 * emitted at the next non-null value. Gaps are never connected, never filled
 * with 0, and never carried forward.
 *
 * A run of a single non-null point (surrounded by nulls or at the start/end)
 * emits only an M command with no L. The end-dot overlay in the chart renders
 * that isolated point as a circle.
 *
 * @param values  Series aligned index-for-index to x-axis buckets. null = no data.
 * @param xOf     Maps bucket index i to SVG x coordinate.
 * @param yOf     Maps a score value (0 to 100) to SVG y coordinate.
 * @returns SVG path d-attribute string. Empty string when values is empty or all null.
 */
export function buildLinePath(
  values: (number | null)[],
  xOf: (i: number) => number,
  yOf: (v: number) => number,
): string {
  let path = '';
  let inSegment = false;

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v === null) {
      inSegment = false;
      continue;
    }
    const px = xOf(i).toFixed(1);
    const py = yOf(v).toFixed(1);
    if (!inSegment) {
      // Start a new sub-path. Separate from the previous sub-path by a space.
      path += (path.length > 0 ? ' ' : '') + 'M ' + px + ' ' + py;
      inSegment = true;
    } else {
      path += ' L ' + px + ' ' + py;
    }
  }

  return path;
}
