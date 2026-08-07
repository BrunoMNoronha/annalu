# 11 — Backlog inicial

> Backlog organizado por **épicos**. **Sem estimativas em horas.** Tamanho
> relativo (`P`/`M`/`G`) apenas quando útil. Prioridade sugerida:
> `Alta`/`Média`/`Baixa`. Histórias dependentes de decisões pendentes referenciam
> [decisões pendentes](12-decisoes-pendentes.md).
> Código: `HIST-<EPICO>-NNN`.
>
> **Camada de conteúdo (domínio/serviço + adapters Prisma) — entregue** (sem
> endpoints/UI/auth): acervo `Word`/`Riddle`/`AcceptedAnswer` (criar,
> ativar/desativar, respostas 1:N com normalização — HIPÓTESE) e **leitura da
> configuração vigente**. Ver `src/modules/content` e
> `src/infrastructure/prisma/content`. Fatia **sem acoplamento jurídico** (sem
> fotografias/PII).
>
> **Camada de rodada (domínio/serviço + adapter Prisma) — PARCIAL**
> (HIST-ROUND-001; sem endpoints/UI/timer em runtime): **criação** (`createRound`)
> lê a configuração vigente, coleta o acervo **elegível** (charada ativa com ao
> menos uma resposta aceita), **sorteia** a quantidade configurada (sem reposição,
> aleatoriedade injetável) e persiste `GameSession` + `SessionChallenge` de forma
> **atômica** com os snapshots obrigatórios; **início** (`startRound`) faz a
> transição `CREATED → IN_PROGRESS` (via **compare-and-set atômico**), grava
> `startedAt` pelo relógio do **servidor** e calcula `expiresAt`; a **expiração**
> (`expireRoundIfDue`) aplica `IN_PROGRESS → EXPIRED` de forma **atômica e
> idempotente** quando `now >= expiresAt`, com `endedAt = expiresAt`. Ver
> `src/modules/round` e `src/infrastructure/prisma/round`. **RN-SEL-003 é
> CONFIRMADO** (acervo insuficiente → `InsufficientActiveContentError`, sem rodada
> parcial); **RN-SEL-002 permanece HIPÓTESE** (seleção sem reposição). **Próximo
> passo:** contador/UI da rodada e endpoints com RBAC (HIST-AUTH-002 →
> CONT/CFG/ROUND). Sem worker/cron nesta fatia.

## Épico 1 — Fundação técnica (`FUND`)

| Código | Descrição | Valor | Critérios de aceitação | Dependências | Prioridade | Tamanho |
| ------ | --------- | ----- | ---------------------- | ------------ | ---------- | ------- |
| HIST-FUND-001 | Escolher e registrar arquitetura via ADR | Base para todo o desenvolvimento | ✅ CONCLUÍDA — [ADR 0001](adr/0001-arquitetura-web-integrada.md) (Aceita); stack definida | [Opções de arquitetura](06-opcoes-de-arquitetura.md) | Alta | M |
| HIST-FUND-002 | Inicializar projeto TypeScript, lint, format e CI mínima | Qualidade desde o início | Projeto compila; lint/format rodam; CI executa checks | HIST-FUND-001 | Alta | M |
| HIST-FUND-003 | Definir ambientes dev/teste/produção separados | Segurança e isolamento | Configuração por ambiente; segredos fora do versionamento | HIST-FUND-001 | Alta | M |
| HIST-FUND-004 | Modelo físico Prisma do MVP | Persistência do domínio | ✅ **CONCLUÍDA** — integrado via **PR #16** (merge `e180324`; CI pós-merge verde, run `31165703366`): schema (17 models), migration inicial com checks e índices únicos parciais (configuração atual; raiz única de avaliação; um provedor por perfil), seed fictício idempotente **com guard de banco de teste**, testes de contrato + integração PostgreSQL das invariantes garantidas pelo banco, CI com banco descartável; ADR [0002](adr/0002-modelo-fisico-prisma-mvp.md) (`Aceita`). Ver [docs/14](14-modelo-fisico-prisma.md) | HIST-QA-014; DEC-001/003/004/005/006/008/009 ✅ | Alta | G |

