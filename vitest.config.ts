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
    include: ['tests/unit/**/*.test.ts', 'tests/component/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
