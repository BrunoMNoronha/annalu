# 09 — Experiência mobile

> Diretrizes de UX para uma aplicação **mobile first** voltada a **crianças**.
> Valores numéricos marcados `HIPÓTESE` são recomendações a validar.

## 1. Mobile first

- Projetar primeiro para telas pequenas (celular), depois adaptar para maiores.
- Layout em coluna única, conteúdo priorizado, rolagem vertical natural.
- Uma tarefa por tela sempre que possível (ler charada → responder → fotografar
  → enviar).

## 2. Alvos de toque

- Tamanho mínimo recomendado de alvo de toque: **~44×44 px** (`HIPÓTESE`,
  alinhado a diretrizes usuais de acessibilidade móvel).
- Espaçamento suficiente entre botões para evitar toques acidentais.
- Botões primários grandes e evidentes (adequado a crianças).

## 3. Uso de câmera

- Permitir **tirar foto** ou **selecionar** imagem existente.
- Acionar a câmera do dispositivo via recursos do navegador (ex.: `input` de
  captura), respeitando permissões.
- Prever alternativa quando a câmera não estiver disponível (upload de arquivo).

## 4. Permissões do navegador

- Solicitar permissão de câmera **no momento do uso**, com explicação simples.
- Tratar negação de permissão sem travar o fluxo (oferecer seleção de arquivo).
- Não pedir permissões desnecessárias.

## 5. Pré-visualização da imagem

- Mostrar **pré-visualização** antes do envio.
- Permitir **refazer**/trocar a imagem facilmente.

## 6. Compressão

- Comprimir/otimizar a imagem no cliente antes do upload para reduzir uso de
  dados e acelerar em redes lentas (`HIPÓTESE`).
- Preservar qualidade suficiente para avaliação humana.

## 7. Conexão instável

- Assumir redes móveis lentas/intermitentes como caso comum.
- Reenvio automático ou manual em caso de falha, com mensagens claras.
- Evitar perda de trabalho por queda de conexão.

## 8. Salvamento progressivo

- Preservar o estado da rodada e a resposta em andamento diante de instabilidade
  ou recarregamento (`HIPÓTESE`).
- Confirmar ao usuário o que já foi salvo/enviado.

## 9. Feedback de upload

- Indicador de **progresso** durante o envio.
- Estados claros: enviando, enviado, falhou (com opção de tentar de novo).
- Impedir envios duplicados por toques repetidos.

## 10. Temporizador

- Exibir o **tempo restante** de forma visível e compreensível para crianças.
- Avisos suaves ao se aproximar do fim (`HIPÓTESE`).
- Comportamento ao esgotar o tempo é `PENDENTE` (ver
  [regras de negócio](02-regras-de-negocio.md), `RN-TMP`).

## 11. Acessibilidade

- Contraste adequado, textos legíveis, ícones acompanhados de rótulos.
- Suporte a leitores de tela e navegação por teclado onde aplicável.
- Não depender apenas de cor para transmitir informação.
- Áreas de toque generosas.

## 12. Linguagem apropriada para crianças

- Textos curtos, simples e positivos.
- Evitar jargão técnico e mensagens de erro assustadoras.
- Feedback encorajador (mesmo em rejeição, tom gentil).
- Ícones e ilustrações que apoiem a leitura em desenvolvimento.

## Referências cruzadas

- [Personas e jornadas](03-personas-e-jornadas.md)
- [Requisitos (RNF-UX, RNF-PERF)](01-escopo-e-requisitos.md)
- [Segurança e privacidade](08-seguranca-e-privacidade.md)
