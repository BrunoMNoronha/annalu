# 02 — Regras de negócio

> Cada regra é marcada como **CONFIRMADO** (derivada do briefing) ou
> **HIPÓTESE** (proposta a validar). Decisões em aberto estão em
> [decisões pendentes](12-decisoes-pendentes.md).
> Código: `RN-<AREA>-NNN`.

## Palavra (`RN-PAL`)

| Código | Regra | Status |
| ------ | ----- | ------ |
| RN-PAL-001 | Toda palavra pertence ao acervo de conteúdo gerenciado pelo administrador. | CONFIRMADO |
| RN-PAL-002 | Uma palavra pode ter uma ou mais charadas associadas. | HIPÓTESE |
| RN-PAL-003 | Uma palavra pode ser ativada/desativada; desativada não entra em sorteios. | HIPÓTESE |
| RN-PAL-004 | Palavras devem ser apropriadas para crianças (curadoria do administrador). | CONFIRMADO |

## Charada (`RN-CHA`)

| Código | Regra | Status |
| ------ | ----- | ------ |
| RN-CHA-001 | Toda charada está associada a exatamente uma palavra. | HIPÓTESE |
| RN-CHA-002 | Uma charada possui um enunciado textual. | CONFIRMADO |
| RN-CHA-003 | Uma charada possui pelo menos uma resposta aceita. | CONFIRMADO |
| RN-CHA-004 | Só charadas ativas (com palavra ativa) entram no sorteio. | HIPÓTESE |

## Resposta aceita (`RN-RES`)

| Código | Regra | Status |
| ------ | ----- | ------ |
| RN-RES-001 | Cada charada tem uma ou mais respostas aceitas. | HIPÓTESE (múltiplas respostas `PENDENTE`) |
| RN-RES-002 | A comparação textual da resposta ignora diferenças de caixa e espaços extras. | HIPÓTESE |
| RN-RES-003 | A comparação textual pode ignorar acentuação (normalização). | HIPÓTESE |
| RN-RES-004 | A correção textual **não decide sozinha** a aprovação; a decisão final é humana. | CONFIRMADO |

## Rodada / Sessão (`RN-ROD`)

| Código | Regra | Status |
| ------ | ----- | ------ |
| RN-ROD-001 | Uma rodada contém a quantidade de desafios definida na configuração vigente. | CONFIRMADO |
| RN-ROD-002 | Uma rodada possui um tempo limite configurado. | CONFIRMADO |
| RN-ROD-003 | Os desafios de uma rodada são selecionados aleatoriamente. | CONFIRMADO |
| RN-ROD-004 | A rodada guarda a configuração usada em sua criação (para auditoria e pontuação). | HIPÓTESE |
| RN-ROD-005 | Uma rodada pertence a um jogador. | HIPÓTESE (identificação da criança `PENDENTE`) |

## Seleção aleatória (`RN-SEL`)

| Código | Regra | Status |
| ------ | ----- | ------ |
| RN-SEL-001 | O sorteio escolhe desafios do acervo ativo. | CONFIRMADO |
| RN-SEL-002 | Dentro de uma mesma rodada, não se repetem charadas. | HIPÓTESE |
| RN-SEL-003 | Se o acervo ativo for menor que a quantidade pedida, o comportamento é definido (erro ou rodada menor). | PENDENTE |

## Tempo limite (`RN-TMP`)

| Código | Regra | Status |
| ------ | ----- | ------ |
| RN-TMP-001 | O tempo limite vale para a sessão como um todo. | CONFIRMADO |
| RN-TMP-002 | Ao expirar o tempo, a rodada é encerrada. | HIPÓTESE |
| RN-TMP-003 | Comportamento das respostas não enviadas ao expirar (perdidas, salvas parciais, enviadas automaticamente) é definido. | PENDENTE |

## Fotografia (`RN-FOT`)

| Código | Regra | Status |
| ------ | ----- | ------ |
| RN-FOT-001 | A resposta pode incluir uma fotografia que represente a resposta. | CONFIRMADO |
| RN-FOT-002 | Nesta versão, a fotografia **não** é analisada automaticamente. | CONFIRMADO |
| RN-FOT-003 | A obrigatoriedade da fotografia para envio é definida. | PENDENTE |
| RN-FOT-004 | Fotografias são armazenadas de forma privada. | CONFIRMADO |
| RN-FOT-005 | Tipos e tamanho de arquivo são validados. | CONFIRMADO |

## Avaliação (`RN-AVA`)

| Código | Regra | Status |
| ------ | ----- | ------ |
| RN-AVA-001 | Toda participação enviada aguarda avaliação humana. | CONFIRMADO |
| RN-AVA-002 | Um administrador aprova ou rejeita a participação. | CONFIRMADO |
| RN-AVA-003 | A avaliação considera resposta textual **e** fotografia. | CONFIRMADO |
| RN-AVA-004 | A decisão registra quem avaliou e quando. | HIPÓTESE |
| RN-AVA-005 | Uma participação avaliada não é reavaliada, salvo processo explícito de revisão. | HIPÓTESE |

## Pontuação (`RN-PON`)

| Código | Regra | Status |
| ------ | ----- | ------ |
| RN-PON-001 | Somente participações **aprovadas** geram pontos. | CONFIRMADO |
| RN-PON-002 | Participações rejeitadas geram zero ponto. | CONFIRMADO |
| RN-PON-003 | A fórmula exata de pontos (fixa, por tempo, por dificuldade) é definida. | PENDENTE |
| RN-PON-004 | Cada concessão de pontos é registrada de forma rastreável (transação). | HIPÓTESE |

## Ranking (`RN-RNK`)

| Código | Regra | Status |
| ------ | ----- | ------ |
| RN-RNK-001 | O ranking soma apenas pontuação validada (aprovada). | CONFIRMADO |
| RN-RNK-002 | O ranking é ordenado por pontuação decrescente. | CONFIRMADO |
| RN-RNK-003 | O critério de desempate é definido. | PENDENTE |

## Cancelamento (`RN-CAN`)

| Código | Regra | Status |
| ------ | ----- | ------ |
| RN-CAN-001 | Uma rodada pode ser cancelada/abandonada antes do envio. | HIPÓTESE |
| RN-CAN-002 | Rodada cancelada não gera pontos. | HIPÓTESE |

## Expiração (`RN-EXP`)

| Código | Regra | Status |
| ------ | ----- | ------ |
| RN-EXP-001 | Uma rodada expira ao atingir o tempo limite. | HIPÓTESE |
| RN-EXP-002 | Participações não avaliadas não expiram automaticamente (dependem do administrador). | HIPÓTESE |

## Auditoria administrativa (`RN-AUD`)

| Código | Regra | Status |
| ------ | ----- | ------ |
| RN-AUD-001 | Ações relevantes do administrador (criar/editar conteúdo, avaliar) são registradas. | HIPÓTESE |
| RN-AUD-002 | O log de auditoria é imutável e retém autor, ação, alvo e data. | HIPÓTESE |

## Referências cruzadas

- [Fluxos do sistema](04-fluxos-do-sistema.md) — estados de rodada/resposta/avaliação.
- [Modelo de domínio](05-modelo-de-dominio.md)
- [Decisões pendentes](12-decisoes-pendentes.md)
