'use client';

// React error boundary for the FormaVision 3D subtree (Prompt 210b, task P1-T4).
//
// A WebGL context loss, a shader compile failure, or any throw inside the Canvas
// must never take down the surrounding composition surface. This boundary catches
// the error, reports it through onRenderError so the parent can remount or latch
// the 2D floor, logs it structured under 'formavision.avatar', and paints a
// temporary in-boundary floor so the plate is never a silent empty box.

import { Component, type ReactNode } from 'react';
import { safeLog } from '@/lib/utils/safe-log';
import { FORMA_VISION_HEX } from '@/lib/formavision/materials/formaVisionTokens';

const LOG_SCOPE = 'formavision.avatar';

export const FORMAVISION_BOUNDARY_FLOOR_TESTID = 'formavision-boundary-floor';

export function AvatarErrorBoundaryFloor(): ReactNode {
  return (
    <div
      data-testid={FORMAVISION_BOUNDARY_FLOOR_TESTID}
      className="absolute inset-0 min-h-[200px] w-full"
      style={{ backgroundColor: FORMA_VISION_HEX.navy }}
      role="status"
    />
  );
}

interface AvatarErrorBoundaryProps {
  children: ReactNode;
  // Called once when a render error is first caught, so the parent can drop to 2D.
  onRenderError: (error: unknown) => void;
  // What to show in place of the crashed subtree. Defaults to a navy fill so
  // the plate never goes transparent while the parent remounts or latches.
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
      return this.props.fallback ?? <AvatarErrorBoundaryFloor />;
    }
    return this.props.children;
  }
}
