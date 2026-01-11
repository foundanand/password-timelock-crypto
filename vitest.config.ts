import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 120_000, // 2 minutes for time-lock tests
    hookTimeout: 30_000,
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/encryption/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
    },
    reporters: ['default', 'json'],
    outputFile: {
      json: './test-results/results.json',
    },
  },
});
