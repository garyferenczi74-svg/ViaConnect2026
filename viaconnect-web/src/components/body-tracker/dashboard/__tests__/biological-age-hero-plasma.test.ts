// Empty Biological Age on My Biology mounts PlasmaGauge (circle + --), not
// the Brief 57 BOS UnknownWell dashes. Estimated years + YEARS is unchanged.
// Age stays a DRAFT contributor and does not become a second BOS hero.

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BiologicalAgeHeroTile } from '@/components/body-tracker/dashboard/BiologicalAgeHeroTile';
import { ConnectionsBosDial } from '@/components/body-tracker/connections/ConnectionsBosDial';
import { arcPath } from '@/components/gauges/PlasmaGauge';
import { CONNECTIONS_BOS_COMPOSITE } from '@/lib/body-tracker/wearable-tiles';
import {
  BIOLOGICAL_AGE_FRAMING_DRAFT,
  resolveBiologicalAge,
  type BiologicalAgeResult,
} from '@/lib/body-tracker/biological-age';

const root = process.cwd();
const TILE = 'src/components/body-tracker/dashboard/BiologicalAgeHeroTile.tsx';

function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const INSUFFICIENT = resolveBiologicalAge(45, {});
const ESTIMATED = resolveBiologicalAge(45, { metabolicAge: 35, restingHR: 55 });

function renderTile(result: BiologicalAgeResult | null, extras: {
  loading?: boolean;
  error?: string | null;
} = {}) {
  return renderToStaticMarkup(
    createElement(BiologicalAgeHeroTile, { result, ...extras }),
  );
}

describe('Biological Age hero empty plasma', () => {
  it('always mounts PlasmaGauge except error / loading-only', () => {
    const tile = src(TILE);
    expect(tile).toContain("from '@/components/gauges/PlasmaGauge'");
    expect(tile).toContain('metric="bioscore"');
    expect(tile).toContain('variant="hero"');
    expect(tile).toContain('size={180}');
    expect(tile).toContain('empty');
    expect(tile).toContain('display === null');
    expect(tile).toContain('caption="YEARS"');
    expect(tile).toContain('displayValue={display}');
    expect(tile).not.toContain('displayValue={0}');
    expect(tile).not.toContain('result?.displayAge ?? 0');
    expect(tile).not.toContain('UNKNOWN</span>');
    expect(tile).not.toContain('h-[180px] w-[180px]');
    expect(tile).toContain('Biological Age UNKNOWN');
    expect(tile).toContain('Draft');
    expect(tile).toContain('Developing');
    expect(tile).toContain('BIOLOGICAL_AGE_FRAMING_DRAFT.insufficientPrompt');
    expect(tile).toContain('BIOLOGICAL_AGE_FRAMING_DRAFT.disclaimer');
  });

  it('empty / insufficient markup is plasma track + bloom + --, never 0 YEARS', () => {
    for (const result of [null, INSUFFICIENT]) {
      const html = renderTile(result);
      expect(html).toContain('g-root');
      expect(html).toContain('pg-ring');
      expect(html).toContain('blur(16px)');
      expect(html).toContain('>--</div>');
      expect(html).toContain('Biological Age UNKNOWN');
      expect(html).toContain(BIOLOGICAL_AGE_FRAMING_DRAFT.insufficientPrompt);
      expect(html).toContain('Draft');
      expect(html).toContain('Developing');
      expect(html).toContain(BIOLOGICAL_AGE_FRAMING_DRAFT.disclaimer);
      expect(html).not.toContain('>UNKNOWN<');
      expect(html).not.toContain('>0 YEARS<');
      expect(html).not.toContain('>0</div>');
      expect(html).not.toContain('YEARS');
      expect(html).not.toContain(arcPath(100, 100, 78, 0, 0.0001));
      expect(html).not.toContain('g-bead-cw');
    }
    expect(INSUFFICIENT.state).toBe('insufficient');
    expect(INSUFFICIENT.displayAge).toBe(45);
  });

  it('estimated still shows years + YEARS with PlasmaGauge', () => {
    expect(ESTIMATED.state).toBe('estimated');
    expect(ESTIMATED.biologicalAge).toBeGreaterThan(0);
    const years = ESTIMATED.biologicalAge as number;
    const html = renderTile(ESTIMATED);
    expect(html).toContain('g-root');
    expect(html).toContain('pg-ring');
    expect(html).toContain(`>${years}</div>`);
    expect(html).toContain('YEARS');
    expect(html).toContain(`Biological Age ${years} years`);
    expect(html).toContain(`Biological age ${years} versus your ${ESTIMATED.chronologicalAge}`);
    expect(html).not.toContain('>--</div>');
    expect(html).not.toContain('>0</div>');
    expect(html).not.toContain('Developing');
  });

  it('error and loading-only do not mount the gauge', () => {
    const errorHtml = renderTile(null, { error: 'Could not load biological age' });
    expect(errorHtml).toContain('Could not load biological age');
    expect(errorHtml).not.toContain('g-root');
    expect(errorHtml).not.toContain('pg-ring');

    const loadingHtml = renderTile(null, { loading: true });
    expect(loadingHtml).toContain('Loading biological age...');
    expect(loadingHtml).not.toContain('g-root');
    expect(loadingHtml).not.toContain('pg-ring');
  });

  it('ConnectionsBosDial UNKNOWN still has no progress fill', () => {
    const html = renderToStaticMarkup(
      createElement(ConnectionsBosDial, { composite: CONNECTIONS_BOS_COMPOSITE }),
    );
    expect(html).toContain('--');
    expect(html).toContain('data-bos-composite="unknown"');
    expect(html).not.toContain('g-root');
    expect(html).not.toContain('pg-ring');
    expect(html).not.toContain('g-bead-cw');
    expect(html).not.toContain(arcPath(100, 100, 78, 0, 0.0001));
    expect(html).not.toContain('>UNKNOWN<');
    expect(html).not.toContain('>0<');
  });

  it('does not become a second BOS hero or feed BOS while DRAFT', () => {
    const tile = src(TILE);
    const hub = src('src/components/nutrition/hub/NutritionHub.tsx');
    const dial = src('src/components/body-tracker/connections/ConnectionsBosDial.tsx');
    expect(tile).not.toMatch(/Bio Optimization/);
    expect(tile).not.toContain('ConnectionsBosDial');
    expect(tile).not.toContain('blendHannahBos');
    expect(tile).toContain('metric="bioscore"');
    expect(hub).toContain('metric="plasmateal"');
    expect(dial).toContain('UnknownWell');
  });
});
