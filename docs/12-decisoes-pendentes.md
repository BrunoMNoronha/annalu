# 12 — Decisões pendentes

> Registro central de decisões **em aberto**. Cada item deve ser resolvido com o
> orquestrador e, quando arquitetural, formalizado como
> [ADR](adr/README.md). Enquanto `PENDENTE`, nenhum agente deve tratá-lo como
> aprovado.
> Código: `DEC-NNN`.

| Código | Decisão | Contexto / impacto | Opções conhecidas | Status |
| ------ | ------- | ------------------ | ----------------- | ------ |
| DEC-001 | **Forma de identificação das crianças** | Afeta modelo (`Player`), privacidade e autenticação | Apelido sem cadastro · código gerado · vínculo via responsável | ✅ RESOLVIDA — **apelido + código de acesso gerado** (UUID interno; código = credencial secreta). Ver [pacote §DEC-001](13-pacote-decisoes-mvp.md#dec-001--como-a-criança-será-identificada-no-mvp) |
| DEC-002 | **Necessidade de cadastro de responsáveis** | Afeta consentimento LGPD e entidade `Guardian` | Obrigatório · opcional · inexistente | ⚠️ PARCIAL — produto aprovado: **responsável autenticado e persistente antes da 1ª câmera/galeria/upload**; validade do fluxo `DEPENDE DE REVISÃO JURÍDICA`. Ver [pacote](13-pacote-decisoes-mvp.md) |
| DEC-003 | **Regras exatas de pontuação** | Afeta `ScoreTransaction`, ranking e testes | Pontos fixos · por tempo · por dificuldade · combinação | ✅ RESOLVIDA — **pontos fixos por aprovação** (padrão 10, configurável, snapshot; reavaliação = transação compensatória). Ver [pacote](13-pacote-decisoes-mvp.md) |
| DEC-004 | **Critério de desempate no ranking** | Afeta ordenação do ranking | Tempo total · menos tentativas · data · alfabética | ✅ RESOLVIDA — **ranking denso** (empatados compartilham posição; UUID só p/ ordenação técnica; sem horário de avaliação). Ver [pacote](13-pacote-decisoes-mvp.md) |
| DEC-005 | **Múltiplas respostas aceitas por charada** | Afeta `AcceptedAnswer` e avaliação | Uma resposta · várias respostas | ✅ RESOLVIDA PARA MODELAGEM — cardinalidade **1:N** relacional. Ver [pacote](13-pacote-decisoes-mvp.md) |
| DEC-006 | **Múltiplas charadas por palavra** | Afeta `Word`/`Riddle` e sorteio | Uma charada · várias charadas | ✅ RESOLVIDA PARA MODELAGEM — cardinalidade **1:N** relacional. Ver [pacote](13-pacote-decisoes-mvp.md) |
| DEC-007 | **Obrigatoriedade da fotografia** | Afeta fluxo de envio e validação | Obrigatória · opcional | ✅ RESOLVIDA (1ª versão) — **fotografia obrigatória para envio** (rascunho pode existir sem imagem, mas não é enviável sem ela). Ver [RN-FOT-003](02-regras-de-negocio.md). Opção facultativa futura **não** aprovada. |
| DEC-008 | **Possibilidade de pular uma charada** | Afeta fluxo e pontuação | Permitir · não permitir · permitir com penalidade | ✅ RESOLVIDA — **pular com zero ponto, sem troca**; estado `pulado`. Ver [pacote](13-pacote-decisoes-mvp.md) |
| DEC-009 | **Comportamento ao terminar o tempo** | Afeta estados de rodada/resposta | Encerra e descarta pendentes · envia o que houver · salva parcial | ✅ RESOLVIDA — **envia automaticamente só respostas completas**; tolerância de upload 60 s (`upload_grace_seconds`); preserva o já salvo. Ver [pacote](13-pacote-decisoes-mvp.md) |
| DEC-010 | **Retenção das imagens** | Afeta privacidade e custo de storage | Prazo fixo · até exclusão manual · pós-avaliação | ⚠️ PARCIAL — **ciclo técnico aprovado** (`retention_until`, expurgo, auditoria sem imagem); **prazo `DEPENDE DE REVISÃO JURÍDICA`** (bloqueia lançamento com fotos). Ver [pacote](13-pacote-decisoes-mvp.md) |
| DEC-011 | **Framework** | Base da arquitetura | Integrada (Next.js) · separada (React + API Node) | ✅ RESOLVIDA — Integrada (Next.js + App Router). Ver [ADR 0001](adr/0001-arquitetura-web-integrada.md) |
| DEC-012 | **Provedor de banco de dados** | Persistência | PostgreSQL gerenciado · outro relacional | ⚠️ PARCIAL — SGBD definido: **PostgreSQL + Prisma** ([ADR 0001](adr/0001-arquitetura-web-integrada.md)). Provedor gerenciado concreto: PENDENTE |
| DEC-013 | **Provedor de armazenamento** | Imagens privadas | S3-compatível · outro | ⚠️ PARCIAL — **compatível com S3 via abstração interna** definido ([ADR 0001](adr/0001-arquitetura-web-integrada.md)). Provedor concreto: PENDENTE |
| DEC-014 | **Hospedagem** | Deploy e custos | Plataforma gerenciada · container self-host | PENDENTE |
| DEC-015 | **PWA** | Instalação/offline/câmera | Sim · não · depois | PENDENTE |
| DEC-016 | **Moderação de conteúdo** | Além da avaliação por rodada | Só humana (atual) · filtros adicionais | PENDENTE |
| DEC-017 | **Limites de idade** | Público e conformidade | Definir faixa etária mínima/máxima | ⏳ PENDENTE — **`DEPENDE DE REVISÃO JURÍDICA`**. Direção: não coletar nascimento/idade; bloqueio de lançamento (não do modelo físico). Ver [pacote](13-pacote-decisoes-mvp.md) |
| DEC-018 | **Consentimento** | Base legal LGPD | Modelo de consentimento parental · fluxo de revogação | ⚠️ PARCIAL — modelo técnico aprovado: `ConsentRecord` **append-only, versionado, revogável**; texto/base legal/verificação/validade `DEPENDE DE REVISÃO JURÍDICA`. Ver [pacote](13-pacote-decisoes-mvp.md) |

> 📦 **Pacote de decisões do MVP** ([13](13-pacote-decisoes-mvp.md)) — estado
> atual:
> - **Decisões de produto resolvidas** estão registradas: DEC-001, DEC-003,
>   DEC-004, DEC-005, DEC-006, DEC-007, DEC-008, DEC-009.
> - **Decisões parciais** continuam **dependentes do jurídico**: DEC-002 e
>   DEC-018 (consentimento/fluxo do responsável) e DEC-010 (retenção — apenas o
>   **ciclo técnico** está aprovado; **prazo** pendente).
> - **DEC-017** permanece **jurídica** (`DEPENDE DE REVISÃO JURÍDICA`).
> - As **análises e matrizes originais** permanecem no pacote como **histórico**.

## Como resolver uma decisão

1. Levar o item ao orquestrador com opções e trade-offs.
2. Registrar a escolha:
   - Se **arquitetural**, criar uma ADR em [adr/](adr/README.md).
   - Se **de produto/regra**, atualizar o documento correspondente
     (requisitos/regras) mudando o status de `PENDENTE`/`HIPÓTESE` para
     `CONFIRMADO`.
3. Remover ou marcar como resolvido o item nesta tabela, referenciando a ADR ou
   o documento atualizado.

> 🏗️ O **modelo físico Prisma** ([docs/14](14-modelo-fisico-prisma.md), ADR
> [0002](adr/0002-modelo-fisico-prisma-mvp.md) `Proposta`) oferece **suporte
> técnico** aos conceitos de DEC-002/010/018, mas **não** resolve os itens
> jurídicos. O encaminhamento a especialista (DEC-002, DEC-010, DEC-017,
> DEC-018) está registrado como HIST-SEC-006 no [backlog](11-backlog-inicial.md)
> e permanece **não iniciado por especialista**.

## Referências cruzadas

- [Pacote de decisões do MVP](13-pacote-decisoes-mvp.md)
- [Modelo físico Prisma](14-modelo-fisico-prisma.md)
- [Opções de arquitetura](06-opcoes-de-arquitetura.md)
- [Regras de negócio](02-regras-de-negocio.md)
- [Segurança e privacidade](08-seguranca-e-privacidade.md)
- [Guia de ADR](adr/README.md)
