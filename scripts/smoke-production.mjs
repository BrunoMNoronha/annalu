#!/usr/bin/env node
// @ts-check
/**
 * Smoke test de PRODUÇÃO: valida que a otimização de imagem do Next.js
 * (`next/image` → rota interna `/_next/image`) funciona com a versão de `sharp`
 * efetivamente resolvida (que está fora da faixa declarada pelo Next 15.5.22 —
 * ver docs/08-seguranca-e-privacidade.md).
 *
 * Fluxo:
 *   1. usa uma imagem sintética fictícia (public/smoke-fixture.png);
 *   2. exige que `next build` já tenha sido executado (.next presente);
 *   3. sobe `next start` em uma porta livre (ou a definida em SMOKE_PORT);
 *   4. aguarda GET /api/health responder 200;
 *   5. solicita /_next/image apontando para a imagem sintética;
 *   6. exige HTTP 200 e Content-Type de imagem;
 *   7. encerra o processo em qualquer desfecho (sucesso, falha ou timeout);
 *   8. cross-platform (Windows/Linux), sem shell Unix, sem rede externa.
 *
 * Uso: `node scripts/smoke-production.mjs` (ou `pnpm smoke:production`).
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

const HOST = '127.0.0.1';
const OVERALL_TIMEOUT_MS = 120_000;
const READINESS_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 500;
const REQUEST_TIMEOUT_MS = 15_000;

/** @param {string} msg */
function log(msg) {
  console.log(`[smoke:production] ${msg}`);
}

/** Descobre uma porta TCP livre (ou usa SMOKE_PORT, se definida). */
function resolvePort() {
  const fromEnv = process.env.SMOKE_PORT;
  if (fromEnv && /^\d+$/.test(fromEnv)) {
    return Promise.resolve(Number(fromEnv));
  }
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, HOST, () => {
      const addr = srv.address();
      if (addr && typeof addr === 'object') {
        const { port } = addr;
        srv.close(() => resolve(port));
      } else {
        srv.close(() =>
          reject(new Error('Não foi possível obter porta livre.')),
        );
      }
    });
  });
}

/** @param {number} ms */
function sleep(ms) {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    t.unref();
  });
}

/**
 * @param {string} url
 * @param {Record<string, string>} [headers]
 */
async function fetchWithTimeout(url, headers = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  timer.unref();
  try {
    return await fetch(url, { headers, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** @param {string} base */
async function waitForHealth(base) {
  const deadline = Date.now() + READINESS_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const res = await fetchWithTimeout(`${base}/api/health`);
      if (res.status === 200) {
        log('endpoint /api/health respondeu 200.');
        return;
      }
    } catch {
      // servidor ainda subindo; continua tentando
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error('Timeout aguardando /api/health.');
}

async function main() {
  if (!existsSync(path.join(repoRoot, '.next'))) {
    throw new Error(
      'Diretório .next ausente. Execute `pnpm build` antes do smoke test.',
    );
  }
  if (!existsSync(path.join(repoRoot, 'public', 'smoke-fixture.png'))) {
    throw new Error('Fixture public/smoke-fixture.png ausente.');
  }

  const port = await resolvePort();
  const base = `http://${HOST}:${port}`;
  const nextBin = require.resolve('next/dist/bin/next');

  log(`iniciando "next start" na porta ${port}...`);
  const child = spawn(
    process.execPath,
    [nextBin, 'start', '-p', String(port)],
    {
      cwd: repoRoot,
      env: { ...process.env, HOSTNAME: HOST },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  let serverLog = '';
  child.stdout?.on('data', (d) => {
    serverLog += d.toString();
  });
  child.stderr?.on('data', (d) => {
    serverLog += d.toString();
  });

  /** @type {NodeJS.Timeout} */
  let hardTimer;
  const cleanup = () => {
    if (hardTimer) clearTimeout(hardTimer);
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  };
  process.on('exit', cleanup);
  process.on('SIGINT', () => {
    cleanup();
    process.exit(1);
  });

  const hardTimeout = new Promise((_resolve, reject) => {
    hardTimer = setTimeout(() => {
      reject(new Error('Timeout global do smoke test.'));
    }, OVERALL_TIMEOUT_MS);
    hardTimer.unref();
  });

  const exited = new Promise((_resolve, reject) => {
    child.on('exit', (code) => {
      reject(
        new Error(`"next start" encerrou prematuramente (código ${code}).`),
      );
    });
  });

  const run = (async () => {
    await waitForHealth(base);

    const imageUrl =
      `${base}/_next/image?url=${encodeURIComponent('/smoke-fixture.png')}` +
      `&w=64&q=75`;
    log('solicitando rota de otimização de imagem...');
    const res = await fetchWithTimeout(imageUrl, {
      Accept: 'image/avif,image/webp,image/png,*/*',
    });

    if (res.status !== 200) {
      throw new Error(`Otimização de imagem retornou HTTP ${res.status}.`);
    }
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) {
      throw new Error(`Content-Type inesperado: "${contentType}".`);
    }
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length === 0) {
      throw new Error('Corpo da imagem otimizada está vazio.');
    }
    log(`OK: HTTP 200, Content-Type "${contentType}", ${bytes.length} bytes.`);
  })();

  try {
    await Promise.race([run, hardTimeout, exited]);
    log('SUCESSO: otimização de imagem funcional com o sharp resolvido.');
    return 0;
  } catch (error) {
    // Diagnóstico: últimas linhas do servidor (não contém variáveis de ambiente).
    if (serverLog.trim()) {
      const tail = serverLog.split('\n').slice(-15).join('\n');
      log(`últimas linhas do servidor:\n${tail}`);
    }
    throw error;
  } finally {
    cleanup();
    // dá um instante para o processo encerrar
    await sleep(200);
  }
}

main()
  .then((code) => process.exit(code ?? 0))
  .catch((error) => {
    console.error(`[smoke:production] FALHOU: ${error.message}`);
    process.exit(1);
  });
