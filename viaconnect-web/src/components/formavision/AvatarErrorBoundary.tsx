'use client';

// React error boundary for the FormaVision 3D subtree (Prompt 210b, task P1-T4).
//
// A WebGL context loss, a shader compile failure, or any throw inside the Canvas
// must never take down the surrounding composition surface. This boundary catches
// the error, reports it through onRenderError so the parent can swap to the 2D
// floor, logs it structured under 'formavision.avatar', and renders the supplied
// fallback (null by default, since the parent owns the replacement).

import { Component, type ReactNode } from 'react';
import { safeLog } from '@/lib/utils/safe-log';

const LOG_SCOPE = 'formavision.avatar';

interface AvatarErrorBoundaryProps {
  children: ReactNode;
  // Called once when a render error is first caught, so the parent can drop to 2D.
  onRenderError: (error: unknown) => void;
  // What to show in place of the crashed subtree. Defaults to null so the parent's
  // own fallback is the only visible surface.
  fallback?: ReactNode;
}

interface AvatarErrorBoundaryState {
  hasError: boolean;
}

export class AvatarErrorBoundary extends Component<
  AvatarErrorBoundaryProps,
  AvatarErrorBoundaryState
> {
  constructor(props: AvatarErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): AvatarErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    safeLog.error(LOG_SCOPE, 'FormaVision avatar render error, falling back to 2D', {
      error,
    });
    this.props.onRenderError(error);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
