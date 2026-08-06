import { describe, expect, it } from 'vitest';
import { loadEnv, parseEnv } from '@/shared/config/env';

describe('validação de variáveis de ambiente', () => {
  it('aceita um ambiente vazio e aplica LOG_LEVEL padrão', () => {
    const result = parseEnv({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.LOG_LEVEL).toBe('info');
    }
  });

  it('aceita valores válidos', () => {
    const env = loadEnv({
      DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
      LOG_LEVEL: 'debug',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    });
    expect(env.LOG_LEVEL).toBe('debug');
    expect(env.DATABASE_URL).toContain('postgresql://');
  });

  it('rejeita DATABASE_URL malformada', () => {
    const result = parseEnv({ DATABASE_URL: 'nao-e-url' });
    expect(result.success).toBe(false);
  });

  it('rejeita LOG_LEVEL fora do conjunto permitido', () => {
    const result = parseEnv({ LOG_LEVEL: 'verbose' });
    expect(result.success).toBe(false);
  });

  it('loadEnv lança erro claro sem expor valores sensíveis', () => {
    expect(() =>
      loadEnv({ DATABASE_URL: 'invalida', LOG_LEVEL: 'info' }),
    ).toThrowError(/Variáveis de ambiente inválidas/);
    expect(() => loadEnv({ DATABASE_URL: 'invalida' })).not.toThrowError(
      /invalida/,
    );
  });
});