## Épico 2 — Autenticação e autorização (`AUTH`)

| Código | Descrição | Valor | Critérios de aceitação | Dependências | Prioridade |
| ------ | --------- | ----- | ---------------------- | ------------ | ---------- |
| HIST-AUTH-001 | Login do administrador | Acesso controlado ao painel | Admin autentica; sessão segura | HIST-FUND-002 | Alta |
| HIST-AUTH-002 | Autorização por papel (RBAC) | Menor privilégio | Rotas admin exigem papel; negação por padrão | HIST-AUTH-001 | Alta |
| HIST-AUTH-003 | Identificação do jogador (apelido + código de acesso) | Associar rodadas ao jogador | Jogador com UUID interno + apelido; código = credencial (`access_code_hash`) | DEC-001 ✅ | Alta |
| HIST-AUTH-004 | Login de contas adultas por e-mail ou Google | Autenticar responsável/admin | Responsável entra por e-mail (link/código) ou Google; criança **não** usa e-mail/Google; identidade externa **não** substitui o UUID interno; contas podem ser desativadas; nenhuma credencial de provedor armazenada indevidamente; autorização admin continua por papel | HIST-AUTH-001 | Alta (futura — **não concluída**) |

## Épico 3 — Gestão de palavras e charadas (`CONT`)

| Código | Descrição | Valor | Critérios de aceitação | Dependências | Prioridade |
| ------ | --------- | ----- | ---------------------- | ------------ | ---------- |
| HIST-CONT-001 | CRUD de palavras | Acervo de conteúdo | 🔎 PARCIAL — camada de aplicação/domínio + adapter Prisma (criar/ativar/desativar); **sem endpoint/UI/RBAC**. Ver `src/modules/content` | HIST-AUTH-002 | Alta |
| HIST-CONT-002 | CRUD de charadas por palavra | Conteúdo jogável | 🔎 PARCIAL — serviço/adapter (criar charada vinculada; ativar/desativar); **sem endpoint/UI/RBAC** | HIST-CONT-001 | Alta |
| HIST-CONT-003 | Respostas aceitas por charada | Base para avaliação | 🔎 PARCIAL — serviço/adapter (adicionar/listar; **1:N**; unicidade por `normalizedText` — normalização é **HIPÓTESE**, ver docs/10); **sem endpoint/UI** | HIST-CONT-002; DEC-005 ✅ | Alta |
| HIST-CONT-004 | Ativar/desativar conteúdo | Curadoria | 🔎 PARCIAL — status ACTIVE/INACTIVE via serviço; `listActiveContent` exclui inativos; **sem endpoint/UI** | HIST-CONT-002 | Média |

## Épico 4 — Configuração do jogo (`CFG`)

| Código | Descrição | Valor | Critérios de aceitação | Dependências | Prioridade |
| ------ | --------- | ----- | ---------------------- | ------------ | ---------- |
| HIST-CFG-001 | Configurar quantidade de desafios | Parametrizar rodada | Valor salvo e aplicado | HIST-AUTH-002 | Alta |
| HIST-CFG-002 | Configurar tempo limite | Parametrizar rodada | Valor salvo e aplicado | HIST-AUTH-002 | Alta |
| HIST-CFG-003 | Configurar regra de pontuação | Base do ranking | Regra salva e aplicada | Regra de pontuação `PENDENTE` | Média |

## Épico 5 — Experiência da rodada (`ROUND`)

