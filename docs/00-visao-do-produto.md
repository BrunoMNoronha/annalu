# 00 — Visão do produto

> Documento de fundação. Itens marcados como `HIPÓTESE` ainda não foram
> aprovados. Ver [decisões pendentes](12-decisoes-pendentes.md).

## Problema

Crianças aprendem melhor quando brincam, criam e se movimentam. Atividades
puramente digitais e passivas (ler/clicar) prendem pouco a atenção e não
estimulam a associação entre linguagem e mundo real. Faltam experiências
lúdicas que unam **raciocínio verbal** (charadas) com **exploração do ambiente**
(encontrar e fotografar objetos que representem a resposta).

## Proposta de valor

Um jogo *mobile first* em que a criança:

- resolve uma charada;
- procura no mundo real um objeto que represente a resposta;
- fotografa esse objeto;
- recebe validação e pontos.

Isso combina alfabetização/raciocínio com atividade física leve e criatividade,
com **supervisão humana** garantindo segurança e qualidade das participações.

## Público

- **Primário:** crianças (faixa etária exata é `PENDENTE`, ver
  [decisões pendentes](12-decisoes-pendentes.md)).
- **Secundário:** responsáveis (pais, cuidadores, educadores) que acompanham.
- **Operacional:** administradores que cadastram conteúdo e avaliam
  participações.

## Objetivos

- Oferecer uma experiência divertida, segura e simples em dispositivos móveis.
- Estimular associação entre palavras e objetos do mundo real.
- Manter a criança segura por meio de **avaliação humana** de conteúdo.
- Permitir que administradores criem conteúdo (palavras/charadas) sem esforço
  técnico.
- Gerar engajamento saudável via ranking.

## Princípios do produto

1. **Segurança primeiro** — especialmente por envolver crianças e fotografias.
2. **Mobile first** — projetado para telas pequenas e toque.
3. **Simplicidade para a criança** — linguagem e interface adequadas à idade.
4. **Humano no circuito** — nesta versão, avaliação é sempre humana.
5. **Minimização de dados** — coletar o mínimo necessário.
6. **Privacidade por padrão** — imagens e dados privados por padrão.
7. **Conteúdo controlado pelo administrador** — nada é público sem curadoria.

## Escopo inicial (primeira versão)

- Cadastro de palavras e charadas pelo administrador.
- Configuração de rodada: quantidade de desafios e tempo limite.
- Seleção aleatória de desafios.
- Fluxo do jogador: ver charada → digitar resposta → capturar/selecionar foto →
  enviar.
- Avaliação humana (aprovar/rejeitar).
- Pontuação de participações aprovadas.
- Ranking.
- Autenticação/autorização mínima para o painel administrativo.

## Fora do escopo da primeira versão

- Análise automática de imagem (visão computacional).
- Correção automática/semântica de respostas por IA.
- Loja, compras ou moeda virtual.
- Chat entre usuários ou recursos sociais abertos.
- Multiplayer em tempo real.
- Aplicativos nativos (iOS/Android) — o alvo é web. (PWA é `PENDENTE`.)
- Internacionalização (idiomas além do português) — `HIPÓTESE` de escopo futuro.

## Indicadores iniciais de sucesso

> Metas numéricas são `HIPÓTESE` até validação com o orquestrador.

- **Conclusão de rodada:** % de rodadas iniciadas que chegam ao envio.
- **Taxa de aprovação:** % de participações aprovadas na avaliação.
- **Tempo de avaliação:** tempo médio entre envio e decisão do administrador.
- **Retorno:** % de crianças que jogam mais de uma rodada.
- **Qualidade de conteúdo:** nº de palavras/charadas ativas cadastradas.
- **Zero incidentes** de exposição indevida de imagens de crianças.

## Referências cruzadas

- [Escopo e requisitos](01-escopo-e-requisitos.md)
- [Regras de negócio](02-regras-de-negocio.md)
- [Segurança e privacidade](08-seguranca-e-privacidade.md)
