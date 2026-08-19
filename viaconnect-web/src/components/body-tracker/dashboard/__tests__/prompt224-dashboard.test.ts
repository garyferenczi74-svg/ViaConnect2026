import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '..');
const PAGE = path.resolve(
  __dirname,
  '../../../../app/(app)/(consumer)/body-tracker/dashboard/page.tsx',
);

describe('prompt 224 dashboard redesign', () => {
  it('dashboard page no longer mounts Health Report or BodyScoreGauge', () => {
    const src = fs.readFileSync(PAGE, 'utf8');
    expect(src).not.toMatch(/HealthReportCard/);
    expect(src).not.toMatch(/BodyScoreGauge/);
    expect(src).not.toMatch(/Score Contributors/);
    expect(src).toMatch(/DashboardBento/);
  });

  it('Biological Age hero never labels Bio Optimization', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'BiologicalAgeHeroTile.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/Bio Optimization/);
    expect(src).toMatch(/Biological Age/);
    expect(src).toMatch(/PlasmaGauge/);
  });

  it('does not edit hub config from dashboard module', () => {
    const files = fs.readdirSync(ROOT).filter((f) => f.endsWith('.tsx'));
    for (const f of files) {
      const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
      expect(src).not.toMatch(/hubConfig/);
    }
  });

  it('bottom four tiles sit in an equal 2x2 subgrid', () => {
    const bento = fs.readFileSync(path.join(ROOT, 'DashboardBento.tsx'), 'utf8');
    const strip = fs.readFileSync(path.join(ROOT, 'ConnectionsStrip.tsx'), 'utf8');
    const quick = fs.readFileSync(path.join(ROOT, 'QuickLogCompactTile.tsx'), 'utf8');

    expect(strip).not.toMatch(/lg:col-span-12/);
    expect(bento).toMatch(/sm:grid-cols-2/);
    expect(bento).toMatch(/sm:grid-rows-2/);
    expect(bento).toMatch(/sm:auto-rows-fr/);
    expect(bento).toMatch(/min-h-\[160px\]/);
    expect(quick).toMatch(/h-full min-h-\[160px\]/);
    expect(bento).toMatch(/<ConnectionsStrip/);
  });
});
