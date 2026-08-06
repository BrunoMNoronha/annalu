# 0001 — Arquitetura web integrada

- **Status:** Aceita
- **Data:** 2026-08-05
- **Decisores:** Orquestrador do projeto (autorização explícita no prompt da tarefa)
- **Substitui:** —
- **Substituída por:** —
- **Decisões relacionadas:** resolve [DEC-011](../12-decisoes-pendentes.md)
  (framework), [DEC-012](../12-decisoes-pendentes.md) (provedor de banco) e
  [DEC-013](../12-decisoes-pendentes.md) (provedor de armazenamento, na forma de
  abstração compatível com S3).

## Contexto

O projeto **Annalú e os Tesouros Escondidos** é um jogo web *mobile first* para
crianças, com charadas, envio de fotografia e **avaliação humana**. A fundação
documental (ver [../06-opcoes-de-arquitetura.md](../06-opcoes-de-arquitetura.md))
comparou duas abordagens: (A) aplicação integrada full-stack e (B) frontend e
backend separados.

Esta ADR formaliza a **escolha da arquitetura** para a primeira versão,
permitindo iniciar a fundação técnica de forma consistente e continuável por
diferentes agentes.

## Requisitos determinantes

- Web **mobile first** com uso de câmera e upload de imagens
  (ver [../09-experiencia-mobile.md](../09-experiencia-mobile.md)).
- Armazenamento **privado** de imagens com acesso autorizado
  (ver [../08-seguranca-e-privacidade.md](../08-seguranca-e-privacidade.md), `RF-IMG-002`, `RF-IMG-006`).
- Regras de negócio, API e interface no **mesmo repositório**, com separação
  lógica entre apresentação, domínio e infraestrutura.
- **Facilidade de continuidade por agentes de IA**: convenções previsíveis e
  menor superfície de integração.
- Conformidade com privacidade (LGPD) e **separação de ambientes** (`RNF-SEG-004`).
- Custo operacional baixo para o MVP.

## Alternativas avaliadas

1. **Alternativa A — Solução integrada (escolhida).**
   Next.js (App Router) + TypeScript + PostgreSQL + Prisma + armazenamento de
   objetos compatível com S3 (via abstração interna) + rotas de API no mesmo
   projeto. Prós: menor complexidade, MVP mais rápido, forte experiência mobile,
   alta afinidade com agentes de IA. Contras: acoplamento entre UI e backend;
   escalabilidade da API atrelada ao app.
2. **Alternativa B — Frontend e backend separados.**
   SPA React (Vite) + API Node.js dedicada + PostgreSQL + ORM + armazenamento de
   objetos. Prós: desacoplamento, API reutilizável. Contras: dois projetos e
   pipelines, mais configuração e código de integração, maior carga de contexto
   por tarefa para agentes.

Detalhamento completo dos critérios em
[../06-opcoes-de-arquitetura.md](../06-opcoes-de-arquitetura.md).

## Decisão

Adotar a **Alternativa A — arquitetura web integrada**, com a seguinte pilha
tecnológica (versões estáveis, sem beta/RC/experimental/canary; as versões
efetivamente instaladas são registradas no relatório da tarefa e no
`package.json`):

- **Linguagem:** TypeScript (modo estrito).
- **Framework:** Next.js estável, com **App Router**.
- **Banco de dados:** PostgreSQL.
- **ORM:** Prisma.
- **Armazenamento de objetos:** compatível com S3, acessado por **abstração
  interna** (nenhum provedor específico é fixado por esta ADR).
- **Validação de contratos/config:** Zod.
- **Gerenciador de pacotes:** pnpm.
- **Testes unitários:** Vitest.
- **Testes de componentes:** Testing Library.
- **Testes de fluxo (e2e):** Playwright (previsto para etapa posterior).
- **Lint:** ESLint.
- **CI:** GitHub Actions.
- **Organização:** arquitetura **modular** dentro de uma única aplicação, com
  separação entre apresentação, domínio, casos de uso, infraestrutura e
  contratos compartilhados.

## Justificativa

A arquitetura integrada foi escolhida para:

- reduzir a complexidade inicial;
- permitir entrega incremental;
- facilitar a continuidade por agentes diferentes;
- manter frontend, API e regras de negócio no mesmo repositório;
- preservar a separação lógica entre interface, domínio e infraestrutura;
- reduzir custos operacionais do MVP;
- permitir a extração futura de serviços sem exigir essa complexidade agora.

## Consequências positivas

- Um único repositório, pipeline e deploy → menos sobrecarga operacional.
- Experiência mobile forte com esforço menor (SSR/streaming, otimização de
  imagem).
- Convenções previsíveis reduzem ambiguidade para agentes de IA.
- Evolução preservada: serviços podem ser extraídos depois, se necessário.

## Consequências negativas

- Acoplamento entre UI e backend exige **disciplina de camadas** para não
  erodir a separação lógica.
- Escalabilidade da API fica inicialmente atrelada ao app.
- Dependência do ecossistema Next.js/Prisma.

## Riscos

- **Erosão de fronteiras** entre apresentação, domínio e infraestrutura ao longo
  do tempo.
- **Acoplamento a fornecedor** (framework/ORM) dificultando trocas futuras.
- **Custo de migração** caso a extração de serviços se torne necessária mais
  cedo do que o previsto.

## Medidas de mitigação

- Estrutura modular explícita (`src/modules`, `src/server`,
  `src/infrastructure`, `src/shared`) com dependências apontando para o domínio.
- Acesso a armazenamento por **abstração interna**, isolando o provedor S3.
- Contratos validados com **Zod** nas fronteiras (config, entrada de API).
- Verificações automatizadas em CI (lint, tipos, testes, build) para preservar a
  qualidade e as fronteiras.

## Itens deliberadamente adiados

Esta ADR **não** decide (permanecem em
[../12-decisoes-pendentes.md](../12-decisoes-pendentes.md)):

- **Provedor de armazenamento** específico (DEC-013 fixa apenas "compatível com
  S3 via abstração"; o provedor concreto segue pendente).
- **Hospedagem** (DEC-014) e **PWA** (DEC-015).
- Decisões de **negócio**: identificação da criança (DEC-001), cadastro/
  consentimento do responsável (DEC-002, DEC-018), fórmula de pontuação
  (DEC-003), critérios de desempate (DEC-004), múltiplas respostas/charadas
  (DEC-005, DEC-006), pular charada (DEC-008), comportamento completo de rodada
  expirada (DEC-009), retenção de fotografias (DEC-010), faixa etária (DEC-017),
  moderação adicional (DEC-016).
- **Modelo físico definitivo** do domínio no Prisma (adiado por depender das
  decisões de negócio acima).
- Interpretação jurídica definitiva da **LGPD** (revisão jurídica futura).

> Nota de negócio confirmada pelo prompt (não decidida por esta ADR): a
> **fotografia é obrigatória** na primeira versão; e o término do tempo deve
> **preservar o que já estiver salvo** (demais comportamentos de expiração
> seguem pendentes em DEC-009).

## Impactos em outros documentos

- [../06-opcoes-de-arquitetura.md](../06-opcoes-de-arquitetura.md): recomendação
  promovida a decisão aceita.
- [../12-decisoes-pendentes.md](../12-decisoes-pendentes.md): DEC-011, DEC-012 e
  DEC-013 resolvidos (referenciando esta ADR).
- [../11-backlog-inicial.md](../11-backlog-inicial.md): HIST-FUND-001 concluída.
- [../../README.md](../../README.md): estado atual atualizado.
