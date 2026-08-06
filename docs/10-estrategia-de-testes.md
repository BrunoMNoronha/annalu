# 10 — Estratégia de testes

> Estratégia de alto nível. Ferramentas específicas dependem do framework
> escolhido (`PENDENTE`, ver [opções de arquitetura](06-opcoes-de-arquitetura.md)).
> Regra inegociável: **nenhum dado pessoal real** em testes, fixtures ou seeds.

## Princípios

- Pirâmide de testes: muitos testes unitários, uma camada intermediária de
  integração/API e poucos e2e essenciais.
- Testes devem rodar de forma **determinística** e isolada.
- Cobrir especialmente **regras de negócio**, **autorização** e **upload**.

## 1. Testes unitários

- Alvo: lógica pura — normalização de resposta, cálculo de pontuação, seleção
  aleatória (com semente controlada), transições de estado.
- Sem dependências externas (banco, rede, storage).

## 2. Testes de integração

- Alvo: interação entre camadas — persistência, repositórios, regras que tocam o
  banco.
- Usar banco de teste isolado; dados fictícios.

## 3. Testes de API

- Alvo: endpoints/handlers — contrato de entrada/saída, códigos de status,
  validações.
- Incluir casos de erro (payload inválido, arquivo grande, tipo não permitido).

## 4. Testes de interface (componentes)

- Alvo: componentes de UI — renderização, estados (carregando/erro), acesso a
  alvos de toque, mensagens amigáveis.
- Verificar comportamento em telas pequenas.

## 5. Testes end-to-end (e2e)

- Alvo: jornadas completas — iniciar rodada, responder, capturar imagem
  (mockada), enviar; avaliar como administrador; ver ranking.
- Manter poucos e estáveis.

## 6. Testes de autorização

- Garantir que rotas administrativas exigem autenticação e papel correto.
- Garantir que imagens/dados de crianças **não** são acessíveis sem autorização.
- Testar negação por padrão.

## 7. Testes de upload

- Tipos permitidos aceitos; tipos proibidos rejeitados.
- Limite de tamanho respeitado (cliente e servidor).
- Remoção de EXIF sensível quando implementada (`HIPÓTESE`).
- Armazenamento como objeto privado (sem URL pública).

## 8. Testes de expiração de sessão

- Rodada expira ao atingir o tempo limite (conforme regra definida).
- Comportamento de respostas não enviadas ao expirar (a validar quando a regra
  `RN-TMP-003` for decidida).

## 9. Testes do cálculo de pontuação

- Apenas participações aprovadas geram pontos.
- Rejeitadas geram zero.
- Fórmula exata testável assim que definida (`RN-PON-003` `PENDENTE`).
- Transações de pontos rastreáveis à avaliação de origem.

## 10. Testes do ranking

- Ordenação por pontuação decrescente.
- Considera apenas pontuação validada.
- Critério de desempate (a testar quando definido — `RN-RNK-003` `PENDENTE`).

## 11. Testes em navegadores móveis

- Validar em viewports móveis (dimensões de celular).
- Fluxos de câmera/seleção de imagem.
- Comportamento sob conexão lenta/instável (simulada).
- Alvos de toque e acessibilidade básica.

## Dados de teste

- Sempre fictícios; nunca dados reais de pessoas ou crianças.
- Imagens de teste sintéticas ou não identificáveis.
- Seeds e fixtures versionados devem ser seguros para compartilhamento.

## Referências cruzadas

- [Requisitos](01-escopo-e-requisitos.md)
- [Regras de negócio](02-regras-de-negocio.md)
- [Segurança e privacidade](08-seguranca-e-privacidade.md)
