# 12 — Decisões pendentes

> Registro central de decisões **em aberto**. Cada item deve ser resolvido com o
> orquestrador e, quando arquitetural, formalizado como
> [ADR](adr/README.md). Enquanto `PENDENTE`, nenhum agente deve tratá-lo como
> aprovado.
> Código: `DEC-NNN`.

| Código | Decisão | Contexto / impacto | Opções conhecidas | Status |
| ------ | ------- | ------------------ | ----------------- | ------ |
| DEC-001 | **Forma de identificação das crianças** | Afeta modelo (`Player`), privacidade e autenticação | Apelido sem cadastro · código gerado · vínculo via responsável | PENDENTE |
| DEC-002 | **Necessidade de cadastro de responsáveis** | Afeta consentimento LGPD e entidade `Guardian` | Obrigatório · opcional · inexistente | PENDENTE |
| DEC-003 | **Regras exatas de pontuação** | Afeta `ScoreTransaction`, ranking e testes | Pontos fixos · por tempo · por dificuldade · combinação | PENDENTE |
| DEC-004 | **Critério de desempate no ranking** | Afeta ordenação do ranking | Tempo total · menos tentativas · data · alfabética | PENDENTE |
| DEC-005 | **Múltiplas respostas aceitas por charada** | Afeta `AcceptedAnswer` e avaliação | Uma resposta · várias respostas | PENDENTE |
| DEC-006 | **Múltiplas charadas por palavra** | Afeta `Word`/`Riddle` e sorteio | Uma charada · várias charadas | PENDENTE |
| DEC-007 | **Obrigatoriedade da fotografia** | Afeta fluxo de envio e validação | Obrigatória · opcional | PENDENTE |
| DEC-008 | **Possibilidade de pular uma charada** | Afeta fluxo e pontuação | Permitir · não permitir · permitir com penalidade | PENDENTE |
| DEC-009 | **Comportamento ao terminar o tempo** | Afeta estados de rodada/resposta | Encerra e descarta pendentes · envia o que houver · salva parcial | PENDENTE |
| DEC-010 | **Retenção das imagens** | Afeta privacidade e custo de storage | Prazo fixo · até exclusão manual · pós-avaliação | PENDENTE |
| DEC-011 | **Framework** | Base da arquitetura | Integrada (Next.js) · separada (React + API Node) | PENDENTE (proposta preliminar: integrada) |
| DEC-012 | **Provedor de banco de dados** | Persistência | PostgreSQL gerenciado · outro relacional | PENDENTE |
| DEC-013 | **Provedor de armazenamento** | Imagens privadas | S3-compatível · outro | PENDENTE |
| DEC-014 | **Hospedagem** | Deploy e custos | Plataforma gerenciada · container self-host | PENDENTE |
| DEC-015 | **PWA** | Instalação/offline/câmera | Sim · não · depois | PENDENTE |
| DEC-016 | **Moderação de conteúdo** | Além da avaliação por rodada | Só humana (atual) · filtros adicionais | PENDENTE |
| DEC-017 | **Limites de idade** | Público e conformidade | Definir faixa etária mínima/máxima | PENDENTE |
| DEC-018 | **Consentimento** | Base legal LGPD | Modelo de consentimento parental · fluxo de revogação | PENDENTE (revisão jurídica futura) |

## Como resolver uma decisão

1. Levar o item ao orquestrador com opções e trade-offs.
2. Registrar a escolha:
   - Se **arquitetural**, criar uma ADR em [adr/](adr/README.md).
   - Se **de produto/regra**, atualizar o documento correspondente
     (requisitos/regras) mudando o status de `PENDENTE`/`HIPÓTESE` para
     `CONFIRMADO`.
3. Remover ou marcar como resolvido o item nesta tabela, referenciando a ADR ou
   o documento atualizado.

## Referências cruzadas

- [Opções de arquitetura](06-opcoes-de-arquitetura.md)
- [Regras de negócio](02-regras-de-negocio.md)
- [Segurança e privacidade](08-seguranca-e-privacidade.md)
- [Guia de ADR](adr/README.md)
