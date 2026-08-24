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
  // Top-level oxc.jsx automatic runtime is required so JSX components (.tsx) can be
  // imported and transformed in the node test runner. Vitest's oxc transform reads it
  // from the top level. It is a no-op for pure-.ts test files (they contain no JSX).
  oxc: {
    jsx: { runtime: 'automatic' },
  },
  test: {
    environment: 'node',
    include: [
      'tests/**/*.test.ts',
      'src/**/__tests__/**/*.test.ts',
      // .tsx tests are included by exact name intentionally. A broad *.test.tsx
      // glob would also pick up four agent-panel render tests (AgentStatusBadge /
      // AgentActivityFeed / MichelangeloPanel / ArnoldPanel) which require
      // @testing-library/dom, but that dependency is not installed (package.json is
      // locked). All tests below use react-dom/server renderToStaticMarkup so they
      // need no DOM. Add further .tsx files here by exact name as more node-safe
      // render tests are written.
      'src/**/__tests__/JourneyAccelerators.bare.test.tsx',
      // Task 12 (Prompt 210c): per-measurement confidence chip + gated accuracy claim
      'src/components/body-tracker/scanning/__tests__/ScanAccuracyClaim.bare.test.tsx',
      'src/components/body-tracker/scanning/__tests__/ConfidenceChip.bare.test.tsx',
      // Prompt 211a W4-2: cadence UI surfaces (streak / fingerprint flag / tip / opt-in).
      'src/components/formavision/__tests__/CadenceSurfaces.bare.test.tsx',
      // Prompt 211a W1: clip creator surface (consent gate + one-source + no photo)
      'src/components/formavision/__tests__/ClipCreatorSurface.bare.test.tsx',
      // Prompt 211a W1: consumer-only Helix first-share moment (celebrate-only)
      'src/components/formavision/__tests__/ClipShareMoment.bare.test.tsx',
      'src/components/pricing/__tests__/PricingCatalogBody.bare.test.tsx',
      // Brief 16: Your Variants honesty chips
      'src/components/genetics/__tests__/VariantRowChip.bare.test.tsx',
      // Picasso 21b: /plugins vendor-mark tiles
      'src/components/plugins/__tests__/PluginAppCard.bare.test.tsx',
    ],
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
