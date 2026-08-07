# 10 — Estratégia de testes

> Estratégia de alto nível. Ferramentas específicas dependem do framework
> escolhido (`PENDENTE`, ver [opções de arquitetura](06-opcoes-de-arquitetura.md)).
> Regra inegociável: **nenhum dado pessoal real** em testes, fixtures ou seeds.

## Princípios

- Pirâmide de testes: muitos testes unitários, uma camada intermediária de
  integração/API e poucos e2e essenciais.
- Testes devem rodar de forma **determinística** e isolada.
- Cobrir especialmente **regras de negócio**, **autorização** e **upload**.

## 1. Testes unitários

- Alvo: lógica pura — normalização de resposta, cálculo de pontuação, seleção
  aleatória (com semente controlada), transições de estado.
- Sem dependências externas (banco, rede, storage).

## 2. Testes de integração

- Alvo: interação entre camadas — persistência, repositórios, regras que tocam o
  banco.
- Usar banco de teste **isolado e descartável**; dados fictícios.
- **Modelo físico Prisma** ([docs/14](14-modelo-fisico-prisma.md)): a suíte
  [`tests/integration/prisma/`](../tests/integration/prisma/) valida invariantes
  garantidas pelo banco (unicidades, checks, "exatamente um proprietário",
  **um provedor por perfil** — índices únicos parciais `(guardian_id, provider)` /
  `(admin_user_id, provider)`, configuração atual única, idempotência por
  `evaluationEventId`, `Evaluation 0:N EvaluationEvent`, **raiz única por
  avaliação** — índice único parcial `WHERE previous_event_id IS NULL`, etc.) e a
  idempotência do seed. Config separada em `vitest.integration.config.ts` (não
  roda em `pnpm test:run`).
- **Conteúdo (aplicação/domínio + adapters Prisma):**
  [`tests/integration/prisma/content.test.ts`](../tests/integration/prisma/content.test.ts)
  valida palavras/charadas/respostas aceitas via os adapters reais — criação,
  1:N, unicidade `(riddle_id, normalized_text)`, ativar/desativar excluindo do
  acervo elegível, `getCurrentConfiguration` (atual/`null`) e erros de pai
  inexistente. Testes unitários da camada em `src/modules/content/**` (funções
  puras e serviços com fakes de repositório).
- **Normalização de resposta (`normalizeAnswerText`) — HIPÓTESE provisória:**
  `trim` → colapso de whitespace interno → lowercase; **não** remove acentos,
  não translitera, não altera pontuação nem o texto original. Política técnica
  reversível até a decisão definitiva de **RN-RES-002/003** — não é regra de
  produto confirmada.
- **Rodada (`GameSession`) — aplicação/domínio + adapter Prisma:** testes
  unitários em `src/modules/round/**` cobrem a seleção pura de desafios
  (elegibilidade = charada ativa com ≥1 resposta aceita; **determinística** com
  fonte de aleatoriedade controlada — sem `Math.random()` na regra; **sem
  reposição** ⇒ sem repetição; posições 1..N; pool igual/maior que o requerido),
  os snapshots copiados exatamente, os erros (sem configuração vigente, acervo
  insuficiente), a transição `CREATED → IN_PROGRESS`, `startedAt` via `Clock` e
  `expiresAt = startedAt + timeLimitSecondsSnapshot`. Um teste de arquitetura
  garante que a camada **não importa `PrismaClient`**. A integração real em
  [`tests/integration/prisma/round.test.ts`](../tests/integration/prisma/round.test.ts)
  valida criação atômica de `GameSession`/`SessionChallenge`, FKs de `Player`/
  configuração, snapshots persistidos, posições e `riddleId` únicos na sessão,
  apenas conteúdo elegível, `startedAt`/`expiresAt` persistidos, erros de acervo
  insuficiente / sem configuração / jogador inexistente e **rollback** da
  transação diante de falha na criação de um desafio (nenhuma rodada parcial).
- **Início e expiração concorrente-seguros (`compare-and-set`):** as transições
  `CREATED → IN_PROGRESS` (`startIfCreated`) e `IN_PROGRESS → EXPIRED`
  (`expireIfDue`) são **atômicas no banco** — a condição de estado integra a
  cláusula `WHERE` da escrita (não o padrão frágil `findById → validar →
  update`). Cobertura em
  [`tests/integration/prisma/game-session-lifecycle.test.ts`](../tests/integration/prisma/game-session-lifecycle.test.ts):
  - **Concorrência do início:** duas chamadas simultâneas de `startRound` →
    **exatamente uma** vence; a perdedora recebe erro de transição e **não
    sobrescreve** `startedAt`/`expiresAt`.
  - **Boundary temporal:** `now < expiresAt` **não** expira; `now == expiresAt`
    (inclusivo) **expira**; `now > expiresAt` expira. O `Clock` do servidor é a
    autoridade (RN-TMP-002); testes usam **relógio fake** (`fixedClock`), nunca o
    relógio real.
  - **`endedAt = expiresAt`** (nunca o relógio de detecção do vencimento).
  - **Idempotência:** repetir `expireRoundIfDue` numa sessão já `EXPIRED` não
    retransiciona nem altera `endedAt`/`expiresAt`; concorrência de expiração →
    estado final consistente.
  - **Estados incompatíveis:** `CREATED`/`COMPLETED`/`CANCELLED` **não** expiram
    (estados terminais não são reabertos).
- **Fontes de aleatoriedade:** a regra usa a abstração `RandomSource` (injeção);
  testes usam `sequenceRandom` (sequência fixa). **Evitar** testes frágeis
  baseados em distribuição estatística de `Math.random()`.
