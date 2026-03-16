'use client';

import { createContext, useContext } from 'react';

export type NaturopathTheme = 'dark' | 'light';

export const NaturopathThemeContext = createContext<{
  theme: NaturopathTheme;
  toggleTheme: () => void;
}>({ theme: 'dark', toggleTheme: () => {} });

export function useNaturopathTheme() {
  return useContext(NaturopathThemeContext);
}
