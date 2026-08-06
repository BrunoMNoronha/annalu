#!/usr/bin/env node
// @ts-check
/**
 * Verificador reutilizável de links Markdown relativos.
 *
 * Percorre todos os arquivos .md do repositório (ignorando node_modules, .next,
 * .git e coverage) e confirma que cada link relativo aponta para um arquivo
 * existente. Links externos (http/https/mailto) e âncoras (#) são ignorados.
 *
 * Uso: `node scripts/check-links.mjs` (ou `pnpm docs:check-links`).
 * Encerra com código 1 se houver ao menos um link quebrado.
 */
import { existsSync, readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const IGNORED_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  'coverage',
  'dist',
  'build',
  'out',
]);

/** @param {string} dir @returns {Promise<string[]>} */
async function collectMarkdown(dir) {
  /** @type {string[]} */
  const found = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      found.push(...(await collectMarkdown(path.join(dir, entry.name))));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      found.push(path.join(dir, entry.name));
    }
  }
  return found;
}

const LINK_RE = /\[[^\]]*\]\(([^)]+)\)/g;

async function main() {
  const files = await collectMarkdown(repoRoot);
  let checked = 0;
  /** @type {{file: string, target: string}[]} */
  const broken = [];

  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    const baseDir = path.dirname(file);
    for (const match of content.matchAll(LINK_RE)) {
      const raw = match[1].trim();
      if (/^(https?:|mailto:|#)/i.test(raw)) continue;
      const targetPath = raw.split('#')[0];
      if (!targetPath) continue;
      checked += 1;
      const resolved = path.resolve(baseDir, targetPath);
      if (!existsSync(resolved)) {
        broken.push({ file: path.relative(repoRoot, file), target: raw });
      }
    }
  }

  console.log(
    `Arquivos .md: ${files.length} | Links relativos verificados: ${checked} | Quebrados: ${broken.length}`,
  );
  if (broken.length > 0) {
    console.error('\nLinks relativos quebrados:');
    for (const b of broken) {
      console.error(`  - ${b.file} -> ${b.target}`);
    }
    process.exit(1);
  }
  console.log('OK: nenhum link relativo quebrado.');
}

main().catch((error) => {
  console.error('Falha ao verificar links:', error);
  process.exit(1);
});
