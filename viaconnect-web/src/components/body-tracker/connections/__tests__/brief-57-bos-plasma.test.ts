import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ConnectionsBosDial } from '@/components/body-tracker/connections/ConnectionsBosDial';
import { arcPath, GAP, SWEEP } from '@/components/gauges/PlasmaGauge';
import {
  CONNECTIONS_BOS_COMPOSITE,
  connectionsBosNumericScore,
} from '@/lib/body-tracker/wearable-tiles';

const root = process.cwd();

function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

function sha256(rel: string): string {
  return createHash('sha256').update(readFileSync(join(root, rel))).digest('hex');
}

const DIAL = 'src/components/body-tracker/connections/ConnectionsBosDial.tsx';
const PLASMA = 'src/components/gauges/PlasmaGauge.tsx';

const FROZEN_AT_2B53743: Record<string, string> = {
  'src/lib/scoring/hannah-bos.ts':
    'eee05f2c4c1509830d31b710098f3c79f987123a124757868a330e89fc27663e',
  'src/lib/scoring/__tests__/hannah-bos.test.ts':
    '9e79577ab1ee6b855449d74244b1ea80b69825d331a9de88dd7ab14ebe3adc1f',
  'src/lib/dashboard/morning-card/contributors.ts':
    '303abe1f6188cab87ff58c74fe9d3e37ffe5e8add672d30cbbdefac4bf9a948c',
  'src/lib/dashboard/morning-card/protocol-cta.ts':
    '0f3b2c44888f69fd9c00d5c3d059cfbecb20a7e3e11ca4a69935a65ca2e3bd55',
  'src/components/dashboard/morning-card/MorningChipGrid.tsx':
    'c8f95690a7b2678e38ea1cdf8a63f099a5b0a2bdf659504dc29d472c05d0bcc0',
  'src/components/dashboard/morning-card/MorningProtocolCta.tsx':
    'eb8ac47491ef91f7327afbdad301a607ef00f91b96a5ac3e4bd6bcb797675203',
  'src/hooks/useHannahBosDisplay.ts':
    '802b5b18faf7b7b3e3e1a2e882ac8862448e34224ab80b130cd22209dcac4001',
  // Age empty plasma (same as #114) remounts PlasmaGauge; hash refreshed here.
  'src/components/body-tracker/dashboard/BiologicalAgeHeroTile.tsx':
    'ab17af9e3da591a06a857ccc297350222659db9e9c11c1e2ce82d01aba998d3e',
  'src/components/gauges/PlasmaGauge.tsx':
    'a387fecfc7ac0de41bf06bba085b89ef4e92bcb54afe530a4a9b997e1dd4314a',
  'src/components/dashboard/DailyScoresPanel.tsx':
    '1f113590a451df109b69008881a2e692e4fea0097e4a904dce70b0bb6df5dcc7',
  'package.json':
    '063e568f5cfd91d78c94ad76f1d3c59a048f59bd5eea540af8c3e037a9bdec7d',
};

const SCORED = { value: '69', band: 'BOS' } as const;

