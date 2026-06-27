// Tests for RenderTierProvider (Prompt 210b, P7-T1).
//
// The node runner has no client reconciler, so renderToStaticMarkup proves the
// INITIAL contract: the provider exposes a tier, a consumer reads it via
// useRenderTier, the capable default is 'cinematic' (no low-power signals in node),
// and a consumer outside any provider degrades to 'cinematic'. The runtime
// step-down (setTier on a reported budget-miss) is the pure stepTierDown ladder,
// covered exhaustively in tierLadder.test.ts; what is verified live (the Canvas
// monitor driving a real state transition to lite then to the 2D floor) is named in
// the task report.

import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RenderTierProvider, useRenderTier } from '../RenderTierProvider';

function TierProbe() {
  const tier = useRenderTier();
  return React.createElement('span', { 'data-tier': tier }, tier);
}

describe('RenderTierProvider', () => {
  it('exposes the active tier to a consumer via useRenderTier', () => {
    const markup = renderToStaticMarkup(
      // eslint-disable-next-line react/no-children-prop
      React.createElement(RenderTierProvider, {
        initialTier: 'lite',
        children: React.createElement(TierProbe),
      }),
    );
    expect(markup).toContain('data-tier="lite"');
  });

  it('defaults the capable path to cinematic (no step-down -> avatar unchanged)', () => {
    // No initialTier: the SSR probe yields cinematic because node has no low-power
    // signals (no deviceMemory, no coarse pointer, no software renderer).
    const markup = renderToStaticMarkup(
      // eslint-disable-next-line react/no-children-prop
      React.createElement(RenderTierProvider, {
        children: React.createElement(TierProbe),
      }),
    );
    expect(markup).toContain('data-tier="cinematic"');
  });

  it('lets a consumer read an explicit 2d tier (the runtime floor handoff value)', () => {
    const markup = renderToStaticMarkup(
      // eslint-disable-next-line react/no-children-prop
      React.createElement(RenderTierProvider, {
        initialTier: '2d',
        children: React.createElement(TierProbe),
      }),
    );
    expect(markup).toContain('data-tier="2d"');
  });

  it('useRenderTier falls back to cinematic with no provider (resilient default)', () => {
    const markup = renderToStaticMarkup(React.createElement(TierProbe));
    expect(markup).toContain('data-tier="cinematic"');
  });
});
