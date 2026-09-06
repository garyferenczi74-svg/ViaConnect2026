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
  'touch-action'?: string;
  'camera-orbit'?: string;
  'field-of-view'?: string;
  'interaction-prompt'?: string;
  'shadow-intensity'?: string | number;
  exposure?: string | number;
  reveal?: string;
  loading?: 'auto' | 'lazy' | 'eager';
  ar?: boolean | '';
  'ar-modes'?: string;
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
