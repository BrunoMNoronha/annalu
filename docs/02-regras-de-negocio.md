# 02 — Regras de negócio

> Cada regra é marcada como **CONFIRMADO** (derivada do briefing) ou
> **HIPÓTESE** (proposta a validar). Decisões em aberto estão em
> [decisões pendentes](12-decisoes-pendentes.md).
> Código: `RN-<AREA>-NNN`.

## Palavra (`RN-PAL`)

| Código | Regra | Status |
| ------ | ----- | ------ |
| RN-PAL-001 | Toda palavra pertence ao acervo de conteúdo gerenciado pelo administrador. | CONFIRMADO |
| RN-PAL-002 | Uma palavra pode possuir **uma ou mais** charadas (relação **1:N**, DEC-006). | CONFIRMADO |
| RN-PAL-003 | Uma palavra pode ser ativada/desativada; desativada não entra em sorteios. | HIPÓTESE |
| RN-PAL-004 | Palavras devem ser apropriadas para crianças (curadoria do administrador). | CONFIRMADO |

## Charada (`RN-CHA`)

| Código | Regra | Status |
| ------ | ----- | ------ |
| RN-CHA-001 | Toda charada pertence a **exatamente uma** palavra. | CONFIRMADO |
| RN-CHA-002 | Uma charada possui um enunciado textual. | CONFIRMADO |
| RN-CHA-003 | Uma charada possui pelo menos uma resposta aceita. | CONFIRMADO |
| RN-CHA-004 | Só charadas ativas (com palavra ativa) entram no sorteio. | HIPÓTESE |

## Resposta aceita (`RN-RES`)

| Código | Regra | Status |
| ------ | ----- | ------ |
| RN-RES-001 | Cada charada possui **uma ou mais** respostas aceitas (relação **1:N**, DEC-005). | CONFIRMADO |
| RN-RES-002 | A comparação textual da resposta ignora diferenças de caixa e espaços extras. | HIPÓTESE |
| RN-RES-003 | A comparação textual pode ignorar acentuação (normalização). | HIPÓTESE |
| RN-RES-004 | A correção textual **não decide sozinha** a aprovação; a decisão final é humana. | CONFIRMADO |

## Rodada / Sessão (`RN-ROD`)

| Código | Regra | Status |
| ------ | ----- | ------ |
| RN-ROD-001 | Uma rodada contém a quantidade de desafios definida na configuração vigente. | CONFIRMADO |
| RN-ROD-002 | Uma rodada possui um tempo limite configurado. | CONFIRMADO |
| RN-ROD-003 | Os desafios de uma rodada são selecionados aleatoriamente. | CONFIRMADO |
| RN-ROD-004 | A rodada preserva, na criação, um **snapshot** de: **pontos por aprovação**, **tolerância de upload** (`upload_grace_seconds`), **quantidade de desafios** e **tempo limite**. Outros detalhes de versionamento de configuração podem evoluir. | CONFIRMADO |
| RN-ROD-005 | Uma rodada pertence a um **jogador identificado** (apelido + código; UUID interno). | CONFIRMADO |

## Seleção aleatória (`RN-SEL`)

| Código | Regra | Status |
| ------ | ----- | ------ |
| RN-SEL-001 | O sorteio escolhe desafios do acervo ativo. | CONFIRMADO |
| RN-SEL-002 | Dentro de uma mesma rodada, não se repetem charadas. | HIPÓTESE |
| RN-SEL-003 | Se o acervo ativo for menor que a quantidade pedida, o comportamento é definido (erro ou rodada menor). | PENDENTE |

> **Implementação provisória (fatia de rodada — `src/modules/round`):** o sorteio
> considera **elegível** a charada ativa (de palavra ativa) com **ao menos uma
> resposta aceita** (RN-CHA-003) e seleciona **sem reposição**, o que satisfaz
> RN-SEL-002 como **consequência técnica** — a regra permanece **HIPÓTESE**, não
> promovida a CONFIRMADO. Para **RN-SEL-003** (PENDENTE), adota-se apenas uma
> **HIPÓTESE técnica reversível**: acervo elegível menor que `challengesPerRound`
> faz a criação **falhar antes de persistir** (`InsufficientActiveContentError`),
> sem rodada parcial. Isso **não** decide o produto (erro vs. rodada menor) — a
> decisão definitiva de RN-SEL-003 segue em aberto.

