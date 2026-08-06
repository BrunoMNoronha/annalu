# 04 — Fluxos do sistema

> Diagramas em Mermaid. Estados e transições marcados com `HIPÓTESE`/`PENDENTE`
> dependem de decisões futuras (ver [decisões pendentes](12-decisoes-pendentes.md)).

## 1. Fluxo do jogador

```mermaid
flowchart TD
    A[Abrir o jogo] --> B[Identificar/associar jogador]
    B --> C[Iniciar rodada]
    C --> D[Ler configuracao vigente]
    D --> E[Sortear desafios]
    E --> F[Iniciar temporizador]
    F --> G[Exibir charada]
    G --> H[Digitar resposta]
    H --> I[Capturar/selecionar foto]
    I --> J[Pre-visualizar imagem]
    J --> K{Confirmar?}
    K -- Nao --> I
    K -- Sim --> L[Validar tipo/tamanho]
    L --> M[Enviar participacao]
    M --> N{Ha mais desafios?}
    N -- Sim --> G
    N -- Nao --> O[Encerrar rodada]
    O --> P[Confirmar envio - avaliacao humana]
```

## 2. Fluxo de avaliação

```mermaid
flowchart TD
    A[Administrador autentica] --> B[Abrir fila de pendentes]
    B --> C[Selecionar participacao]
    C --> D[Ver charada + resposta + imagem]
    D --> E{Decisao}
    E -- Aprovar --> F[Registrar aprovacao]
    F --> G[Conceder pontos]
    G --> H[Atualizar ranking]
    E -- Rejeitar --> I[Registrar rejeicao + motivo]
    I --> J[Zero ponto]
    F --> K[Registrar auditoria]
    I --> K
```

## 3. Estados de uma rodada (`GameSession`)

```mermaid
stateDiagram-v2
    [*] --> Criada
    Criada --> EmAndamento: iniciar
    EmAndamento --> Concluida: todos os desafios enviados
    EmAndamento --> Expirada: tempo limite atingido
    EmAndamento --> Cancelada: abandono/cancelamento
    Concluida --> [*]
    Expirada --> [*]
    Cancelada --> [*]
```

> `Expirada` e `Cancelada` são `HIPÓTESE`. O comportamento exato ao expirar é
> `PENDENTE` (ver [regras de negócio](02-regras-de-negocio.md), `RN-TMP`).

## 4. Estados de uma resposta (`PlayerAnswer`)

```mermaid
stateDiagram-v2
    [*] --> Rascunho
    Rascunho --> ComImagem: imagem anexada
    ComImagem --> Enviada: enviar
    Rascunho --> Descartada: pular/cancelar
    Enviada --> EmAvaliacao: entra na fila
    EmAvaliacao --> [*]
```

> `Rascunho`/`Descartada` dependem de salvamento progressivo (`HIPÓTESE`) e de
> permitir pular charada (`HIPÓTESE`).

## 5. Estados de uma avaliação (`Evaluation`)

```mermaid
stateDiagram-v2
    [*] --> Pendente
    Pendente --> Aprovada: administrador aprova
    Pendente --> Rejeitada: administrador rejeita
    Aprovada --> EmRevisao: revisao solicitada
    Rejeitada --> EmRevisao: revisao solicitada
    EmRevisao --> Aprovada
    EmRevisao --> Rejeitada
    Aprovada --> [*]
    Rejeitada --> [*]
```

> `EmRevisao` é `HIPÓTESE` (ver `RN-AVA-005`).

## 6. Visão de ciclo de vida (ponta a ponta)

```mermaid
sequenceDiagram
    participant C as Crianca
    participant S as Sistema
    participant A as Administrador
    C->>S: Iniciar rodada
    S-->>C: Charadas sorteadas + temporizador
    C->>S: Resposta + foto (por desafio)
    S-->>C: Confirmacao (pendente de avaliacao)
    A->>S: Abrir fila de pendentes
    S-->>A: Participacoes + imagens
    A->>S: Aprovar / Rejeitar
    S->>S: Conceder pontos (se aprovado)
    S->>S: Atualizar ranking
    C->>S: Consultar ranking
    S-->>C: Classificacao
```

## Referências cruzadas

- [Regras de negócio](02-regras-de-negocio.md)
- [Personas e jornadas](03-personas-e-jornadas.md)
- [Modelo de domínio](05-modelo-de-dominio.md)
