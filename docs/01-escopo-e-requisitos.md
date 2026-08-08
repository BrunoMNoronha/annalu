# 01 — Escopo e requisitos

> Convenções de código:
> `RF` = Requisito Funcional, `RNF` = Requisito Não Funcional.
> Grupos: `JOG` (jogador), `ADM` (administrativo), `CFG` (configuração),
> `RNK` (ranking), `IMG` (imagens), `SEG` (segurança), `PRIV` (privacidade),
> `PERF` (performance), `UX` (experiência), `OBS` (observabilidade).
> Cada requisito indica origem: `CONFIRMADO` (derivado do briefing) ou
> `HIPÓTESE` (proposta a validar).

## 1. Requisitos funcionais — Área do jogador (`RF-JOG`)

| Código | Requisito | Origem |
| ------ | --------- | ------ |
| RF-JOG-001 | O jogador inicia uma rodada com desafios selecionados aleatoriamente pelo sistema. | CONFIRMADO |
| RF-JOG-002 | O jogador visualiza uma charada por vez. | CONFIRMADO |
| RF-JOG-003 | O jogador digita uma resposta em texto. | CONFIRMADO |
| RF-JOG-004 | O jogador captura uma foto pela câmera ou seleciona uma imagem existente. | CONFIRMADO |
| RF-JOG-005 | O jogador envia resposta + imagem para avaliação. | CONFIRMADO |
| RF-JOG-006 | O jogador vê um temporizador com o tempo limite da rodada. | CONFIRMADO |
| RF-JOG-007 | O jogador consulta o ranking. | CONFIRMADO |
| RF-JOG-008 | O jogador vê o resultado (aprovado/rejeitado) de suas participações. | HIPÓTESE |
| RF-JOG-009 | O jogador pode **pular** uma charada não enviada (estado `pulado`, zero ponto, sem troca). | CONFIRMADO (DEC-008) |
| RF-JOG-010 | O jogador vê uma pré-visualização da imagem antes de enviar. | CONFIRMADO |

## 2. Requisitos funcionais — Painel administrativo (`RF-ADM`)

| Código | Requisito | Origem |
| ------ | --------- | ------ |
| RF-ADM-001 | O administrador cadastra, edita e desativa palavras. | CONFIRMADO |
| RF-ADM-002 | O administrador cadastra charadas associadas a palavras. | CONFIRMADO |
| RF-ADM-003 | O administrador define a(s) resposta(s) aceita(s) para cada charada. | CONFIRMADO |
| RF-ADM-004 | O administrador lista participações pendentes de avaliação. | CONFIRMADO |
| RF-ADM-005 | O administrador visualiza resposta e imagem de uma participação. | CONFIRMADO |
| RF-ADM-006 | O administrador aprova ou rejeita uma participação. | CONFIRMADO |
| RF-ADM-007 | O administrador registra um motivo ao rejeitar. | HIPÓTESE |
| RF-ADM-008 | O administrador autentica-se antes de acessar o painel. | CONFIRMADO |
| RF-ADM-009 | Ações administrativas são registradas em log de auditoria. | HIPÓTESE |
| RF-ADM-010 | O administrador pode cadastrar **múltiplas charadas por palavra** (relação 1:N). | CONFIRMADO (DEC-006) |

## 3. Requisitos funcionais — Configuração do jogo (`RF-CFG`)

| Código | Requisito | Origem |
| ------ | --------- | ------ |
| RF-CFG-001 | O administrador configura a quantidade de desafios por rodada. | CONFIRMADO |
| RF-CFG-002 | O administrador configura o tempo limite da sessão. | CONFIRMADO |
| RF-CFG-003 | A seleção de desafios é aleatória com base na configuração vigente. | CONFIRMADO |
| RF-CFG-004 | A pontuação é **fixa por aprovação** (padrão 10, **configurável**; snapshot na rodada). O valor de tolerância de upload (`upload_grace_seconds`, 60 s) também é configurável e copiado na rodada. | CONFIRMADO (DEC-003/DEC-009) |
| RF-CFG-005 | A configuração é versionada, de modo que rodadas guardem a configuração usada. | HIPÓTESE |

## 4. Requisitos funcionais — Ranking (`RF-RNK`)

| Código | Requisito | Origem |
| ------ | --------- | ------ |
| RF-RNK-001 | O ranking reflete apenas pontuação de participações **aprovadas**. | CONFIRMADO |
| RF-RNK-002 | O ranking é exibido de forma ordenada (maior pontuação primeiro). | CONFIRMADO |
| RF-RNK-003 | O ranking é **denso**: empatados **compartilham a mesma posição**; a ordenação técnica por UUID não altera a posição exibida. | CONFIRMADO (DEC-004) |
| RF-RNK-004 | O ranking pode ser filtrado por período. | HIPÓTESE |

