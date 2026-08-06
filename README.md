# Annalú e os Tesouros Escondidos

> ⚠️ **Aviso:** a aplicação está na **fundação técnica**. A arquitetura já foi
> decidida (ver [ADR 0001](docs/adr/0001-arquitetura-web-integrada.md)), mas
> **nenhuma funcionalidade de negócio** (cadastro, rodadas, charadas, upload de
> imagens, avaliação, pontuação, ranking) foi implementada.

## Resumo do produto

**Annalú e os Tesouros Escondidos** é um jogo web *mobile first* voltado para
crianças. A dinâmica central combina charadas com fotografia:

1. Um administrador cadastra palavras e suas charadas.
2. O administrador configura a quantidade de desafios e o tempo limite da rodada.
3. O sistema sorteia desafios aleatoriamente.
4. A criança lê a charada, digita a resposta e captura (ou seleciona) uma
   fotografia que represente a resposta.
5. Resposta e fotografia são enviadas para **avaliação humana**.
6. Um administrador aprova ou rejeita a participação.
7. A pontuação validada atualiza o **ranking**.

Nesta primeira versão **a fotografia não é analisada automaticamente**: toda a
avaliação é feita por uma pessoa administradora.

Exemplo de desafio:

```text
Charada: O que é, o que é? Com a boca para cima fica cheio; com a boca para baixo fica vazio.
Resposta: Copo.
```

## Estado atual

| Item                      | Estado                                                    |
| ------------------------- | -------------------------------------------------------- |
| Documentação de fundação  | Consolidada (commit próprio)                             |
| Arquitetura               | **Decidida** — web integrada ([ADR 0001](docs/adr/0001-arquitetura-web-integrada.md)) |
| Fundação técnica          | Inicializada (Next.js + TypeScript estrito + Prisma)     |
| Modelo de dados físico    | Não iniciado (apenas conceitual; aguarda decisões)       |
| Funcionalidades do jogo   | Não implementadas                                        |

## Stack (ADR 0001)

TypeScript · Next.js (App Router) · PostgreSQL · Prisma · armazenamento
compatível com S3 (via abstração interna) · Zod · pnpm · Vitest · Testing
Library · ESLint · GitHub Actions. Arquitetura modular em uma única aplicação.

## Pré-requisitos

- **Node.js**: versão LTS indicada em [`.nvmrc`](.nvmrc) (Node 22). O runtime de
  desenvolvimento também funciona em versões mais novas compatíveis.
- **pnpm 9** via Corepack (recomendado):

```bash
corepack enable
```

  Caso não seja possível ativar o shim global do `pnpm`, use `corepack pnpm`
  como prefixo dos comandos abaixo.
- **PostgreSQL** (apenas quando o modelo de dados começar a ser usado; não é
  necessário para rodar a fundação atual).

## Instalação

```bash
pnpm install --frozen-lockfile
```

## Configuração de ambiente

Copie o exemplo e ajuste os valores locais:

```bash
cp .env.example .env
```

As variáveis são validadas de forma tipada (Zod) em
[`src/shared/config/env.ts`](src/shared/config/env.ts). Variáveis documentadas:

- `DATABASE_URL` — conexão PostgreSQL (Prisma).
- `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`,
  `S3_SECRET_ACCESS_KEY` — armazenamento privado compatível com S3.
- `LOG_LEVEL` — `debug` | `info` | `warn` | `error`.
- `NEXT_PUBLIC_APP_URL` — URL pública da aplicação.

> ⚠️ **Nunca** commite o arquivo `.env` nem credenciais reais. O `.env.example`
> contém apenas valores **fictícios**.

## Execução local

```bash
pnpm dev
```

Acesse `http://localhost:3000`. Verificação de saúde: `GET /api/health` (retorna
apenas estado e horário do servidor).

## Comandos de validação

| Comando | Descrição |
| ------- | --------- |
| `pnpm lint` | ESLint (via `next lint`). |
| `pnpm typecheck` | Verificação de tipos (`tsc --noEmit`, modo estrito). |
| `pnpm test` / `pnpm test:run` | Testes (Vitest) em modo watch / única execução. |
| `pnpm build` | Build de produção do Next.js. |
| `pnpm smoke:production` | Smoke test de produção (otimização de imagem / `sharp`). |
| `pnpm format:check` / `pnpm format:write` | Prettier (código e configuração). |
| `pnpm docs:check-links` | Verifica links Markdown relativos. |
| `pnpm prisma:validate` / `pnpm prisma:generate` | Valida/gera o Prisma. |
| `pnpm validate` | Agrega format:check + lint + typecheck + testes + links. |

