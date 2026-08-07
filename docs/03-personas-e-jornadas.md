# 03 — Personas e jornadas

> Personas são representações de trabalho para orientar decisões de produto. Não
> descrevem pessoas reais. Detalhes de idade e identificação são `PENDENTE` (ver
> [decisões pendentes](12-decisoes-pendentes.md)).

## Personas

### 1. Criança jogadora

- **Quem é:** criança em idade de alfabetização/leitura inicial (faixa exata
  `PENDENTE`).
- **Objetivos:** se divertir, resolver charadas, tirar fotos, ganhar pontos.
- **Contexto de uso:** celular ou tablet, muitas vezes com supervisão.
- **Necessidades:** interface simples, textos curtos, botões grandes, feedback
  imediato, linguagem amigável.
- **Limitações:** leitura em desenvolvimento; atenção curta; pode não entender
  mensagens técnicas ou de erro.
- **Riscos:** privacidade, exposição de imagem, frustração com falhas de rede.

### 2. Responsável (Guardian)

- **Quem é:** pai, mãe, cuidador ou educador que acompanha a criança.
- **Objetivos:** garantir que a criança use algo seguro, educativo e adequado.
- **Necessidades:** clareza sobre privacidade, controle/consentimento, confiança
  na moderação humana.
- **Papel (DEC-002, direção aprovada):** responsável **autenticado e persistente**
  (login por e-mail ou Google), exigido **antes da primeira câmera/galeria/upload**;
  concede/revoga consentimento e pode auxiliar na recuperação do acesso da
  criança. Um responsável principal por criança; um responsável pode vincular
  várias crianças. Validade do fluxo `DEPENDE DE REVISÃO JURÍDICA`.

### 3. Administrador (AdminUser)

- **Quem é:** pessoa responsável por conteúdo e curadoria.
- **Objetivos:** cadastrar palavras/charadas, configurar rodadas, avaliar
  participações com justiça e segurança.
- **Necessidades:** painel eficiente, fila de avaliação clara, visualização
  segura de imagens, registro de auditoria.
- **Responsabilidades:** garantir adequação do conteúdo e proteção das crianças.

## Jornadas

> As jornadas descrevem o **caminho ideal** (happy path) e os principais desvios.
> Passos marcados `PENDENTE`/`HIPÓTESE` dependem de decisões futuras.

### J1 — Iniciar uma rodada

1. A criança (ou responsável) abre o jogo.
2. O sistema identifica/associa o jogador. *(Forma de identificação `PENDENTE`.)*
3. A criança escolhe iniciar uma nova rodada.
4. O sistema lê a configuração vigente (quantidade de desafios, tempo limite).
5. O sistema sorteia os desafios.
6. O sistema inicia o temporizador e exibe a primeira charada.

**Desvios:** acervo insuficiente (`PENDENTE`); sem consentimento válido
(`HIPÓTESE` → bloqueia início).

### J2 — Responder uma charada

1. A criança lê a charada.
2. A criança digita a resposta.
3. A criança confirma para avançar à etapa da foto.

**Desvios:** pular charada (`HIPÓTESE`); tempo expira durante a resposta
(`PENDENTE`).

### J3 — Capturar uma imagem

1. O sistema solicita permissão de câmera (se ainda não concedida).
2. A criança tira uma foto **ou** seleciona uma imagem existente.
3. O sistema exibe uma **pré-visualização**.
4. A criança confirma ou refaz.
5. O sistema valida tipo/tamanho e otimiza a imagem *(otimização `HIPÓTESE`)*.

**Desvios:** permissão de câmera negada → seleção de arquivo como alternativa;
arquivo inválido → mensagem amigável e nova tentativa.

### J4 — Finalizar a rodada

1. A criança envia resposta + imagem de cada desafio.
2. Ao concluir os desafios (ou ao expirar o tempo), a rodada é encerrada.
3. O sistema confirma o envio e informa que a avaliação é humana.
4. As participações entram na fila de avaliação com status *pendente*.

**Desvios:** falha de upload → repetição/reenvio com feedback de progresso;
expiração antes do fim (**CONFIRMADO** — DEC-009 / RN-TMP / RN-EXP: o servidor é
a autoridade do tempo e preserva o que já foi salvo; a transição temporal
`IN_PROGRESS → EXPIRED` já é aplicada no backend, com os efeitos sobre respostas/
imagens em módulos futuros).

### J5 — Avaliar uma participação

1. O administrador autentica-se no painel.
2. O administrador abre a fila de participações pendentes.
3. O administrador visualiza a charada, a resposta textual e a imagem.
4. O administrador aprova ou rejeita (com motivo, se aplicável — `HIPÓTESE`).
5. O sistema registra a decisão, o autor e a data *(auditoria `HIPÓTESE`)*.
6. Se aprovada, o sistema concede pontos e atualiza o ranking.

**Desvios:** imagem inadequada → rejeição; dúvida → política de revisão
(`HIPÓTESE`).

### J6 — Consultar o ranking

1. O jogador (ou administrador) acessa o ranking.
2. O sistema exibe a classificação ordenada por pontuação validada.
3. Aplica critério de desempate *(critério `PENDENTE`)*.

## Referências cruzadas

- [Fluxos do sistema](04-fluxos-do-sistema.md)
- [Regras de negócio](02-regras-de-negocio.md)
- [Experiência mobile](09-experiencia-mobile.md)
