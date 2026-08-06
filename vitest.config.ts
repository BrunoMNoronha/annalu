import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    // Padrão em Node; testes de UI (*.dom.test.tsx) rodam em jsdom.
    environment: 'node',
    environmentMatchGlobs: [['**/*.dom.test.{ts,tsx}', 'jsdom']],
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
    },
  },
});
