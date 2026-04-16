// Vitest config for ViaConnect 2026.
//
// Runs the unit suite under tests/. Uses the same `@/` path alias the
// Next.js compiler uses so imports like `@/lib/agents/jeffery/guardrails`
// resolve in tests exactly as they do in the app.
//
// Run:    npx vitest run
// Watch:  npx vitest
// Cov:    npx vitest run --coverage

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
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', '.next', 'supabase'],
    globals: true,
    coverage: {
      provider: 'v8',
      include: [
        'src/lib/agents/jeffery/**/*.ts',
        'src/lib/arnold/**/*.ts',
        'src/lib/body-tracker/**/*.ts',
      ],
      exclude: [
        '**/types.ts',
        '**/*.d.ts',
      ],
    },
  },
});
