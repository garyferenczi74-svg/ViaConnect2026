'use client';

import { createContext, useContext } from 'react';

export type PractitionerTheme = 'dark' | 'light';

export const PractitionerThemeContext = createContext<{
  theme: PractitionerTheme;
  toggleTheme: () => void;
}>({ theme: 'dark', toggleTheme: () => {} });

export function usePractitionerTheme() {
  return useContext(PractitionerThemeContext);
}