| Código | Descrição | Valor | Critérios de aceitação | Dependências | Prioridade |
| ------ | --------- | ----- | ---------------------- | ------------ | ---------- |
| HIST-ROUND-001 | Iniciar rodada com sorteio | Núcleo do jogo | 🔎 PARCIAL — camada de aplicação/domínio + adapter Prisma: `createRound` (config vigente + acervo elegível + sorteio sem reposição + snapshots + persistência atômica de `GameSession`/`SessionChallenge`) e `startRound` (`CREATED → IN_PROGRESS` via **compare-and-set atômico**, `startedAt`/`expiresAt` pelo servidor). **Sem endpoint/UI.** Acervo insuficiente → erro (**RN-SEL-003 CONFIRMADO**); sem reposição (RN-SEL-002 HIPÓTESE). Ver `src/modules/round` | HIST-CFG-001, HIST-CONT-003 | Alta |
| HIST-ROUND-002 | Exibir charada e capturar resposta | Núcleo do jogo | Charada exibida; resposta digitada | HIST-ROUND-001 | Alta |
| HIST-ROUND-003 | Temporizador da sessão | Regra de tempo | 🔎 PARCIAL — **backend de expiração entregue**: `expireRoundIfDue` transiciona `IN_PROGRESS → EXPIRED` de forma **atômica e idempotente** quando `now >= expiresAt` (servidor é a autoridade — RN-TMP-002), com `endedAt = expiresAt`; sem worker/cron. **Falta** o contador visual/UI e o disparo em runtime (route handler/consulta). Ver `src/modules/round` (`expireRoundIfDue`) | HIST-CFG-002; DEC-009 ✅ | Alta |
| HIST-ROUND-004 | Encerrar/finalizar rodada | Conclusão do fluxo | Rodada encerra e confirma envio | HIST-ROUND-002 | Alta |
| HIST-ROUND-005 | Pular charada | Flexibilidade | Pular conforme regra | Decisão de pular `PENDENTE` | Baixa |

## Épico 6 — Captura e upload de imagens (`IMG`)

| Código | Descrição | Valor | Critérios de aceitação | Dependências | Prioridade |
| ------ | --------- | ----- | ---------------------- | ------------ | ---------- |
| HIST-IMG-001 | Capturar/selecionar foto | Núcleo do jogo | Câmera ou seleção de arquivo | HIST-ROUND-002 | Alta |
| HIST-IMG-002 | Pré-visualização e refazer | UX | Preview antes de enviar | HIST-IMG-001 | Alta |
| HIST-IMG-003 | Validar tipo e tamanho | Segurança | Rejeita tipo/tamanho inválido | HIST-IMG-001 | Alta |
| HIST-IMG-004 | Upload privado + progresso | Segurança e UX | Objeto privado; feedback de progresso | HIST-FUND-003 | Alta |
| HIST-IMG-005 | Compressão e remoção de EXIF | Privacidade/perf | Imagem otimizada; EXIF sensível removido | HIST-IMG-004; `HIPÓTESE` | Média |
| HIST-IMG-006 | Expiração idempotente da rodada | Regra de expiração (DEC-009) | Envia só completas uma única vez; texto sem foto vira histórico; tolerância de upload `upload_grace_seconds` (60 s) copiada na rodada | HIST-ROUND-003, HIST-IMG-004 | Alta (futura — **não concluída**) |
| HIST-IMG-007 | Limpeza de uploads órfãos | Privacidade e custo | Objeto de upload não confirmado dentro da tolerância é removido; resposta permanece incompleta | HIST-IMG-006 | Média (futura — **não concluída**) |

## Épico 7 — Avaliação administrativa (`EVAL`)

| Código | Descrição | Valor | Critérios de aceitação | Dependências | Prioridade |
| ------ | --------- | ----- | ---------------------- | ------------ | ---------- |
| HIST-EVAL-001 | Fila de participações pendentes | Operação de curadoria | Lista participações pendentes | HIST-ROUND-004, HIST-IMG-004 | Alta |
| HIST-EVAL-002 | Ver resposta + imagem com segurança | Avaliar com contexto | Exibe dados via acesso autorizado | HIST-EVAL-001 | Alta |
| HIST-EVAL-003 | Aprovar/rejeitar (com motivo) | Decisão humana | Decisão registrada; motivo ao rejeitar | HIST-EVAL-002; motivo `HIPÓTESE` | Alta |

## Épico 8 — Pontuação e ranking (`SCORE`)

