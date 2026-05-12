// Vitest config for the BOS scoring helper + source modules under
// src/lib/scoring. Runs in parallel to the primary vitest.config.ts
// (which targets tests/**), letting #161 Phase B colocate test files
// next to their implementations without disturbing the existing test
// suite path convention.
//
// Run a single file:  npx vitest run --config vitest.config.scoring.ts src/lib/scoring/__tests__/cooldown.test.ts
// Run the whole set:  npx vitest run --config vitest.config.scoring.ts

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
    include: [
      'src/lib/scoring/__tests__/**/*.test.ts',
      'src/app/api/bos/__tests__/**/*.test.ts',
    ],
    exclude: ['node_modules', '.next', 'supabase'],
    globals: false,
  },
});