- **Seleção sem reposição (RN-SEL-002 — HIPÓTESE) / acervo insuficiente
  (RN-SEL-003 — CONFIRMADO):** a rodada seleciona **sem reposição** (consistente
  com a unicidade física `(sessionId, riddleId)`) — RN-SEL-002 permanece
  **HIPÓTESE**, atendida como consequência técnica. Por **RN-SEL-003
  (CONFIRMADO)**, quando há menos charadas elegíveis do que `challengesPerRound`
  a criação **falha antes de persistir** (`InsufficientActiveContentError`), sem
  rodada parcial.
- **Guard de segurança:** o helper só executa `TRUNCATE`/reset quando o nome do
  banco contém `_test`/`test`/`integration`. **Nunca** `migrate reset`/
  `db push --force-reset`/`DROP DATABASE` sem essa verificação.
- **Contrato de schema (sem banco):** teste unitário que inspeciona o DMMF do
  Prisma (models obrigatórios, ausência de `RankingEntry`, campos proibidos em
  `Player`, `accessCodeHash`, etc.).

## 3. Testes de API

- Alvo: endpoints/handlers — contrato de entrada/saída, códigos de status,
  validações.
- Incluir casos de erro (payload inválido, arquivo grande, tipo não permitido).

## 4. Testes de interface (componentes)

- Alvo: componentes de UI — renderização, estados (carregando/erro), acesso a
  alvos de toque, mensagens amigáveis.
- Verificar comportamento em telas pequenas.

## 5. Testes end-to-end (e2e)

- Alvo: jornadas completas — iniciar rodada, responder, capturar imagem
  (mockada), enviar; avaliar como administrador; ver ranking.
- Manter poucos e estáveis.

## 6. Testes de autorização

- Garantir que rotas administrativas exigem autenticação e papel correto.
- Garantir que imagens/dados de crianças **não** são acessíveis sem autorização.
- Testar negação por padrão.

## 7. Testes de upload

- Tipos permitidos aceitos; tipos proibidos rejeitados.
- Limite de tamanho respeitado (cliente e servidor).
- Remoção de EXIF sensível quando implementada (`HIPÓTESE`).
- Armazenamento como objeto privado (sem URL pública).

## 8. Testes de expiração de sessão

- Rodada expira ao atingir o tempo limite (servidor é a autoridade do tempo).
- **Apenas respostas completas** são enviadas automaticamente, **uma única vez**
  (idempotência); texto sem foto vira histórico somente leitura.
- Upload reservado antes do prazo e finalizado **dentro de 60 s**
  (`upload_grace_seconds`) conta como completo; **fora** da tolerância, o objeto
  órfão é removido e a resposta fica incompleta.
- Sem retomada após a expiração (DEC-009).

## 9. Testes do cálculo de pontuação e avaliação por eventos

- **Pontos fixos** (padrão 10, configurável); a rodada usa o **snapshot** do valor.
- **Avaliação pendente sem evento:** dada uma `Evaluation` recém-criada e
  pendente, quando ainda não ocorreu decisão administrativa, então ela possui
  **zero `EvaluationEvent`** e **nenhuma** `ScoreTransaction`.
- **Raiz única por avaliação:** uma avaliação aceita **no máximo um** evento
  inicial (`previous_event_id` nulo); uma **segunda raiz é rejeitada** pelo banco,
  inclusive sob concorrência; avaliações distintas têm raízes independentes. A
  regra de que o `previousEvent` encadeado pertence à **mesma** avaliação
  permanece invariante de serviço.
- **Aprovação inicial** cria **um `EvaluationEvent`** e **uma** transação **+10**.
- **Idempotência por evento:** o **mesmo `EvaluationEvent`** não gera segunda
  transação (`evaluation_event_id`).
- **Revisão** aprovada→rejeitada cria **novo evento** e transação **−10**;
  **nova aprovação** cria outro evento e **+10**.
- **Rejeição inicial não cria transação.**
- Eventos anteriores **nunca** são apagados; transações **nunca** são alteradas;
  o total = **soma** (positivas + negativas).
- **Um evento nunca produz dois efeitos**; **eventos distintos** da mesma
  avaliação podem produzir efeitos distintos.

## 10. Testes do ranking

- Ordenação por total validado, decrescente; considera apenas pontuação validada.
- **Ranking denso:** empatados **compartilham a mesma posição**.
- Ordenação técnica por **UUID** garante paginação determinística **sem** alterar
  a posição competitiva; **sem** uso de horário de avaliação/tempo/rejeições
  (DEC-004).

## 11.a. Testes de identificação e código de acesso

- Apelidos iguais coexistem (UUID distinto; identificador público curto).
- Código de acesso: **hash** (nunca texto puro), **rate limiting** em tentativas
  inválidas, ausência em logs/query string.

## 11.b. Testes de consentimento e gate de mídia

- Câmera/galeria/upload **bloqueados** sem responsável autenticado + consentimento.
- Revogação bloqueia novos uploads e preserva o histórico append-only.

## 11. Testes em navegadores móveis

- Validar em viewports móveis (dimensões de celular).
- Fluxos de câmera/seleção de imagem.
- Comportamento sob conexão lenta/instável (simulada).
- Alvos de toque e acessibilidade básica.

## Dados de teste

- Sempre fictícios; nunca dados reais de pessoas ou crianças.
- Imagens de teste sintéticas ou não identificáveis.
- Seeds e fixtures versionados devem ser seguros para compartilhamento.

## Referências cruzadas

- [Requisitos](01-escopo-e-requisitos.md)
- [Regras de negócio](02-regras-de-negocio.md)
- [Segurança e privacidade](08-seguranca-e-privacidade.md)
