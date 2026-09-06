// Ambient JSX for Google <model-viewer> 4.3.0 (CDN, no npm package).
// Only the attributes this spike sets.

import type { CSSProperties, DOMAttributes } from 'react';

interface ModelViewerJSX
  extends DOMAttributes<HTMLElement> {
  src?: string;
  alt?: string;
  poster?: string;
  'ios-src'?: string;
  'camera-controls'?: boolean | '';
  'disable-pan'?: boolean | '';
  'touch-action'?: string;
  'camera-orbit'?: string;
  'camera-target'?: string;
  'field-of-view'?: string;
  'min-field-of-view'?: string;
  'max-field-of-view'?: string;
  'interaction-prompt'?: string;
  'shadow-intensity'?: string | number;
  exposure?: string | number;
  'environment-image'?: string;
  'tone-mapping'?: string;
  'auto-rotate'?: boolean | '';
  'auto-rotate-delay'?: string | number;
  'rotation-per-second'?: string;
  reveal?: string;
  loading?: 'auto' | 'lazy' | 'eager';
  'data-testid'?: string;
  class?: string;
  className?: string;
  style?: CSSProperties;
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': ModelViewerJSX;
    }
  }
}

export {};
