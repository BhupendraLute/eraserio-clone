import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      // Mirrors the "@/*" path alias in tsconfig.json
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // Unit tests live in the root tests/ folder and import the codebase
    // through the '@' alias. The DSL engine is pure TypeScript with zero
    // DOM dependencies, so the node environment is sufficient.
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      // Track exactly the pure-TS core areas that have suites: the DSL
      // engine, layout engine, whiteboard store, render helpers, and SVG export.
      provider: 'v8',
      include: [
        'src/lib/dsl/**/*.ts',
        'src/lib/layout/**/*.ts',
        'src/lib/store/**/*.ts',
        'src/lib/render/**/*.ts',
        'src/lib/export/**/*.ts',
      ],
      // Pure type-definition modules contain zero executable statements, so v8
      // reports a misleading 0% for them. They are not unit-testable.
      exclude: ['src/lib/layout/sequence-types.ts', 'src/lib/layout/types.ts'],
      reporter: ['text', 'html'], // terminal table + browsable coverage/ report
      reportsDirectory: 'coverage',
      // Fail the coverage run if the tracked areas regress below the baseline
      // (current: ~86% stmts / 66% branches / 90% funcs / 88% lines). Keep some
      // headroom so small refactors don't trip CI, but big drops fail it.
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 75,
        lines: 75,
      },
    },
  },
});
