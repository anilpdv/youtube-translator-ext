import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['utils/**/*.ts', 'components/**/*.tsx', 'entrypoints/**/*.tsx'],
      exclude: ['entrypoints/background.ts'],
    },
    include: [
      'tests/unit/**/*.test.ts',
      'tests/component/**/*.test.tsx',
      'tests/app/**/*.test.ts',
      'tests/runtime/**/*.test.ts',
      'tests/youtube/**/*.test.ts',
      'tests/captions/**/*.test.ts',
      'tests/translation/**/*.test.ts',
      'tests/rendering/**/*.test.ts',
      'tests/popup/**/*.test.ts',
      'tests/cache/**/*.test.ts',
      'tests/export/**/*.test.ts',
      'tests/integration/**/*.test.ts',
      'tests/security/**/*.test.ts',
      'tests/contracts/**/*.test.ts',
      'tests/race/**/*.test.ts',
      'tests/observability/**/*.test.ts',
      'tests/release/**/*.test.ts',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
