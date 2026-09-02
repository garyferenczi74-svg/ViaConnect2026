// Tests for the FormaVision avatar error boundary (Prompt 210b, task P1-T4).
//
// Error boundaries only trip inside the client reconciler, which is not available
// in the node test runner, so these exercise the boundary's contract directly: the
// derived error state flips, componentDidCatch forwards to onRenderError, and the
// render output is the fallback when errored and the children otherwise. React's
// renderToStaticMarkup confirms the rendered branch.

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  AvatarErrorBoundary,
  AvatarErrorBoundaryFloor,
  FORMAVISION_BOUNDARY_FLOOR_TESTID,
} from '../AvatarErrorBoundary';

describe('AvatarErrorBoundary', () => {
  it('derives an error state from a thrown render error', () => {
    expect(AvatarErrorBoundary.getDerivedStateFromError()).toEqual({ hasError: true });
  });

  it('forwards a caught error to onRenderError', () => {
    const onRenderError = vi.fn();
    const boundary = new AvatarErrorBoundary({
      onRenderError,
      children: null,
    });
    const error = new Error('shader compile failed');
    boundary.componentDidCatch(error);
    expect(onRenderError).toHaveBeenCalledTimes(1);
    expect(onRenderError).toHaveBeenCalledWith(error);
  });

  it('renders the children when there is no error', () => {
    const markup = renderToStaticMarkup(
      // eslint-disable-next-line react/no-children-prop
      React.createElement(AvatarErrorBoundary, {
        onRenderError: () => {},
        children: React.createElement('span', null, 'avatar-here'),
      }),
    );
    expect(markup).toContain('avatar-here');
  });

  it('renders an in-boundary floor (never null) once errored', () => {
    const onRenderError = vi.fn();
    const boundary = new AvatarErrorBoundary({
      onRenderError,
      children: React.createElement('span', null, 'avatar-here'),
    });
    boundary.state = { hasError: true };
    const defaultFloor = boundary.render();
    expect(defaultFloor).not.toBeNull();
    const defaultMarkup = renderToStaticMarkup(
      React.createElement(React.Fragment, null, defaultFloor),
    );
    expect(defaultMarkup).toContain(FORMAVISION_BOUNDARY_FLOOR_TESTID);

    const withFallback = new AvatarErrorBoundary({
      onRenderError,
      children: null,
      fallback: React.createElement('span', null, 'fallback-floor'),
    });
    withFallback.state = { hasError: true };
    expect(withFallback.render()).not.toBeNull();
    expect(
      renderToStaticMarkup(
        React.createElement(React.Fragment, null, withFallback.render()),
      ),
    ).toContain('fallback-floor');
  });

  it('boundary floor is a definite navy box, not a transparent hole', () => {
    const markup = renderToStaticMarkup(React.createElement(AvatarErrorBoundaryFloor));
    expect(markup).toContain(FORMAVISION_BOUNDARY_FLOOR_TESTID);
    expect(markup).toContain('absolute inset-0');
    expect(markup).toContain('min-h-[200px]');
    expect(markup).toContain('#1A2744');
  });
});
