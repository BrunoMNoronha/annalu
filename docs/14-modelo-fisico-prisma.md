# 14 — Modelo físico Prisma (MVP)

> Implementa o modelo físico relacional do MVP a partir das decisões em
> [13 — Pacote de decisões](13-pacote-decisoes-mvp.md) e do conceitual em
> [07](07-modelo-de-dados-inicial.md). **Somente persistência e testes** — sem
> APIs, autenticação, upload, avaliação, expiração ou ranking em serviços.
> Decisão registrada na ADR [0002](adr/0002-modelo-fisico-prisma-mvp.md)
> (`Proposta`).

## Objetivo e escopo

Definir `prisma/schema.prisma`, a migration inicial PostgreSQL, constraints/
índices, seed fictício idempotente e testes (contrato + integração). Restrições
jurídicas (DEC-002, DEC-010, DEC-017, DEC-018) continuam pendentes; o schema
**suporta** os conceitos mas **não** os valida juridicamente. **Lançamento e
coleta real de fotografias permanecem bloqueados.**

## Models (17) e enums

**Models:** `Player`, `Guardian`, `AuthIdentity`, `AdminUser`, `ConsentRecord`,
`Word`, `Riddle`, `AcceptedAnswer`, `GameConfiguration`, `GameSession`,
`SessionChallenge`, `PlayerAnswer`, `SubmittedImage`, `Evaluation`,
`EvaluationEvent`, `ScoreTransaction`, `AuditLog`. **Não há `RankingEntry`** — o
ranking é projeção derivada.

**Enums:** `PlayerStatus`, `AccountStatus` (Guardian/AuthIdentity/AdminUser),
`AuthProvider` (EMAIL/GOOGLE), `AdminRole` (ADMIN), `ConsentAction`
(GRANTED/REVOKED), `ContentStatus` (ACTIVE/INACTIVE), `GameSessionStatus`,
`SessionChallengeState`, `PlayerAnswerState`, `ImageLifecycleState`,
`ImageDeletionState`, `EvaluationResult`, `EvaluationAppliedResult`,
`EvaluationEventType`.

## Estratégia de IDs, nomes e datas

- PK **UUID** (`@default(uuid())`).
- Models/campos em inglês; **tabelas/colunas em `snake_case`** via `@@map`/`@map`.
- Timestamps `timestamptz` (`@db.Timestamptz(6)`). `createdAt`/`updatedAt` onde há
  estado mutável; **append-only sem `updatedAt`** (`ConsentRecord`,
  `EvaluationEvent`, `ScoreTransaction`, `AuditLog`).

## Cardinalidades

`Word 1:N Riddle` · `Riddle 1:N AcceptedAnswer` · `Guardian 1:N Player` ·
`AuthIdentity 0..1 (Guardian|AdminUser)` · `Player 1:N GameSession` ·
`GameConfiguration 1:N GameSession` · `GameSession 1:N SessionChallenge` ·
`SessionChallenge 0..1 PlayerAnswer` · `PlayerAnswer 0..1 SubmittedImage` ·
`PlayerAnswer 0..1 Evaluation` · **`Evaluation 0:N EvaluationEvent`** ·
`EvaluationEvent 0..1 ScoreTransaction` · `Player 1:N ScoreTransaction`.

## Snapshots da rodada

`GameSession` copia, na criação, valores **obrigatórios**:
`pointsPerApprovalSnapshot`, `uploadGraceSecondsSnapshot`,
`challengesCountSnapshot`, `timeLimitSecondsSnapshot`. A relação com
`GameConfiguration` serve à rastreabilidade; a regra da rodada usa os snapshots.

## Avaliação por eventos e idempotência