| Código | Descrição | Valor | Critérios de aceitação | Dependências | Prioridade |
| ------ | --------- | ----- | ---------------------- | ------------ | ---------- |
| HIST-SCORE-001 | Conceder pontos ao aprovar | Recompensa | Pontos fixos (padrão 10, configurável, snapshot na rodada); só aprovadas geram pontos; idempotência por **`evaluation_event_id`** (um `EvaluationEvent` → no máx. 1 transação) | HIST-EVAL-003; DEC-003 ✅ | Alta (futura — **não concluída**) |
| HIST-SCORE-002 | Ranking denso | Engajamento e justiça | Ordena por total validado; empatados compartilham posição; UUID só p/ ordenação técnica | HIST-SCORE-001; DEC-004 ✅ | Alta (futura — **não concluída**) |
| HIST-SCORE-003 | Transações compensatórias na reavaliação | Rastreabilidade | Reversão cria transação negativa (motivo/autor/data); histórico preservado; total recalculado | HIST-SCORE-001; DEC-003 ✅ | Média (futura — **não concluída**) |

## Épico 9 — Segurança e privacidade (`SEC`)

| Código | Descrição | Valor | Critérios de aceitação | Dependências | Prioridade |
| ------ | --------- | ----- | ---------------------- | ------------ | ---------- |
| HIST-SEC-001 | Consentimento versionado e revogável (`ConsentRecord`) | Conformidade LGPD | Registro append-only (versão/data/origem/escopo); estado derivado do histórico; revogação bloqueia captura/upload e aciona retenção | DEC-018 ⚠️ PARCIAL; **revisão jurídica** | Alta (futura — **não concluída**) |
| HIST-SEC-002 | Retenção configurável e exclusão de imagens | Conformidade | `retention_until`, expurgo do objeto, confirmação e falhas, auditoria sem imagem | DEC-010 ⚠️ PARCIAL; **prazo jurídico** | Média (futura — **não concluída**) |
| HIST-SEC-003 | Auditoria administrativa | Rastreabilidade | Ações relevantes registradas (imutável) | HIST-AUTH-002; `HIPÓTESE` | Média |
| HIST-SEC-004 | Código de acesso seguro | Proteção da conta da criança | `access_code_hash` (sem texto puro/logs/query string); rate limiting; rotação/revogação; sem códigos triviais | DEC-001 ✅ | Alta (futura — **não concluída**) |
| HIST-SEC-005 | Gate de câmera/galeria por consentimento | Proteção do menor | Câmera/galeria/upload bloqueados até responsável autenticado + consentimento | HIST-AUTH-004, HIST-SEC-001 | Alta (futura — **não concluída**) |
| HIST-SEC-006 | **Encaminhamento jurídico** (DEC-002, DEC-010, DEC-017, DEC-018) | Conformidade LGPD | ⏳ **PENDENTE — a encaminhar** a especialista: validade do fluxo do responsável (DEC-002), consentimento/base legal/verificação (DEC-018), prazo/política de retenção (DEC-010), faixa etária (DEC-017). **Não iniciado por especialista.** Bloqueia lançamento com fotos | DEC-002/010/017/018 | Alta (bloqueio de lançamento — **não iniciada**) |

## Épico 10 — Qualidade e observabilidade (`QA`)

