import { describe, expect, it } from 'vitest';
import {
  assertSeedDatabase,
  databaseNameFromUrl,
} from '../../../prisma/seed-guard.mjs';

/**
 * Testes do guard de banco descartável do seed. Provam que APENAS o nome do
 * database controla a decisão (host/usuário/senha/query não tornam uma URL de
 * produção "segura"). Sem banco: exercita a função diretamente.
 */

// Credenciais fictícias; nenhum dado real.
function url(
  db: string,
  opts: { user?: string; pass?: string; host?: string; query?: string } = {},
): string {
  const user = opts.user ?? 'annalu';
  const pass = opts.pass ?? 'fixture';
  const host = opts.host ?? 'localhost:5432';
  const query = opts.query ? `?${opts.query}` : '';
  return `postgresql://${user}:${pass}@${host}/${db}${query}`;
}

describe('databaseNameFromUrl', () => {
  it('extrai apenas o database do pathname (ignora query)', () => {
    expect(databaseNameFromUrl(url('annalu_test'))).toBe('annalu_test');
    expect(databaseNameFromUrl(url('annalu_prod', { query: 'schema=public' }))).toBe(
      'annalu_prod',
    );
  });

  it('retorna vazio para URL inválida', () => {
    expect(databaseNameFromUrl('not-a-url')).toBe('');
  });
});

describe('assertSeedDatabase — deve permitir bancos de teste', () => {
  it('annalu_test', () => {
    expect(assertSeedDatabase(url('annalu_test'))).toBe('annalu_test');
  });

  it('database contendo integration', () => {
    expect(assertSeedDatabase(url('annalu_integration'))).toBe(
      'annalu_integration',
    );
  });

  it('case-insensitive (ANNALU_TEST)', () => {
    expect(assertSeedDatabase(url('ANNALU_TEST'))).toBe('ANNALU_TEST');
  });
});

describe('assertSeedDatabase — deve rejeitar entradas não-teste/ inválidas', () => {
  it('annalu', () => {
    expect(() => assertSeedDatabase(url('annalu'))).toThrow(/non-test/i);
  });

  it('annalu_prod', () => {
    expect(() => assertSeedDatabase(url('annalu_prod'))).toThrow(/non-test/i);
  });

  it('production', () => {
    expect(() => assertSeedDatabase(url('production'))).toThrow(/non-test/i);
  });

  it('database vazio', () => {
    expect(() =>
      assertSeedDatabase('postgresql://annalu:fixture@localhost:5432/'),
    ).toThrow(/no database name/i);
  });

  it('DATABASE_URL ausente', () => {
    expect(() => assertSeedDatabase('')).toThrow(/not set/i);
  });

  it('URL inválida', () => {
    expect(() => assertSeedDatabase('not-a-url')).toThrow(/not a valid URL/i);
  });

  it('protocolo não-PostgreSQL', () => {
    expect(() => assertSeedDatabase('mysql://u:p@localhost:3306/annalu_test')).toThrow(
      /protocol/i,
    );
  });
});

describe('assertSeedDatabase — só o nome do database decide (anti-falso-positivo)', () => {
  it('host test.example.com + db annalu_prod → rejeita', () => {
    expect(() =>
      assertSeedDatabase(url('annalu_prod', { host: 'test.example.com:5432' })),
    ).toThrow(/non-test/i);
  });

  it('usuário test_user + db annalu_prod → rejeita', () => {
    expect(() =>
      assertSeedDatabase(url('annalu_prod', { user: 'test_user' })),
    ).toThrow(/non-test/i);
  });

  it('password contendo test + db annalu_prod → rejeita', () => {
    expect(() =>
      assertSeedDatabase(url('annalu_prod', { pass: 'testpass' })),
    ).toThrow(/non-test/i);
  });

  it('query contendo test + db annalu_prod → rejeita', () => {
    expect(() =>
      assertSeedDatabase(url('annalu_prod', { query: 'options=test' })),
    ).toThrow(/non-test/i);
  });
});
