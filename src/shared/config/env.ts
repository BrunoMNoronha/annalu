import { z } from 'zod';

/**
 * Validação tipada das variáveis de ambiente.
 *
 * Princípios:
 * - As variáveis são OPCIONAIS na fase de fundação técnica, para não quebrar o
 *   build/CI sem segredos. Quando presentes, seu FORMATO é validado.
 * - Segredos nunca têm valor padrão embutido no código.
 * - Nenhum valor é registrado em log (ver `src/shared/logger`).
 */
export const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .url({ message: 'DATABASE_URL deve ser uma URL de conexão válida.' })
    .optional(),
  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().min(1).optional(),
  S3_BUCKET: z.string().min(1).optional(),
  S3_ACCESS_KEY_ID: z.string().min(1).optional(),
  S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Analisa e valida uma fonte de variáveis de ambiente.
 *
 * @param source Fonte das variáveis (padrão: `process.env`). Recebida como
 *   parâmetro para permitir testes determinísticos sem depender do ambiente.
 * @returns Um resultado seguro (`safeParse`) para o chamador decidir o
 *   tratamento sem lançar exceções inesperadas em tempo de build.
 */
export function parseEnv(
  source: Record<string, string | undefined> = process.env,
): z.SafeParseReturnType<unknown, Env> {
  return envSchema.safeParse(source);
}

/**
 * Carrega o ambiente validado ou lança um erro claro (sem expor valores).
 * Deve ser chamado sob demanda pelos consumidores que realmente precisam das
 * variáveis, nunca no topo de módulos carregados durante o build.
 */
export function loadEnv(
  source: Record<string, string | undefined> = process.env,
): Env {
  const result = parseEnv(source);
  if (!result.success) {
    const campos = result.error.issues
      .map((issue) => issue.path.join('.'))
      .join(', ');
    throw new Error(
      `Variáveis de ambiente inválidas: ${campos}. ` +
        'Consulte .env.example. (Nenhum valor é exibido por segurança.)',
    );
  }
  return result.data;
}