`Evaluation` é o agregado (pode ficar `PENDING` **sem eventos**). Cada decisão/
revisão é um `EvaluationEvent` **append-only**, em cadeia linear
(`previousEventId` **único** ⇒ sem bifurcação; check de não autorreferência).
`ScoreTransaction.evaluationEventId` é **único** ⇒ **um evento → no máx. uma
transação** (idempotência). Pontos **≠ 0**; positivos/negativos; **rejeição
inicial não gera transação**. Ranking = **soma** das transações. **Raiz única por
avaliação:** índice único parcial `(evaluation_id) WHERE previous_event_id IS
NULL` ⇒ no máximo um evento inicial por avaliação (impede duas decisões iniciais,
inclusive sob concorrência), sem alterar a cardinalidade 0:N nem exigir evento
para uma avaliação pendente.

## Ranking derivado (sem tabela)

Consulta conceitual: agrupar `score_transactions` por `player_id`; somar
`points`; ordenar total decrescente; **ranking denso** (empate compartilha
posição); UUID apenas como ordenação técnica entre empatados. Sem view/
materialized view nesta tarefa.

## Ciclo da imagem

`SubmittedImage` 1:1 com `PlayerAnswer`; `storageKey` privado/único (**nunca**
URL pública). `lifecycleState`: `RESERVED`→`UPLOADING`→`CONFIRMED`→`ASSOCIATED`;
`ORPHAN_EXPIRED`; `DELETED`. Campos de expurgo: `retentionUntil` (**opcional, sem
default de 30 dias**), `deletionState`, `deletedAt`, `deletionReason`,
`objectDeletionConfirmed`, `purgeAttempts`, `purgeLastError`.

## Autenticação adulta separada

`AuthIdentity` (EMAIL/GOOGLE + `externalIdentifier`) representa contas adultas,
**separada** do perfil de domínio; **não** guarda tokens. Proprietário via
`guardianId`/`adminUserId` (associação polimórfica emulada por duas FKs opcionais
+ check "exatamente um proprietário").

## Regras GARANTIDAS pelo banco

- `players.public_tag` único; `accessCodeHash` obrigatório (NOT NULL); Player sem
  e-mail/idade/nascimento/nome/documento/endereço.
- `auth_identities`: `(provider, external_identifier)` único; **check exatamente
  um proprietário** (`num_nonnulls(guardian_id, admin_user_id)=1`); índices
  únicos parciais `(guardian_id, provider)` e `(admin_user_id, provider)`.
- `accepted_answers`: único `(riddle_id, normalized_text)`.
- `game_configurations`: checks (`points>0`, `grace>=0`, `challenges>0`,
  `time>0`) e **índice único parcial** `WHERE is_current = true` (no máx. uma
  atual).
- `game_sessions`: checks positivos dos snapshots; índices `(player,status)`,
  `(status,expires_at)`, `(configuration)`.
- `session_challenges`: únicos `(session,position)` e `(session,riddle)`; check
  `position>0`.
- `player_answers.session_challenge_id` único (0..1 por desafio).
- `submitted_images`: `player_answer_id` e `storage_key` únicos; check
  `size_bytes>0` (quando presente) e `purge_attempts>=0`.
- `evaluations.player_answer_id` único.
- `evaluation_events`: `previous_event_id` único; **check** `id <> previous_event_id`;
  **índice único parcial** `(evaluation_id) WHERE previous_event_id IS NULL`
  (**raiz única por avaliação** — preserva 0:N; impede duas raízes, inclusive sob
  concorrência).
- `score_transactions`: `evaluation_event_id` único; **check `points <> 0`**.
- FKs de histórico com **`Restrict`** (rodada, avaliação, pontuação, conteúdo);
  `SetNull` em vínculos opcionais (`Player.guardian`, `ConsentRecord.recordedBy`);
  `Cascade` apenas para `AuthIdentity` a partir do proprietário (identidade sem
  valor histórico próprio).

## Regras que dependem de SERVIÇO (não expressáveis por FK simples)

- "Resposta **enviada** exige fotografia válida" — atravessa `PlayerAnswer` +
  `SubmittedImage` + estado; aplicada em transação (caso de uso futuro).