describe('Brief 57 hero BOS uses Daily Scores PlasmaGauge', () => {
  it('scored hero mounts PlasmaGauge bioscore with gap, bloom, and /100', () => {
    const dial = src(DIAL);
    const plasma = src(PLASMA);

    expect(dial).toContain("from '@/components/gauges/PlasmaGauge'");
    expect(dial).toContain('metric="bioscore"');
    expect(dial).toContain('variant="hero"');
    expect(dial).toContain('size={HERO_MOBILE_SIZE}');
    expect(dial).toContain('size={HERO_DESKTOP_SIZE}');
    expect(dial).toContain('const HERO_MOBILE_SIZE = 200');
    expect(dial).toContain('const HERO_DESKTOP_SIZE = 240');
    expect(dial).toContain('connectionsBosNumericScore');
    expect(dial).toContain('empty');
    expect(dial).not.toContain('UnknownWell');
    expect(dial).not.toContain('value={0}');
    expect(dial).not.toMatch(/\{composite\.band\}/);

    expect(plasma).toContain('export const GAP = 135, SWEEP = 270');
    expect(plasma).toContain(
      "bioscore:  { c: '#2DA5A0', bright: '#5FD3CE', deep: '#1B7E79', glow: 'rgba(45,165,160,.55)' }",
    );
    expect(GAP).toBe(135);
    expect(SWEEP).toBe(270);

    expect(connectionsBosNumericScore(SCORED)).toBe(69);
    const html = renderToStaticMarkup(
      createElement(ConnectionsBosDial, { composite: SCORED }),
    );
    expect(html).toContain('g-root');
    expect(html).toContain('pg-ring');
    expect(html).toContain('blur(16px)');
    expect(html).toContain('/ 100');
    expect(html).toContain('>69<');
    expect(html).toContain(arcPath(100, 100, 78, 0, 0.69));
    expect(html).toContain('Bio Optimization Score 69');
    expect(html).not.toContain('>BOS<');
    expect(html).not.toContain('>UNKNOWN<');
    expect(html).not.toContain('#B75E18');
    expect(html).not.toContain('#4ADE80');
  });

  it('UNKNOWN is plasma track + bloom + --, never a 0 fill or 0 of 100', () => {
    const html = renderToStaticMarkup(
      createElement(ConnectionsBosDial, { composite: CONNECTIONS_BOS_COMPOSITE }),
    );
    expect(html).toContain('--');
    expect(html).toContain('data-bos-composite="unknown"');
    expect(html).toContain('No score yet');
    expect(html).toContain('g-root');
    expect(html).toContain('pg-ring');
    expect(html).toContain('blur(16px)');
    expect(html).not.toContain('g-bead-cw');
    expect(html).not.toContain(arcPath(100, 100, 78, 0, 0.0001));
    expect(html).not.toContain('>0<');
    expect(html).not.toContain('/ 100');
    expect(html).not.toContain('0 of 100');
    expect(html).not.toContain('>BOS<');
    expect(html).not.toContain('>UNKNOWN<');
    expect(connectionsBosNumericScore(CONNECTIONS_BOS_COMPOSITE)).toBeNull();
  });

  it('cluster stays small and still uses bioscore, not a second palette', () => {
    const dial = src(DIAL);
    expect(dial).toContain('const CLUSTER_SIZE = 80');
    expect(dial).toContain('variant="standard"');
    expect(dial).toContain('size={CLUSTER_SIZE}');

    const scored = renderToStaticMarkup(
      createElement(ConnectionsBosDial, { composite: SCORED, size: 'cluster' }),
    );
    expect(scored).toContain('g-root');
    expect(scored).toContain(arcPath(100, 100, 78, 0, 0.69));
    expect(scored).not.toContain('>BOS<');

    const unknown = renderToStaticMarkup(
      createElement(ConnectionsBosDial, {
        composite: CONNECTIONS_BOS_COMPOSITE,
        size: 'cluster',
      }),
    );
    expect(unknown).toContain('--');
    expect(unknown).toContain('g-root');
    expect(unknown).toContain('pg-ring');
    expect(unknown).not.toContain('g-bead-cw');
    expect(unknown).not.toContain(arcPath(100, 100, 78, 0, 0.0001));
    expect(unknown).not.toContain('>0<');
    expect(unknown).not.toContain('/ 100');
    expect(unknown).not.toContain('0 of 100');
  });

  it('does not edit blend math, chips, protocol, age tile, or Daily OVERALL', () => {
    for (const [rel, expected] of Object.entries(FROZEN_AT_2B53743)) {
      expect(sha256(rel), rel).toBe(expected);
    }
    const daily = src('src/components/dashboard/DailyScoresPanel.tsx');
    expect(daily).not.toContain('Overall Wellness');
    expect(daily).not.toContain('metric="wellness"');
    const dial = src(DIAL);
    expect(dial).not.toMatch(/Vitality Score/);
    expect(dial).not.toMatch(/Semaglutide/i);
    expect(dial).not.toMatch(/\bas any\b/);
  });
});
