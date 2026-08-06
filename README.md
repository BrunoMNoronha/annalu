# Annalú e os Tesouros Escondidos

> ⚠️ **Aviso:** a aplicação ainda está em **fase de definição**. Nenhum código de
> frontend, backend, banco de dados ou infraestrutura foi implementado. Este
> repositório contém, neste momento, apenas a **fundação documental** que
> orientará a implementação futura.

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

| Item                       | Estado                         |
| -------------------------- | ------------------------------ |
| Documentação de fundação   | Em elaboração / primeira versão |
| Arquitetura definida       | Não (opções em análise)        |
| Framework escolhido        | Não (decisão pendente)         |
| Código de aplicação        | Não iniciado                   |
| Modelo de dados físico     | Não iniciado (apenas conceitual) |

## Estrutura da documentação

Toda a documentação vive em [`docs/`](docs/). Ordem sugerida de leitura:

| # | Documento | Descrição |
| - | --------- | --------- |
| 00 | [Visão do produto](docs/00-visao-do-produto.md) | Problema, proposta de valor, público, escopo |
| 01 | [Escopo e requisitos](docs/01-escopo-e-requisitos.md) | Requisitos funcionais e não funcionais |
| 02 | [Regras de negócio](docs/02-regras-de-negocio.md) | Regras confirmadas e hipóteses |
| 03 | [Personas e jornadas](docs/03-personas-e-jornadas.md) | Atores e fluxos de uso |
| 04 | [Fluxos do sistema](docs/04-fluxos-do-sistema.md) | Diagramas de fluxo e estados |
| 05 | [Modelo de domínio](docs/05-modelo-de-dominio.md) | Entidades e relacionamentos |
| 06 | [Opções de arquitetura](docs/06-opcoes-de-arquitetura.md) | Comparação de alternativas |
| 07 | [Modelo de dados inicial](docs/07-modelo-de-dados-inicial.md) | Modelo conceitual e diagrama ER |
| 08 | [Segurança e privacidade](docs/08-seguranca-e-privacidade.md) | LGPD, crianças, imagens |
| 09 | [Experiência mobile](docs/09-experiencia-mobile.md) | Mobile first, câmera, acessibilidade |
| 10 | [Estratégia de testes](docs/10-estrategia-de-testes.md) | Tipos e escopos de teste |
| 11 | [Backlog inicial](docs/11-backlog-inicial.md) | Épicos e histórias |
| 12 | [Decisões pendentes](docs/12-decisoes-pendentes.md) | O que ainda precisa ser decidido |
|    | [ADR](docs/adr/README.md) | Guia de decisões arquiteturais |

## Como agentes devem iniciar uma tarefa

Antes de qualquer coisa, leia [`AGENTS.md`](AGENTS.md). Em resumo:

1. Leia [`AGENTS.md`](AGENTS.md) e a documentação relevante em [`docs/`](docs/).
2. Confirme o escopo da tarefa recebida e o que está **fora** do escopo.
3. Diferencie **fatos confirmados** de **hipóteses** e **decisões pendentes**.
4. Não invente requisitos como se tivessem sido aprovados.
5. Atualize a documentação quando o entendimento evoluir.
6. Respeite as restrições de Git (ver `AGENTS.md`).
7. Ao concluir, entregue o relatório no formato exigido em `AGENTS.md`.

## Convenções

- Documentação em **português**, formato **Markdown**.
- **Links relativos** entre documentos.
- Marcação explícita de `CONFIRMADO`, `HIPÓTESE` e `PENDENTE`.