## Tempo limite (`RN-TMP`)

| Código | Regra | Status |
| ------ | ----- | ------ |
| RN-TMP-001 | O tempo limite vale para a sessão como um todo. | CONFIRMADO |
| RN-TMP-002 | A rodada **encerra/expira** ao atingir o limite de tempo, sendo o **servidor a autoridade do tempo**. | CONFIRMADO |
| RN-TMP-003 | Ao expirar, **o que já foi salvo deve ser preservado** (regra do briefing). | CONFIRMADO |
| RN-TMP-004 | O **destino** das respostas ao expirar está definido nas regras de expiração — ver **`RN-EXP-001` a `RN-EXP-005`** e [DEC-009](13-pacote-decisoes-mvp.md#dec-009--comportamento-ao-expirar-a-rodada). | CONFIRMADO |

## Fotografia (`RN-FOT`)

| Código | Regra | Status |
| ------ | ----- | ------ |
| RN-FOT-001 | Um **rascunho** pode temporariamente não possuir fotografia; uma **participação enviada deve possuir exatamente uma fotografia válida** no MVP. A imagem pode ser **substituída antes do envio**; após o envio, a substituição **não** é permitida sem processo administrativo explícito futuro. | CONFIRMADO |
| RN-FOT-002 | Nesta versão, a fotografia **não** é analisada automaticamente. | CONFIRMADO |
| RN-FOT-003 | A fotografia é **obrigatória para o envio** de uma participação na primeira versão. Uma resposta pode existir como **rascunho sem imagem**, mas **não pode ser enviada** para avaliação sem uma fotografia válida. (Opção futura de foto facultativa **não** aprovada.) | CONFIRMADO |
| RN-FOT-004 | Fotografias são armazenadas de forma privada. | CONFIRMADO |
| RN-FOT-005 | Tipos e tamanho de arquivo são validados. | CONFIRMADO |

## Avaliação (`RN-AVA`)

| Código | Regra | Status |
| ------ | ----- | ------ |
| RN-AVA-001 | Toda participação enviada aguarda avaliação humana. | CONFIRMADO |
| RN-AVA-002 | Um administrador aprova ou rejeita a participação. | CONFIRMADO |
| RN-AVA-003 | A avaliação considera resposta textual **e** fotografia. | CONFIRMADO |
| RN-AVA-004 | Uma participação possui **no máximo uma** `Evaluation` (agregado), cujo **estado atual deriva do histórico de eventos**. | CONFIRMADO |
| RN-AVA-005 | A **decisão inicial e toda alteração** registram **administrador e data** e produzem um **`EvaluationEvent` append-only** (tipos: decisão inicial, revisão, correção). | CONFIRMADO |
| RN-AVA-006 | Eventos anteriores **nunca** são sobrescritos ou apagados; formam a trilha auditável. | CONFIRMADO |
| RN-AVA-007 | As permissões exatas para solicitar/realizar revisão podem evoluir. | HIPÓTESE |

## Pontuação (`RN-PON`)

| Código | Regra | Status |
| ------ | ----- | ------ |
| RN-PON-001 | Somente participações **aprovadas** geram pontos. | CONFIRMADO |
| RN-PON-002 | Participações rejeitadas geram zero ponto. | CONFIRMADO |
| RN-PON-003 | **Pontos fixos por resposta aprovada** — padrão do MVP **10**, **configurável**; a rodada guarda uma **cópia (snapshot)** do valor vigente na criação. **Sem** tempo, velocidade ou dificuldade no MVP. Ver [DEC-003](13-pacote-decisoes-mvp.md). | CONFIRMADO |
| RN-PON-004 | Cada efeito de pontuação é uma **transação** que referencia um **`evaluation_event_id`**; este é a **chave de idempotência**: um evento produz **no máximo uma** transação. | CONFIRMADO |
| RN-PON-005 | Efeitos por tipo de evento: **aprovação inicial** `+points_per_approval`; **reversão** (aprovada→rejeitada) `-points_per_approval`; **nova aprovação** posterior `+points_per_approval`; **rejeição inicial** **não** produz transação. | CONFIRMADO |
| RN-PON-006 | Transações **nunca** são alteradas nem excluídas; o total (e o ranking) derivam da **soma** das transações positivas e negativas. | CONFIRMADO |

## Ranking (`RN-RNK`)

| Código | Regra | Status |
| ------ | ----- | ------ |
| RN-RNK-001 | O ranking soma apenas pontuação validada (aprovada). | CONFIRMADO |
| RN-RNK-002 | O ranking é ordenado por pontuação decrescente. | CONFIRMADO |
| RN-RNK-003 | **Ranking denso:** jogadores com o mesmo total **compartilham a mesma posição** (1º, 1º, 2º). **Não** usar horário de avaliação, tempo de rodada, nº de rejeições ou ordem de cadastro como vantagem competitiva. Ver [DEC-004](13-pacote-decisoes-mvp.md). | CONFIRMADO |
| RN-RNK-004 | Para paginação determinística, empatados são ordenados **tecnicamente por UUID interno**, o que **não altera a posição competitiva exibida**. | CONFIRMADO |

## Cancelamento (`RN-CAN`)

| Código | Regra | Status |
| ------ | ----- | ------ |
| RN-CAN-001 | Uma rodada pode ser cancelada/abandonada antes do envio. | HIPÓTESE |
| RN-CAN-002 | Rodada cancelada não gera pontos. | HIPÓTESE |

## Pular desafio (`RN-PUL`)

| Código | Regra | Status |
| ------ | ----- | ------ |
| RN-PUL-001 | A criança pode **pular** qualquer desafio ainda não enviado; sem pontuação negativa e **sem** troca por outra charada. | CONFIRMADO |
| RN-PUL-002 | Um desafio pulado fica no estado **`pulado`**, **não** entra em avaliação e **não** gera transação de pontos. | CONFIRMADO |
| RN-PUL-003 | Texto digitado antes de pular é **preservado** (rascunho/histórico); fotografia iniciada é **cancelada/removida com segurança**. **Não** é possível desfazer o pulo no MVP. | CONFIRMADO |

## Expiração (`RN-EXP`)

| Código | Regra | Status |
| ------ | ----- | ------ |
| RN-EXP-001 | Uma rodada expira ao atingir o tempo limite (servidor é a autoridade do tempo). | CONFIRMADO |
| RN-EXP-002 | Ao expirar, **apenas respostas completas** (texto + foto válida confirmada, ainda não enviadas) são **enviadas automaticamente**, uma única vez (idempotente). | CONFIRMADO |
| RN-EXP-003 | Texto sem fotografia vira **histórico somente leitura** (não enviável, não pontua); desafio não iniciado permanece sem resposta. | CONFIRMADO |
| RN-EXP-004 | Upload iniciado antes do prazo só conclui dentro da **tolerância** `upload_grace_seconds` (padrão **60 s**, copiada na rodada); após isso, o **objeto órfão é removido** e a resposta fica incompleta/somente leitura. | CONFIRMADO |
| RN-EXP-005 | Após a expiração não há novos textos/imagens/substituições nem retomada no MVP. | CONFIRMADO |
| RN-EXP-006 | Participações não avaliadas não expiram automaticamente (dependem do administrador). | HIPÓTESE |

## Auditoria administrativa (`RN-AUD`)

| Código | Regra | Status |
| ------ | ----- | ------ |
| RN-AUD-001 | **Alterações de avaliação são auditáveis** — cada `EvaluationEvent` registra **autor, ação (tipo), alvo e data**, de forma imutável. | CONFIRMADO |
| RN-AUD-002 | Logs e auditoria **não** armazenam o **conteúdo da fotografia**. | CONFIRMADO |
| RN-AUD-003 | Auditoria de CRUD de conteúdo (palavras/charadas) é registrada. | HIPÓTESE |

## Referências cruzadas

- [Fluxos do sistema](04-fluxos-do-sistema.md) — estados de rodada/resposta/avaliação.
- [Modelo de domínio](05-modelo-de-dominio.md)
- [Decisões pendentes](12-decisoes-pendentes.md)