- "`previousEvent` pertence à **mesma** `Evaluation`" — não é expressável com FK
  (invariante de serviço). Nota: a **raiz única por avaliação** (evento inicial)
  é garantida pelo banco (índice parcial acima); apenas o vínculo do
  `previousEvent` encadeado à mesma avaliação permanece a cargo do serviço.
- Imutabilidade append-only (sem `UPDATE`/`DELETE`) — regra de repositório,
  **não** trigger (para não impedir futura política de exclusão jurídica).
- Geração de `ScoreTransaction` (aprovação/reversão), transição de estados,
  expiração/tolerância de upload, correspondência `playerId`↔rodada — todos em
  serviços transacionais futuros.

## Migration

`prisma/migrations/20260806130000_initial_domain_model/migration.sql` +
`migration_lock.toml` (`provider = "postgresql"`). SQL base gerado por
`prisma migrate diff --from-empty --to-schema-datamodel --script` e **aumentado
manualmente** com os checks, os índices únicos parciais (configuração atual e
**raiz única de avaliação**) e o check "exatamente um proprietário".
**Configurada para ser aplicada no CI** via `prisma migrate deploy` em PostgreSQL
descartável; **validada localmente** contra `postgres:16` descartável (aplica em
banco vazio; `migrate status` "up to date"). A **validação autoritativa do CI
permanece pendente** enquanto o workflow não executa os passos.

## Seed

`prisma/seed.mjs` (config `prisma.seed` no `package.json`) — **fictício e
idempotente** (UUIDs determinísticos + `upsert`): 1 admin + identidade,
1 responsável + identidade, 1 criança, 1 consentimento fixture, 1 palavra,
2 charadas, 2 respostas aceitas, 1 configuração atual (10 pontos, 60 s).
Domínios `example.test`; `accessCodeHash` é fixture não autenticável. Sem foto/
rodada/avaliação/pontuação reais.

## Testes

- **Contrato (unitário, sem banco):**
  [`src/infrastructure/prisma/schema-contract.test.ts`](../src/infrastructure/prisma/schema-contract.test.ts)
  inspeciona o DMMF (models obrigatórios, ausência de `RankingEntry`, ausência de
  campos proibidos em `Player`, `accessCodeHash`, `EvaluationEvent`,
  `evaluationEventId`, ausência de `consentStatus`/URL pública).
- **Integração (PostgreSQL real):** [`tests/integration/prisma/`](../tests/integration/prisma/)
  — **34 casos**: 33 de invariantes garantidas pelo banco (inclui **um provedor
  por perfil** e **raiz única por avaliação**) + 1 de idempotência do seed.
  **Guard** de segurança (`helpers.ts`) só executa `TRUNCATE`/reset quando o nome
  do banco contém `_test`/`test`/`integration`.

## Comandos locais

```bash
pnpm prisma:format
pnpm prisma:validate
pnpm prisma:generate
pnpm prisma:migrate:deploy   # requer PostgreSQL de teste
pnpm prisma:seed             # idempotente
pnpm test:integration        # requer PostgreSQL de teste
pnpm test:run                # unitários (inclui contrato do schema)
```

`DATABASE_URL`/`TEST_DATABASE_URL` devem apontar para banco **descartável**
(ver `.env.example`).

## Pendências jurídicas

DEC-002 (validade do fluxo do responsável), DEC-018 (consentimento),
DEC-010 (prazo/política de retenção) e DEC-017 (faixa etária) permanecem para
revisão jurídica. O schema oferece suporte técnico, sem afirmar validade legal.

## Limitações

- Migration, seed (2×) e testes de integração **foram executados localmente**
  contra `postgres:16` **descartável** e aprovados; a **validação autoritativa do
  CI permanece pendente** enquanto o workflow não executa os passos. Validação
  local **não** equivale ao CI.
- O PostgreSQL do CI (imagem `postgres:16`) é **baseline de CI**, não decisão de
  provedor de produção.
- Invariantes que dependem de serviço (acima) **não** são garantidas pelo banco
  nesta etapa.
