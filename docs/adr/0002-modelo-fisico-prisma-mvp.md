# 0002 — Modelo físico Prisma do MVP

- **Status:** Proposta
- **Data:** 2026-08-06
- **Decisores:** (pendente — aguarda revisão do orquestrador no PR)
- **Substitui:** —
- **Substituída por:** —
- **Relacionadas:** [ADR 0001](0001-arquitetura-web-integrada.md),
  [pacote de decisões](../13-pacote-decisoes-mvp.md),
  [modelo físico](../14-modelo-fisico-prisma.md).

## Contexto

Com as decisões de produto registradas (PR #15), o MVP precisa de um **modelo
físico relacional** em PostgreSQL/Prisma que suporte identidade da criança,
responsável/consentimento, conteúdo, rodada com snapshots, avaliação por eventos,
pontuação idempotente e auditoria — preservando pendências jurídicas (DEC-002,
DEC-010, DEC-017, DEC-018) e sem implementar APIs/serviços.

## Alternativas avaliadas

1. **Modelo relacional normalizado** (escolhido) — entidades e relações próprias,
   constraints no banco. Prós: integridade forte, consultas simples, evolução
   clara. Contras: mais tabelas.
2. **Campos JSON/array** para respostas aceitas, eventos ou snapshots. Prós:
   menos tabelas. Contras: perde integridade referencial e unicidade; dificulta
   consulta/índice; **rejeitado** (decisão de produto exige relações 1:N).
3. **Ranking materializado** (tabela/materialized view). Prós: leitura rápida.
   Contras: sincronização e risco de divergência; **rejeitado** no MVP —
   ranking é **projeção derivada** da soma de `ScoreTransaction`.
4. **Avaliação sobrescrita** (um registro mutável) **vs. eventos append-only**
   (escolhido). Sobrescrita perde histórico e quebra idempotência/auditoria; os
   **eventos** dão trilha imutável e chave de idempotência por evento.
5. **Identidade adulta no próprio perfil** vs. **tabela `AuthIdentity` separada**
   (escolhido). Separar mantvém tokens fora do domínio, permite múltiplos
   provedores e não acopla autenticação ao perfil.

## Decisão (proposta)

Adotar o **modelo relacional normalizado** com: PK UUID; `snake_case` via map;
timestamps `timestamptz`; append-only sem `updatedAt`; **avaliação por eventos**
(`Evaluation 0:N EvaluationEvent`); **idempotência por `evaluationEventId`**;
**ranking derivado** (sem tabela); **`AuthIdentity` separada** com "exatamente um
proprietário"; snapshots obrigatórios na rodada; constraints/índices conforme
[docs/14](../14-modelo-fisico-prisma.md). Migration inicial + seed fictício
idempotente + testes de contrato e integração; CI com PostgreSQL descartável.

## Justificativa

Integridade garantida pelo banco onde possível; regras que atravessam tabelas
ficam explícitas como invariantes de serviço; privacidade por design (sem
PII da criança, sem tokens, sem URL pública, sem prazo de retenção).

## Consequências positivas

- Base sólida e testável para os casos de uso; histórico de avaliação e
  pontuação auditável; ranking sempre consistente com a soma.

## Consequências negativas / trade-offs

- Mais tabelas e joins; algumas regras críticas dependem de serviço
  transacional (não do banco).

## Riscos

- Invariantes de serviço não garantidas pelo banco podem ser violadas se um
  caso de uso for mal implementado (mitigado por testes futuros dos serviços).
- Baseline PostgreSQL do CI pode divergir do provedor de produção (DEC-014).

## Limitações

- Migration/integração validadas apenas no CI (sem Docker local nesta execução).

## Itens jurídicos

DEC-002, DEC-010, DEC-017, DEC-018 permanecem pendentes de revisão jurídica; o
modelo dá suporte técnico sem afirmar validade legal. **Não** define prazo de
retenção nem faixa etária.

## Status

`Proposta` — **não** marcar como `Aceita` antes do merge e da revisão do
orquestrador.
