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
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BodyCompositionAvatar } from '../BodyCompositionAvatar';

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
    expect(markup).not.toContain('two-d-floor');
  });

  it('renders an identical branch for every activeTab so a tab swap drives no remount', () => {
    const fat = renderWrapper('bodyFat');
    const muscle = renderWrapper('muscleMass');
    const measurements = renderWrapper('measurements');
    expect(muscle).toEqual(fat);
    expect(measurements).toEqual(fat);
  });
});
