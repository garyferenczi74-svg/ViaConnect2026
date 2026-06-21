// Vitest config for React component unit tests.
// Covers src/components/**/__tests__/**/*.test.tsx (and .ts).
// Uses the node environment (jsdom is not yet installed; DOM render
// tests are pending until jsdom + @testing-library/dom are added).
//
// Run single file:
//   npx vitest run --config vitest.config.components.ts src/components/hannah/__tests__/BeginnerQA.test.tsx
// Run all component tests:
//   npx vitest run --config vitest.config.components.ts

import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/components/**/__tests__/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'supabase'],
    globals: true,
    // Use a test-specific tsconfig that sets jsx:react-jsx instead of preserve
    typecheck: {
      tsconfig: path.resolve(__dirname, 'tsconfig.test.json'),
    },
  },
});
