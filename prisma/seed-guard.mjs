// @ts-check
/**
 * Guard de banco descartável para o seed (política em AGENTS.md).
 *
 * Decide EXCLUSIVAMENTE pelo nome do database (pathname da URL PostgreSQL),
 * nunca por host/usuário/senha/query string. Executa ANTES de qualquer conexão
 * ou operação Prisma. Falha fechada (lança) em qualquer entrada ambígua. As
 * mensagens de erro NÃO expõem credenciais nem a URL completa.
 */

/** Marcações que identificam um database de teste (case-insensitive). */
const TEST_DATABASE_PATTERN = /(?:_test|test|integration)/i;

/**
 * Extrai apenas o nome do database do pathname de uma URL PostgreSQL.
 * Ignora host/usuário/senha/query. Retorna string vazia se a URL for inválida
 * ou não tiver database no caminho.
 *
 * @param {string} rawUrl
 * @returns {string}
 */
export function databaseNameFromUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return '';
  }
  // pathname = "/<database>"; nunca usa host/usuário/senha/query.
  return parsed.pathname.replace(/^\//, '').split('/')[0] ?? '';
}

/**
 * Garante que `rawUrl` aponta para um database claramente de teste/descartável.
 * Lança (falha fechada) quando: a URL está ausente; é inválida; o protocolo não
 * é PostgreSQL; o nome do database está vazio; ou o nome não identifica teste.
 * Em sucesso, retorna o nome do database.
 *
 * @param {string | undefined} [rawUrl]
 * @returns {string}
 */
export function assertSeedDatabase(rawUrl = process.env.DATABASE_URL) {
  if (!rawUrl) {
    throw new Error('Refusing to seed: DATABASE_URL is not set.');
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Refusing to seed: DATABASE_URL is not a valid URL.');
  }

  const protocol = parsed.protocol.replace(/:$/, '').toLowerCase();
  if (protocol !== 'postgres' && protocol !== 'postgresql') {
    throw new Error(
      `Refusing to seed: unsupported protocol "${protocol}" (expected postgres/postgresql).`,
    );
  }

  const name = parsed.pathname.replace(/^\//, '').split('/')[0] ?? '';
  if (!name) {
    throw new Error(
      'Refusing to seed: DATABASE_URL has no database name in its path.',
    );
  }

  if (!TEST_DATABASE_PATTERN.test(name)) {
    throw new Error(
      'Refusing to seed non-test database: database name must identify a ' +
        'test/integration database.',
    );
  }

  return name;
}
