# 11 — Backlog inicial

> Backlog organizado por **épicos**. **Sem estimativas em horas.** Tamanho
> relativo (`P`/`M`/`G`) apenas quando útil. Prioridade sugerida:
> `Alta`/`Média`/`Baixa`. Histórias dependentes de decisões pendentes referenciam
> [decisões pendentes](12-decisoes-pendentes.md).
> Código: `HIST-<EPICO>-NNN`.

## Épico 1 — Fundação técnica (`FUND`)

| Código | Descrição | Valor | Critérios de aceitação | Dependências | Prioridade | Tamanho |
| ------ | --------- | ----- | ---------------------- | ------------ | ---------- | ------- |
| HIST-FUND-001 | Escolher e registrar arquitetura via ADR | Base para todo o desenvolvimento | ✅ CONCLUÍDA — [ADR 0001](adr/0001-arquitetura-web-integrada.md) (Aceita); stack definida | [Opções de arquitetura](06-opcoes-de-arquitetura.md) | Alta | M |
| HIST-FUND-002 | Inicializar projeto TypeScript, lint, format e CI mínima | Qualidade desde o início | Projeto compila; lint/format rodam; CI executa checks | HIST-FUND-001 | Alta | M |
| HIST-FUND-003 | Definir ambientes dev/teste/produção separados | Segurança e isolamento | Configuração por ambiente; segredos fora do versionamento | HIST-FUND-001 | Alta | M |

## Épico 2 — Autenticação e autorização (`AUTH`)

| Código | Descrição | Valor | Critérios de aceitação | Dependências | Prioridade |
| ------ | --------- | ----- | ---------------------- | ------------ | ---------- |
| HIST-AUTH-001 | Login do administrador | Acesso controlado ao painel | Admin autentica; sessão segura | HIST-FUND-002 | Alta |
| HIST-AUTH-002 | Autorização por papel (RBAC) | Menor privilégio | Rotas admin exigem papel; negação por padrão | HIST-AUTH-001 | Alta |
| HIST-AUTH-003 | Identificação do jogador | Associar rodadas ao jogador | Jogador identificado conforme decisão | Decisão de identificação `PENDENTE` | Alta |

## Épico 3 — Gestão de palavras e charadas (`CONT`)

| Código | Descrição | Valor | Critérios de aceitação | Dependências | Prioridade |
| ------ | --------- | ----- | ---------------------- | ------------ | ---------- |
| HIST-CONT-001 | CRUD de palavras | Acervo de conteúdo | Criar/editar/desativar palavra | HIST-AUTH-002 | Alta |
| HIST-CONT-002 | CRUD de charadas por palavra | Conteúdo jogável | Charada vinculada a palavra; enunciado | HIST-CONT-001 | Alta |
| HIST-CONT-003 | Respostas aceitas por charada | Base para avaliação | Uma ou mais respostas aceitas | HIST-CONT-002; múltiplas respostas `PENDENTE` | Alta |
| HIST-CONT-004 | Ativar/desativar conteúdo | Curadoria | Só ativos entram no sorteio | HIST-CONT-002 | Média |

## Épico 4 — Configuração do jogo (`CFG`)

| Código | Descrição | Valor | Critérios de aceitação | Dependências | Prioridade |
| ------ | --------- | ----- | ---------------------- | ------------ | ---------- |
| HIST-CFG-001 | Configurar quantidade de desafios | Parametrizar rodada | Valor salvo e aplicado | HIST-AUTH-002 | Alta |
| HIST-CFG-002 | Configurar tempo limite | Parametrizar rodada | Valor salvo e aplicado | HIST-AUTH-002 | Alta |
| HIST-CFG-003 | Configurar regra de pontuação | Base do ranking | Regra salva e aplicada | Regra de pontuação `PENDENTE` | Média |

## Épico 5 — Experiência da rodada (`ROUND`)

