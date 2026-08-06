# Architecture Decision Records (ADR)

Este diretório guarda as **decisões arquiteturais** do projeto **Annalú e os
Tesouros Escondidos**. Uma ADR documenta uma decisão relevante, seu contexto e
suas consequências, de forma imutável no tempo.

> A primeira decisão arquitetural já foi registrada em
> [0001-arquitetura-web-integrada.md](0001-arquitetura-web-integrada.md) (status
> `Aceita`). Só registre uma ADR com status `Aceita` após autorização explícita
> do orquestrador. Escolhas ainda não aprovadas permanecem em
> [../12-decisoes-pendentes.md](../12-decisoes-pendentes.md).

## Quando criar uma ADR

Crie uma ADR quando a decisão:

- afeta a estrutura do sistema (framework, banco, armazenamento, hospedagem);
- é custosa de reverter;
- estabelece um padrão que outros agentes devem seguir;
- resolve um item de [decisões pendentes](../12-decisoes-pendentes.md).

Decisões pequenas e locais **não** precisam de ADR.

## Como registrar

1. Copie o modelo abaixo para um novo arquivo neste diretório.
2. Nomeie como `NNNN-titulo-curto.md`, com número sequencial de 4 dígitos
   (ex.: `0001-escolha-de-framework.md`).
3. Preencha todos os campos.
4. Comece com status `Proposta`; mude para `Aceita` somente após autorização.
5. Ao aprovar, atualize os documentos relacionados e remova/resolva o item
   correspondente em [decisões pendentes](../12-decisoes-pendentes.md).
6. ADRs são **imutáveis** após aprovadas: para mudar uma decisão, crie uma nova
   ADR que **substitua** (supersede) a anterior, ajustando os status.

## Status possíveis

- `Proposta` — em discussão, ainda não aprovada.
- `Aceita` — decisão aprovada e vigente.
- `Rejeitada` — considerada e descartada.
- `Substituída` — superada por outra ADR (referenciar a substituta).

## Índice de ADRs

| Número | Título | Status | Data |
| ------ | ------ | ------ | ---- |
| [0001](0001-arquitetura-web-integrada.md) | Arquitetura web integrada | Aceita | 2026-08-05 |

## Modelo de ADR

```markdown
# NNNN — Título da decisão

- **Status:** Proposta | Aceita | Rejeitada | Substituída
- **Data:** AAAA-MM-DD
- **Decisores:** (quem aprovou)
- **Substitui:** (ADR anterior, se houver)
- **Substituída por:** (ADR posterior, se houver)

## Contexto

Qual problema ou necessidade motiva a decisão? Quais restrições existem?
Referencie documentos e itens de decisões pendentes relacionados.

## Opções consideradas

1. Opção A — resumo, prós e contras.
2. Opção B — resumo, prós e contras.

## Decisão

Qual opção foi escolhida e por quê.

## Consequências

- Positivas:
- Negativas / trade-offs:
- Impactos em outros documentos (requisitos, modelo de dados, testes):
```

## Referências cruzadas

- [Opções de arquitetura](../06-opcoes-de-arquitetura.md)
- [Decisões pendentes](../12-decisoes-pendentes.md)
