#!/usr/bin/env node
// @ts-check
/**
 * Seed FICTÍCIO e IDEMPOTENTE do MVP.
 *
 * - Somente dados fictícios; domínios reservados `example.test`.
 * - Sem dados pessoais reais, sem fotografia, sem rodada/avaliação/pontuação
 *   como se fossem reais.
 * - Idempotente: usa UUIDs determinísticos + `upsert`; rodar duas vezes não
 *   duplica registros.
 * - `accessCodeHash` é uma FIXTURE não autenticável (não é hash de código real).
 *
 * Uso: `node prisma/seed.mjs` (ou `pnpm prisma:seed`). Requer DATABASE_URL
 * apontando para um banco DESCARTÁVEL.
 */
import { PrismaClient } from '@prisma/client';
import { assertSeedDatabase } from './seed-guard.mjs';

// Guard (AGENTS.md): recusa bancos que não sejam claramente de teste ANTES de
// qualquer conexão/operação Prisma. Decide apenas pelo nome do database.
assertSeedDatabase();

const prisma = new PrismaClient();

// UUIDs fixos (fixtures). Não representam identidades reais.
const ID = {
  admin: '00000000-0000-4000-8000-000000000001',
  adminIdentity: '00000000-0000-4000-8000-000000000002',
  guardian: '00000000-0000-4000-8000-000000000003',
  guardianIdentity: '00000000-0000-4000-8000-000000000004',
  player: '00000000-0000-4000-8000-000000000005',
  consent: '00000000-0000-4000-8000-000000000006',
  word: '00000000-0000-4000-8000-000000000007',
  riddleA: '00000000-0000-4000-8000-000000000008',
  riddleB: '00000000-0000-4000-8000-000000000009',
  answerA1: '00000000-0000-4000-8000-00000000000a',
  answerA2: '00000000-0000-4000-8000-00000000000b',
  config: '00000000-0000-4000-8000-00000000000c',
};

// FIXTURE explícita: NÃO é um hash de código de acesso real e não autentica.
const FIXTURE_ACCESS_CODE_HASH =
  'FIXTURE_NOT_A_REAL_HASH__do_not_authenticate__seed_only';

async function main() {
  // Administrador + identidade adulta (e-mail fictício).
  const admin = await prisma.adminUser.upsert({
    where: { id: ID.admin },
    update: {},
    create: { id: ID.admin, role: 'ADMIN', status: 'ACTIVE' },
  });

  await prisma.authIdentity.upsert({
    where: {
      provider_externalIdentifier: {
        provider: 'EMAIL',
        externalIdentifier: 'admin@example.test',
      },
    },
    update: {},
    create: {
      id: ID.adminIdentity,
      provider: 'EMAIL',
      externalIdentifier: 'admin@example.test',
      adminUserId: admin.id,
    },
  });

  // Responsável fictício + segunda identidade adulta (e-mail fictício).
  const guardian = await prisma.guardian.upsert({
    where: { id: ID.guardian },
    update: {},
    create: {
      id: ID.guardian,
      contactEmail: 'guardian@example.test',
      status: 'ACTIVE',
    },
  });

  const guardianIdentity = await prisma.authIdentity.upsert({
    where: {
      provider_externalIdentifier: {
        provider: 'EMAIL',
        externalIdentifier: 'guardian@example.test',
      },
    },
    update: {},
    create: {
      id: ID.guardianIdentity,
      provider: 'EMAIL',
      externalIdentifier: 'guardian@example.test',
      guardianId: guardian.id,
    },
  });

  // Criança fictícia (sem e-mail/idade/nascimento/nome/documento/endereço).
  const player = await prisma.player.upsert({
    where: { id: ID.player },
    update: {},
    create: {
      id: ID.player,
      nickname: 'Explorador Fixture',
      publicTag: 'FIX-0001',
      accessCodeHash: FIXTURE_ACCESS_CODE_HASH,
      status: 'ACTIVE',
      guardianId: guardian.id,
    },
  });

  // Consentimento FIXTURE (claramente identificado; sem validade jurídica).
  await prisma.consentRecord.upsert({
    where: { id: ID.consent },
    update: {},
    create: {
      id: ID.consent,
      action: 'GRANTED',
      termVersion: 'fixture-term-v0',
      source: 'seed-fixture',
      guardianId: guardian.id,
      playerId: player.id,
      recordedByAuthIdentityId: guardianIdentity.id,
    },
  });

  // Conteúdo: 1 palavra, 2 charadas, 2 respostas aceitas na charada A.
  await prisma.word.upsert({
    where: { id: ID.word },
    update: {},
    create: {
      id: ID.word,
      text: 'copo',
      status: 'ACTIVE',
      createdByAdminUserId: admin.id,
    },
  });

  await prisma.riddle.upsert({
    where: { id: ID.riddleA },
    update: {},
    create: {
      id: ID.riddleA,
      wordId: ID.word,
      prompt:
        'O que é, o que é? Com a boca para cima fica cheio; com a boca para baixo fica vazio.',
      status: 'ACTIVE',
    },
  });

  await prisma.riddle.upsert({
    where: { id: ID.riddleB },
    update: {},
    create: {
      id: ID.riddleB,
      wordId: ID.word,
      prompt: 'Serve para beber água e não é a torneira. O que é?',
      status: 'ACTIVE',
    },
  });

  await prisma.acceptedAnswer.upsert({
    where: {
      riddleId_normalizedText: {
        riddleId: ID.riddleA,
        normalizedText: 'copo',
      },
    },
    update: {},
    create: {
      id: ID.answerA1,
      riddleId: ID.riddleA,
      text: 'Copo',
      normalizedText: 'copo',
    },
  });

  await prisma.acceptedAnswer.upsert({
    where: {
      riddleId_normalizedText: {
        riddleId: ID.riddleA,
        normalizedText: 'um copo',
      },
    },
    update: {},
    create: {
      id: ID.answerA2,
      riddleId: ID.riddleA,
      text: 'Um copo',
      normalizedText: 'um copo',
    },
  });

  // Configuração atual (10 pontos, 60s de tolerância; quantidade/tempo fictícios).
  await prisma.gameConfiguration.upsert({
    where: { id: ID.config },
    update: {},
    create: {
      id: ID.config,
      pointsPerApproval: 10,
      uploadGraceSeconds: 60,
      challengesPerRound: 5,
      timeLimitSeconds: 600,
      isCurrent: true,
    },
  });

  console.log('[seed] fixtures aplicadas (idempotente).');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('[seed] falha:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