## 5. Requisitos funcionais — Imagens (`RF-IMG`)

| Código | Requisito | Origem |
| ------ | --------- | ------ |
| RF-IMG-001 | O sistema aceita upload de imagem associada a uma resposta. | CONFIRMADO |
| RF-IMG-002 | O sistema armazena a imagem de forma privada (não pública). | CONFIRMADO |
| RF-IMG-003 | O sistema valida tipo e tamanho máximo do arquivo. | CONFIRMADO |
| RF-IMG-004 | O sistema comprime/otimiza a imagem antes ou durante o upload. | HIPÓTESE |
| RF-IMG-005 | O sistema remove metadados EXIF sensíveis (ex.: geolocalização). | HIPÓTESE |
| RF-IMG-006 | O acesso à imagem exige autorização (URL não pública/assinada). | CONFIRMADO |

## 6. Requisitos não funcionais (`RNF`)

### Segurança (`RNF-SEG`)

| Código | Requisito | Origem |
| ------ | --------- | ------ |
| RNF-SEG-001 | O painel administrativo exige autenticação e autorização por papel. | CONFIRMADO |
| RNF-SEG-002 | Imagens e dados de crianças não são acessíveis publicamente. | CONFIRMADO |
| RNF-SEG-003 | Upload de arquivos é validado (tipo, tamanho) e tratado com segurança. | CONFIRMADO |
| RNF-SEG-004 | Ambientes (dev/teste/produção) são separados. | CONFIRMADO |
| RNF-SEG-005 | Nenhum dado pessoal real é usado em testes. | CONFIRMADO |

### Privacidade (`RNF-PRIV`)

| Código | Requisito | Origem |
| ------ | --------- | ------ |
| RNF-PRIV-001 | O sistema aplica minimização de dados (coleta o mínimo necessário). | CONFIRMADO |
| RNF-PRIV-002 | O sistema respeita a LGPD, incluindo consentimento quando aplicável. | CONFIRMADO |
| RNF-PRIV-003 | O sistema define política de retenção e exclusão de imagens. | HIPÓTESE (prazos `PENDENTE`) |

### Performance e disponibilidade (`RNF-PERF`)

| Código | Requisito | Origem |
| ------ | --------- | ------ |
| RNF-PERF-001 | A aplicação carrega e responde bem em redes móveis instáveis. | CONFIRMADO |
| RNF-PERF-002 | O upload tolera conexões lentas e informa progresso. | CONFIRMADO |
| RNF-PERF-003 | O estado da rodada é preservado diante de instabilidade (salvamento progressivo). | HIPÓTESE |

> Rastreabilidade (RNF-PERF-003): já existe **capacidade de backend** para salvar
> o rascunho textual da resposta (`saveAnswerDraft` em `src/modules/round`, texto
> literal por desafio). A **política/cadência de autosave da UI** (debounce, envio
> fora de ordem, versionamento) permanece **`HIPÓTESE`** — a decidir junto ao
> contrato HTTP/UI; **não** promovida por esta fatia.

### Experiência (`RNF-UX`)

| Código | Requisito | Origem |
| ------ | --------- | ------ |
| RNF-UX-001 | Interface mobile first, com alvos de toque adequados. | CONFIRMADO |
| RNF-UX-002 | Linguagem apropriada para crianças. | CONFIRMADO |
| RNF-UX-003 | Atende a critérios básicos de acessibilidade. | CONFIRMADO |

### Observabilidade (`RNF-OBS`)

| Código | Requisito | Origem |
| ------ | --------- | ------ |
| RNF-OBS-001 | Erros e falhas de upload são registrados para diagnóstico. | HIPÓTESE |

## 7. Critérios de aceitação iniciais

> Critérios de alto nível; detalhados por história em
> [backlog inicial](11-backlog-inicial.md).

1. Um administrador autenticado consegue cadastrar uma palavra com pelo menos
   uma charada e uma resposta aceita.
2. Um administrador configura quantidade de desafios e tempo limite; uma rodada
   respeita esses valores.
3. Uma criança inicia rodada, vê charadas aleatórias, responde e envia
   texto + imagem.
4. A imagem enviada fica **privada** e só é acessível mediante autorização.
5. Um administrador vê a participação pendente e a aprova ou rejeita.
6. Apenas participações aprovadas geram pontos e afetam o ranking.
7. Nenhum dado pessoal real aparece em fixtures ou testes.

## Referências cruzadas

- [Regras de negócio](02-regras-de-negocio.md)
- [Modelo de domínio](05-modelo-de-dominio.md)
- [Decisões pendentes](12-decisoes-pendentes.md)
