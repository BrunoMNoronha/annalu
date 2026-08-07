import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Invariante de arquitetura: a camada de aplicação/domínio da rodada depende
 * SOMENTE de ports — nunca do `PrismaClient`. A direção de dependências é
 * `application/domain -> ports`; `infrastructure -> application/domain`.
 */
const moduleDir = fileURLToPath(new URL('.', import.meta.url));

function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collectSourceFiles(full));
    } else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) {
      files.push(full);
    }
  }
  return files;
}

// Detecta importação/requerimento REAL do cliente Prisma (não menções em
// comentários de documentação).
const PRISMA_IMPORT =
  /(?:from\s+|require\(\s*|import\s*\(\s*)['"]@prisma\/client['"]/;

describe('camada de aplicação/domínio da rodada', () => {
  it('não importa Prisma diretamente', () => {
    const files = collectSourceFiles(moduleDir);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      expect(
        PRISMA_IMPORT.test(source),
        `${file} não deve importar @prisma/client`,
      ).toBe(false);
    }
  });
});
