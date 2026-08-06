# 06 — Opções de arquitetura

> ✅ **Decisão tomada.** A **Alternativa A (arquitetura web integrada)** foi
> aceita na ADR [0001](adr/0001-arquitetura-web-integrada.md) (status `Aceita`,
> 2026-08-05). Este documento é mantido como registro comparativo das
> alternativas que embasaram a decisão. Ver
> [decisões pendentes](12-decisoes-pendentes.md) para os itens ainda em aberto.

## Requisitos que a arquitetura deve atender

- Web **mobile first**, uso de câmera/upload de imagens.
- Armazenamento **privado** de imagens com acesso autorizado.
- Painel administrativo com autenticação/autorização por papel.
- Avaliação humana (fila) e ranking.
- Facilidade de manutenção por **agentes de IA** (código coeso, convenções
  claras).
- Conformidade com privacidade (LGPD) e separação de ambientes.

## Alternativa A — Solução integrada (full-stack único)

**Stack de exemplo:** Next.js (App Router) em TypeScript + banco relacional
(PostgreSQL) + ORM (ex.: Prisma ou Drizzle) + armazenamento de objetos
(S3-compatível) + rotas de API integradas ao mesmo projeto.

| Critério | Avaliação |
| -------- | --------- |
| **Vantagens** | Um único repositório e deploy; frontend e API juntos; ótimo SSR/mobile; ecossistema maduro; menos código de integração. |
| **Desvantagens** | Acoplamento entre UI e backend; escalabilidade da API atrelada ao app; pode "esconder" limites de camada. |
| **Complexidade** | Baixa a média — uma stack, um pipeline. |
| **Experiência mobile** | Muito boa — SSR/streaming, otimização de imagem nativa, PWA viável. |
| **Testabilidade** | Boa — unit + integração no mesmo projeto; e2e com Playwright. Limites de camada exigem disciplina. |
| **Segurança** | Boa — middleware de auth, rotas protegidas, uploads via rotas/handlers assinados. |
| **Hospedagem** | Simples em plataformas gerenciadas; também self-host via container. |
| **Custos** | Baixos no início; previsíveis. |
| **Facilidade para agentes de IA** | Alta — convenções fortes e padrão de arquivos bem conhecido reduzem ambiguidade. |
| **Evolução futura** | Boa; pode-se extrair serviços depois se necessário. |

## Alternativa B — Frontend e backend separados

**Stack de exemplo:** SPA em React (Vite) em TypeScript + API Node.js
(ex.: NestJS ou Fastify) + banco relacional (PostgreSQL) + ORM +
armazenamento de objetos (S3-compatível), com contratos de API explícitos.

| Critério | Avaliação |
| -------- | --------- |
| **Vantagens** | Separação clara de responsabilidades; API reutilizável por outros clientes; times/serviços evoluem de forma independente. |
| **Desvantagens** | Dois projetos, dois deploys, mais configuração (CORS, auth, contratos); mais código de "cola". |
| **Complexidade** | Média a alta — duas bases, pipeline duplo, versionamento de contrato. |
| **Experiência mobile** | Boa, mas SSR exige esforço extra; SPA pura pode ter primeiro carregamento mais pesado. |
| **Testabilidade** | Muito boa — camadas isoladas facilitam testes de API e de unidade; e2e cruza os dois. |
| **Segurança** | Boa — fronteira de API explícita; exige cuidado com CORS/tokens. |
| **Hospedagem** | Frontend estático + API em container/serverless; mais peças a orquestrar. |
| **Custos** | Ligeiramente maiores (dois ambientes/deploys). |
| **Facilidade para agentes de IA** | Média — mais superfícies e contratos aumentam a carga de contexto por tarefa. |
| **Evolução futura** | Muito boa — desacoplamento facilita crescer e trocar partes. |

## Comparação resumida

| Critério | A (Integrada) | B (Separada) |
| -------- | :-----------: | :----------: |
| Complexidade inicial | Menor | Maior |
| Velocidade para MVP | Maior | Menor |
| Desacoplamento | Menor | Maior |
| Reuso da API | Menor | Maior |
| Experiência mobile pronta | Maior | Média |
| Facilidade para agentes de IA | Maior | Média |
| Custo inicial | Menor | Maior |

## Temas transversais (independentes da escolha)

- **Linguagem:** TypeScript em todo o stack (`CONFIRMADO` — ADR 0001).
- **Banco:** PostgreSQL com Prisma (`CONFIRMADO` — ADR 0001); **provedor
  gerenciado** concreto ainda `PENDENTE`.
- **Armazenamento de imagens:** objetos privados compatíveis com S3, via
  abstração interna (`CONFIRMADO` — ADR 0001); **provedor concreto** `PENDENTE`.
- **Autenticação administrativa:** por papel; solução `PENDENTE`.
- **PWA:** `PENDENTE` (afeta câmera offline e instalação).

## Decisão (ACEITA — ADR 0001)

> ✅ **DECISÃO ACEITA.** Formalizada na ADR
> [0001-arquitetura-web-integrada.md](adr/0001-arquitetura-web-integrada.md).

Para a primeira versão, foi escolhida a **Alternativa A (solução integrada:
Next.js + App Router + TypeScript + PostgreSQL + Prisma + armazenamento
compatível com S3 via abstração interna)**, porque:

1. Reduz complexidade e acelera o MVP.
2. Entrega experiência mobile forte com menos esforço.
3. É a mais amigável a **agentes de IA**, por convenções previsíveis e menor
   superfície de integração.
4. Preserva evolução: serviços podem ser extraídos depois, se necessário.

Itens ainda em aberto (provedor de armazenamento concreto, hospedagem, PWA)
permanecem em [decisões pendentes](12-decisoes-pendentes.md).

## Referências cruzadas

- [Modelo de dados inicial](07-modelo-de-dados-inicial.md)
- [Segurança e privacidade](08-seguranca-e-privacidade.md)
- [Decisões pendentes](12-decisoes-pendentes.md)