| Código | Descrição | Valor | Critérios de aceitação | Dependências | Prioridade |
| ------ | --------- | ----- | ---------------------- | ------------ | ---------- |
| HIST-ROUND-001 | Iniciar rodada com sorteio | Núcleo do jogo | Desafios aleatórios conforme config | HIST-CFG-001, HIST-CONT-003 | Alta |
| HIST-ROUND-002 | Exibir charada e capturar resposta | Núcleo do jogo | Charada exibida; resposta digitada | HIST-ROUND-001 | Alta |
| HIST-ROUND-003 | Temporizador da sessão | Regra de tempo | Tempo exibido; expiração conforme regra | HIST-CFG-002; comportamento ao expirar `PENDENTE` | Alta |
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

## Épico 7 — Avaliação administrativa (`EVAL`)

| Código | Descrição | Valor | Critérios de aceitação | Dependências | Prioridade |
| ------ | --------- | ----- | ---------------------- | ------------ | ---------- |
| HIST-EVAL-001 | Fila de participações pendentes | Operação de curadoria | Lista participações pendentes | HIST-ROUND-004, HIST-IMG-004 | Alta |
| HIST-EVAL-002 | Ver resposta + imagem com segurança | Avaliar com contexto | Exibe dados via acesso autorizado | HIST-EVAL-001 | Alta |
| HIST-EVAL-003 | Aprovar/rejeitar (com motivo) | Decisão humana | Decisão registrada; motivo ao rejeitar | HIST-EVAL-002; motivo `HIPÓTESE` | Alta |

## Épico 8 — Pontuação e ranking (`SCORE`)

| Código | Descrição | Valor | Critérios de aceitação | Dependências | Prioridade |
| ------ | --------- | ----- | ---------------------- | ------------ | ---------- |
| HIST-SCORE-001 | Conceder pontos ao aprovar | Recompensa | Só aprovadas geram pontos (transação) | HIST-EVAL-003; regra `PENDENTE` | Alta |
| HIST-SCORE-002 | Ranking ordenado | Engajamento | Ordena por pontuação validada | HIST-SCORE-001 | Alta |
| HIST-SCORE-003 | Desempate | Justiça | Aplica critério definido | Critério `PENDENTE` | Média |

## Épico 9 — Segurança e privacidade (`SEC`)

| Código | Descrição | Valor | Critérios de aceitação | Dependências | Prioridade |
| ------ | --------- | ----- | ---------------------- | ------------ | ---------- |
| HIST-SEC-001 | Consentimento (responsável) | Conformidade LGPD | Consentimento registrado e revogável | Consentimento `PENDENTE` | Alta |
| HIST-SEC-002 | Retenção e exclusão de imagens | Conformidade | Política aplicada; exclusão remove objeto | Prazos `PENDENTE` | Média |
| HIST-SEC-003 | Auditoria administrativa | Rastreabilidade | Ações relevantes registradas (imutável) | HIST-AUTH-002; `HIPÓTESE` | Média |

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
| HIST-QA-014 | Resolver o pacote de decisões do MVP | Destravar o modelo físico e o início do jogador | Orquestrador responde o formulário de [13 — Pacote de decisões do MVP](13-pacote-decisoes-mvp.md) (DEC-001, DEC-002/018, DEC-003, DEC-004, DEC-008, DEC-009, DEC-010); itens jurídicos encaminhados a revisão; regras aprovadas viram `CONFIRMADO`/ADR | **Decisão do orquestrador** `PENDENTE`; revisão jurídica p/ DEC-002/018/010/017 | Alta (futura — **não concluída**) |

## Épico 11 — Implantação (`DEPLOY`)

| Código | Descrição | Valor | Critérios de aceitação | Dependências | Prioridade |
| ------ | --------- | ----- | ---------------------- | ------------ | ---------- |
| HIST-DEPLOY-001 | Pipeline de deploy | Entrega contínua | Deploy automatizado por ambiente | Hospedagem `PENDENTE` | Média |
| HIST-DEPLOY-002 | Configuração de armazenamento de objetos | Imagens em produção | Bucket privado configurado | Provedor `PENDENTE` | Média |

## Referências cruzadas

- [Escopo e requisitos](01-escopo-e-requisitos.md)
- [Decisões pendentes](12-decisoes-pendentes.md)