| Código | Descrição | Valor | Critérios de aceitação | Dependências | Prioridade |
| ------ | --------- | ----- | ---------------------- | ------------ | ---------- |
| HIST-QA-001 | Suíte de testes base | Confiabilidade | Unit+integração+e2e mínimos rodando | HIST-FUND-002 | Alta |
| HIST-QA-002 | Logs e monitoramento de erros | Diagnóstico | Erros/falhas de upload registrados | HIST-FUND-003; `HIPÓTESE` | Média |
| HIST-QA-003 | **Manutenção recorrente de dependências** (recorrente) | Segurança e atualização | Revisar PRs do Dependabot; manter auditoria limpa conforme política ([docs/08](08-seguranca-e-privacidade.md#111-política-de-dependências-e-auditoria)); atualizações major com revisão humana | HIST-FUND-002 | Média (recorrente — nunca "concluída") |
| HIST-QA-004 | Padronizar finais de linha por `.gitattributes` | Consistência entre SOs; `format:check` estável no Windows | ✅ CONCLUÍDA — `.gitattributes` com `* text=auto eol=lf`; binários preservados; sem renormalização em massa | HIST-FUND-002 | Média |
| HIST-QA-005 | Migração de versão Node.js + `@types/node` | Atualizar runtime suportado | Decisão explícita de nova linha LTS; `.nvmrc`/`engines`/`@types/node` alinhados; regressão completa | Decisão de versão Node `PENDENTE` | Baixa (futura — **não concluída**) |
| HIST-QA-006 | Migração Prisma 7 (CLI + `@prisma/client` juntos) | Manter ORM atualizado | Migrar `prisma` e `@prisma/client` na mesma major; breaking changes, geração do cliente e impacto na modelagem física analisados | Modelo físico `PENDENTE` | Baixa (futura — **não concluída**) |
| HIST-QA-007 | Migração TypeScript 6 | Compilador atualizado | Revisar mudanças do compilador e compatibilidade com Next.js/Prisma/ESLint e modo estrito; regressão | HIST-FUND-002 | Baixa (futura — **não concluída**) |
| HIST-QA-008 | Migração Vitest 4 | Infra de testes atualizada | Revisar configuração, Vite transitivo, ambiente jsdom e regressão completa da suíte | HIST-FUND-002 | Baixa (futura — **não concluída**) |
| HIST-QA-009 | Migração Next.js 16 | Framework atualizado | Revisar breaking changes do Next.js 16; validar App Router; revisar bundler (Turbopack) e comportamento de build; confirmar compatibilidade de React, ESLint, Prisma e Node; revisar o override de `sharp`; executar auditoria e smoke test de produção; nenhuma migração automática | HIST-FUND-002 | Baixa (futura — **não concluída**) |
| HIST-QA-010 | Migração ESLint 9 | Linter atualizado | Revisar compatibilidade com `eslint-config-next`; avaliar configuração legada versus flat config; preservar regras de acessibilidade; executar lint em Windows e Linux; não reduzir regras para obter sucesso artificial | HIST-FUND-002 | Baixa (futura — **não concluída**) |
| HIST-QA-011 | Migração jsdom 30 | Ambiente de testes atualizado | Revisar breaking changes de DOM/CSSOM; alinhar a versão mínima de Node exigida pelo jsdom com `.nvmrc` e `engines`; revisar efeitos na Testing Library e Vitest; regressão completa. **jsdom 30 exige um piso específico dentro da linha Node 22** e não deve ser adotado enquanto o projeto declara suporte genérico a `>=22 <23` | HIST-QA-005; HIST-FUND-002 | Baixa (futura — **não concluída**) |
| HIST-QA-012 | Migração Zod 4 | Validação atualizada | Revisar mudanças de API e inferência; revisar schemas de ambiente; revisar mensagens e estrutura de erros; adicionar testes de regressão para schemas; não migrar silenciosamente validações de segurança | HIST-FUND-002 | Baixa (futura — **não concluída**) |
| HIST-QA-013 | Migração `@testing-library/jest-dom` 7 | Matchers atualizados | Adicionar e alinhar o peer obrigatório `@testing-library/dom`; revisar configuração de matchers; confirmar compatibilidade com Testing Library e Vitest; executar a suíte completa | HIST-QA-008; HIST-FUND-002 | Baixa (futura — **não concluída**) |
| HIST-QA-014 | Resolver o pacote de decisões do MVP | Destravar o modelo físico e o início do jogador | ✅ CONCLUÍDA — orquestrador respondeu o formulário de [13](13-pacote-decisoes-mvp.md); decisões de produto registradas; itens jurídicos (DEC-002/018/010/017) **sinalizados como pendentes**; documentos atualizados | — | Alta |

## Épico 11 — Implantação (`DEPLOY`)

| Código | Descrição | Valor | Critérios de aceitação | Dependências | Prioridade |
| ------ | --------- | ----- | ---------------------- | ------------ | ---------- |
| HIST-DEPLOY-001 | Pipeline de deploy | Entrega contínua | Deploy automatizado por ambiente | Hospedagem `PENDENTE` | Média |
| HIST-DEPLOY-002 | Configuração de armazenamento de objetos | Imagens em produção | Bucket privado configurado | Provedor `PENDENTE` | Média |

## Referências cruzadas

- [Escopo e requisitos](01-escopo-e-requisitos.md)
- [Decisões pendentes](12-decisoes-pendentes.md)
