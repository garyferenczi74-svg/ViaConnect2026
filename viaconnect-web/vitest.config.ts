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
        'src/lib/international/**/*.ts',
        'src/lib/notifications/**/*.ts',
        'src/lib/compliance/**/*.ts',
        'src/lib/marketing/variants/**/*.ts',
        'src/lib/soc2/collectors/marketing-copy-activity.ts',
        'src/components/body-tracker/body-graphic/**/*.{ts,tsx}',
        'src/lib/feature-flags.ts',
      ],
      exclude: [
        '**/types.ts',
        '**/*.d.ts',
      ],
    },
  },
});
