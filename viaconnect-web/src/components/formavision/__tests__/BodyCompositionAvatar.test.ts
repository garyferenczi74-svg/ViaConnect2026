// Tests for the BodyCompositionAvatar capability-gate wrapper (Prompt 210b, P2-T2c).
//
// The node test runner has no client reconciler and no document, so a static render
// stops before the WebGL-fallback microtask flips the wrapper to its 2D floor. What
// the static render DOES prove is the structural invariant P2-T2c relies on: the
// rendered branch (the 3D sizing container) is identical regardless of activeTab, so
// swapping the section's activeTab on the persistent instance changes no structure
// and therefore cannot drive a remount or replay the materialize intro. The actual
// fallback-to-2D-floor behavior is covered by AvatarErrorBoundary + FormaVision3DAvatar
// (hasWebGL gate); the across-section persistence is structural in composition/page.tsx
// (one avatar node at a stable position, outside any section-gated unmounting block).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BodyCompositionAvatar } from '../BodyCompositionAvatar';

const webRoot = process.cwd();

function readSrc(rel: string): string {
  return readFileSync(join(webRoot, rel), 'utf8');
}

function renderWrapper(activeTab: 'bodyFat' | 'muscleMass' | 'measurements'): string {
  return renderToStaticMarkup(
    // eslint-disable-next-line react/no-children-prop
    React.createElement(BodyCompositionAvatar, {
      sex: 'female',
      scan: null,
      circumferences: null,
      unit: 'cm',
      activeTab,
      children: React.createElement('div', null, 'two-d-floor'),
    }),
  );
}

describe('BodyCompositionAvatar', () => {
  it('renders the 3D sizing container (not the 2D children) before any fallback fires', () => {
    const markup = renderWrapper('bodyFat');
    // The 3D footprint box is present; the 2D floor only shows on the WebGL fallback.
    expect(markup).toContain('aspect-[720/1152]');
    expect(markup).toContain('formavision-avatar-footprint');
    expect(markup).not.toContain('two-d-floor');
  });

  it('keeps the 3D footprint capped at 600px on every breakpoint (no lg plate blow-up)', () => {
    const markup = renderWrapper('bodyFat');
    expect(markup).toContain('max-w-[600px]');
    expect(markup).toContain('mx-auto');
    expect(markup).not.toContain('lg:max-w-none');
    expect(markup).not.toContain('lg:h-full');
    expect(markup).not.toContain('lg:w-auto');
  });

  it('renders an identical branch for every activeTab so a tab swap drives no remount', () => {
    const fat = renderWrapper('bodyFat');
    const muscle = renderWrapper('muscleMass');
    const measurements = renderWrapper('measurements');
    expect(muscle).toEqual(fat);
    expect(measurements).toEqual(fat);
  });

  it('FormaVision plate hosts the capped footprint; Muscle 2D heatmap keeps column-fill', () => {
    const avatar = readSrc('src/components/formavision/BodyCompositionAvatar.tsx');
    const footprintClass = avatar.match(
      /data-testid="formavision-avatar-footprint"[\s\S]*?className="([^"]+)"/,
    )?.[1];
    expect(footprintClass).toBeDefined();
    expect(footprintClass).toContain('max-w-[600px]');
    expect(footprintClass).toContain('mx-auto');
    expect(footprintClass).toContain('aspect-[720/1152]');
    expect(footprintClass).not.toContain('lg:max-w-none');
    expect(footprintClass).not.toContain('lg:h-full');
    expect(footprintClass).not.toContain('lg:w-auto');

    const formavision = readSrc(
      'src/app/(app)/(consumer)/body-tracker/formavision/page.tsx',
    );
    expect(formavision).toMatch(/formavision-canvas-grid/);
    expect(formavision).toMatch(/BodyCompositionAvatar/);
    expect(formavision).toMatch(/flex min-h-\[480px\] justify-center/);

    // Muscle / Body Fat / Measurements stay on the 2D heatmap with their
    // existing lg column-fill. Do not steal that class off this wrapper.
    const heatmap = readSrc('src/components/body-tracker/SegmentalHeatMap.tsx');
    expect(heatmap).toMatch(/lg:h-full lg:w-auto lg:max-w-none/);
  });
});
