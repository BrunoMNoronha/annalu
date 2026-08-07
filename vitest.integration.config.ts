import { defineConfig } from 'vitest/config';

/**
 * Configuração dos testes de INTEGRAÇÃO (PostgreSQL real).
 *
 * Separada da suíte unitária (`vitest.config.ts`): esta inclui apenas
 * `tests/integration/**` e NÃO é executada por `pnpm test:run`. Requer
 * `TEST_DATABASE_URL` (ou `DATABASE_URL`) apontando para um banco descartável.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    // Sem paralelismo entre arquivos: evita corrida no mesmo banco.
    fileParallelism: false,
    sequence: { concurrent: false },
    hookTimeout: 60_000,
    testTimeout: 60_000,
  },
});
