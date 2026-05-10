// Prompt #157k: responsive pin-cap + hover-capability hook. Returns
// the FIFO pin queue cap (3 desktop / 1 mobile) and a flag indicating
// whether hover-peek interactions are appropriate (true when the
// device has a fine pointer with hover capability, false on touch).
// Both values update live on viewport / device-capability change.

'use client';

import { useEffect, useState } from 'react';

import { PIN_CAP_DESKTOP, PIN_CAP_MOBILE } from './constants';

interface ResponsiveCapState {
  readonly pinCap: number;
  readonly hoverEnabled: boolean;
  readonly isDesktop: boolean;
}

const DESKTOP_QUERY = '(min-width: 1024px)';
const HOVER_QUERY = '(hover: hover) and (pointer: fine)';

function compute(): ResponsiveCapState {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return { pinCap: PIN_CAP_DESKTOP, hoverEnabled: true, isDesktop: true };
  }
  const isDesktop = window.matchMedia(DESKTOP_QUERY).matches;
  const hoverEnabled = window.matchMedia(HOVER_QUERY).matches;
  return {
    pinCap: isDesktop ? PIN_CAP_DESKTOP : PIN_CAP_MOBILE,
    hoverEnabled,
    isDesktop,
  };
}

export function useResponsivePinCap(): ResponsiveCapState {
  const [state, setState] = useState<ResponsiveCapState>(() => compute());

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const desktopMq = window.matchMedia(DESKTOP_QUERY);
    const hoverMq = window.matchMedia(HOVER_QUERY);
    const sync = () => setState(compute());
    sync();
    desktopMq.addEventListener('change', sync);
    hoverMq.addEventListener('change', sync);
    return () => {
      desktopMq.removeEventListener('change', sync);
      hoverMq.removeEventListener('change', sync);
    };
  }, []);

  return state;
}
