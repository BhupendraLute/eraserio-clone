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
  },
});