> `pnpm prisma:validate` precisa de `DATABASE_URL` definida (use um valor de
> `.env`); o CI fornece um valor fictício apenas para resolver o `env()` do
> datasource.

## Windows e finais de linha

O repositório padroniza **LF** para arquivos de texto por meio de
[`.gitattributes`](.gitattributes) (`* text=auto eol=lf`); binários (imagens,
fontes) são preservados.

- **Não** é necessário alterar a configuração global do Git (ex.:
  `core.autocrlf`); a regra `eol=lf` do `.gitattributes` prevalece no checkout.
- Checkouts antigos, criados antes da adoção do `.gitattributes`, podem manter
  arquivos já materializados em CRLF. Preserve qualquer trabalho local e
  confirme que `git status` está limpo. A opção recomendada é criar um clone
  novo do repositório. Não use `reset --hard`, `git clean` nem apague arquivos
  rastreados apenas para normalizar finais de linha.
- **`pnpm format:check` é o gate oficial** de formatação (mesmo comando do CI).

## Estrutura resumida

```text
src/
  app/            Apresentação (Next.js App Router): layout, página, /api/health
  components/     Componentes de apresentação sem regra de negócio
  modules/        Módulos de domínio + casos de uso (ex.: system)
  server/         Composição/serviços do lado servidor
  infrastructure/ Prisma e abstração de armazenamento (S3)
  shared/         Config (env), logger estruturado, relógio
prisma/           schema.prisma (datasource + generator; sem modelo de domínio)
scripts/          check-links.mjs (verificação de documentação)
docs/             Documentação do produto e ADRs
.github/workflows CI (GitHub Actions)
```

## Funcionalidades ainda NÃO implementadas

Identificação de criança · cadastro/consentimento de responsável · cadastro de
palavras/charadas · configuração de rodada · seleção aleatória · fluxo da
rodada · **upload real de imagens** · avaliação administrativa · autenticação ·
pontuação · ranking · modelo físico de dados. Ver
[backlog](docs/11-backlog-inicial.md) e
[decisões pendentes](docs/12-decisoes-pendentes.md).

## Documentação

Ordem sugerida de leitura em [`docs/`](docs/):

| # | Documento |
| - | --------- |
| 00 | [Visão do produto](docs/00-visao-do-produto.md) |
| 01 | [Escopo e requisitos](docs/01-escopo-e-requisitos.md) |
| 02 | [Regras de negócio](docs/02-regras-de-negocio.md) |
| 03 | [Personas e jornadas](docs/03-personas-e-jornadas.md) |
| 04 | [Fluxos do sistema](docs/04-fluxos-do-sistema.md) |
| 05 | [Modelo de domínio](docs/05-modelo-de-dominio.md) |
| 06 | [Opções de arquitetura](docs/06-opcoes-de-arquitetura.md) |
| 07 | [Modelo de dados inicial](docs/07-modelo-de-dados-inicial.md) |
| 08 | [Segurança e privacidade](docs/08-seguranca-e-privacidade.md) |
| 09 | [Experiência mobile](docs/09-experiencia-mobile.md) |
| 10 | [Estratégia de testes](docs/10-estrategia-de-testes.md) |
| 11 | [Backlog inicial](docs/11-backlog-inicial.md) |
| 12 | [Decisões pendentes](docs/12-decisoes-pendentes.md) |
|    | [ADR](docs/adr/README.md) · [ADR 0001](docs/adr/0001-arquitetura-web-integrada.md) |

## Como agentes devem iniciar uma tarefa

Antes de qualquer coisa, leia [`AGENTS.md`](AGENTS.md). Em resumo: confirme o
escopo, diferencie fatos confirmados de hipóteses e decisões pendentes, não
invente requisitos, atualize a documentação e respeite as restrições de Git.

## Convenções

- Documentação em **português**, formato **Markdown**, com **links relativos**.
- Marcação explícita de `CONFIRMADO`, `HIPÓTESE` e `PENDENTE`.
- **Nenhuma credencial** deve ser commitada em hipótese alguma.
