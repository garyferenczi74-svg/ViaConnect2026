'use client';

import { Component, type ReactNode } from 'react';

interface MeshyGlbBoundaryProps {
  children: ReactNode;
  onError: (error: unknown) => void;
}

interface MeshyGlbBoundaryState {
  hasError: boolean;
}

/** Isolates a Meshy GLB load/render failure so the parametric mesh stays. */
export class MeshyGlbBoundary extends Component<MeshyGlbBoundaryProps, MeshyGlbBoundaryState> {
  constructor(props: MeshyGlbBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): MeshyGlbBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    this.props.onError(error);
  }

  render(): ReactNode {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
