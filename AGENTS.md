# AGENTS.md — Instruções operacionais para agentes de IA

Este documento orienta agentes de IA (Claude Code, ChatGPT, Antigravity e
outros) que trabalharão no projeto **Annalú e os Tesouros Escondidos**. Ele
existe para garantir **consistência**, **preservação de escopo** e
**continuidade** entre agentes, sem depender do histórico de chat.

> O produto está em fase de definição. Leia sempre o [`README.md`](README.md) e a
> documentação em [`docs/`](docs/) antes de agir.

## 1. Princípios gerais

- A documentação é a **fonte da verdade**. Se algo não está documentado, não é
  um requisito aprovado.
- Diferencie sempre três categorias:
  - **CONFIRMADO** — decidido e aprovado.
  - **HIPÓTESE** — proposta plausível, ainda não aprovada.
  - **PENDENTE** — decisão em aberto (ver [`docs/12-decisoes-pendentes.md`](docs/12-decisoes-pendentes.md)).
- **Nunca** transforme uma hipótese ou decisão pendente em fato consumado sem
  autorização explícita.
- **Nunca** invente requisitos.

## 2. Como analisar uma tarefa

1. Leia a tarefa por completo e identifique o objetivo real.
2. Localize a documentação relacionada em [`docs/`](docs/).
3. Liste o que está **dentro** e **fora** do escopo da tarefa.
4. Identifique dependências e decisões pendentes que bloqueiam ou condicionam a
   tarefa.
5. Se houver ambiguidade relevante que altere o resultado, **registre a dúvida**
   no relatório final em vez de assumir silenciosamente.

## 3. Como preservar o escopo

- Faça **apenas** o que a tarefa pede. Não antecipe etapas futuras.
- Não crie código de aplicação em etapas de documentação.
- Não escolha framework, banco ou hospedagem enquanto essas decisões estiverem
  marcadas como PENDENTES.
- Mudanças fora do escopo pedido devem ser **propostas** no relatório, não
  executadas.

## 4. Como atualizar a documentação

- Escreva em **português**, em **Markdown**.
- Use **links relativos** entre documentos.
- Mantenha a terminologia consistente (ver glossário abaixo).
- Ao introduzir uma hipótese, marque-a como `HIPÓTESE`.
- Ao registrar uma decisão aprovada, crie/atualize uma ADR em
  [`docs/adr/`](docs/adr/README.md) e remova o item de
  [`docs/12-decisoes-pendentes.md`](docs/12-decisoes-pendentes.md).
- Evite contradições entre documentos; se encontrar uma, corrija ou sinalize.

## 5. Como executar validações

Em etapas de documentação:

- Revise todos os **links relativos**.
- Verifique se todos os arquivos esperados existem.
- Procure inconsistências terminológicas.
- Confirme que **nenhum arquivo de código de aplicação** foi criado
  indevidamente.
- Execute `git status` e descreva o diff.

Em etapas futuras de código (quando autorizadas):

- Rode linters, type-check e testes conforme definido em
  [`docs/10-estrategia-de-testes.md`](docs/10-estrategia-de-testes.md).
- Não marque como concluída uma tarefa cujos testes falham; relate a falha.
- **Banco de dados:** operações de migration/seed/integração só rodam contra um
  **PostgreSQL descartável** (nome contendo `_test`/`test`/`integration`).
  **Nunca** execute `migrate reset`, `db push --force-reset`, `DROP DATABASE` ou
  `TRUNCATE` sem o guard de banco de teste. Não use banco de produção. Detalhes
  em [`docs/14-modelo-fisico-prisma.md`](docs/14-modelo-fisico-prisma.md).

## 6. Restrições de Git

- **Não** execute `push`.
- **Não** crie pull request.
- **Não** faça `commit`, exceto quando houver **autorização explícita** no
  prompt da tarefa.
- **Não** descarte mudanças existentes (`reset --hard`, `checkout --`,
  `clean`) sem autorização explícita.
- Trabalhe na branch indicada pela tarefa; a branch principal é `main`.
- Sempre relate `git status` inicial e final.

## 7. Regras de segurança e privacidade

- O público inclui **crianças**; trate dados pessoais com cuidado máximo.
- **Nunca** use dados pessoais reais em exemplos, fixtures ou testes. Use dados
  fictícios.
- **Nunca** inclua segredos (tokens, senhas, chaves) na documentação ou no
  código versionado.
- Fotografias enviadas por crianças são dados sensíveis; siga
  [`docs/08-seguranca-e-privacidade.md`](docs/08-seguranca-e-privacidade.md).
- Aplique **minimização de dados**: só colete o estritamente necessário.

## 8. Glossário (terminologia obrigatória)

Use exatamente estes termos para evitar inconsistências:

| Termo | Significado |
| ----- | ----------- |
| **Palavra** (`Word`) | Termo-alvo que a criança deve descobrir/representar. |
| **Charada** (`Riddle`) | Enunciado/adivinha associada a uma palavra. |
| **Resposta aceita** (`AcceptedAnswer`) | Texto considerado correto para uma charada. |
| **Rodada / Sessão** (`GameSession`) | Execução de um conjunto de desafios por uma criança. |
| **Desafio da sessão** (`SessionChallenge`) | Instância de uma charada dentro de uma rodada. |
| **Resposta do jogador** (`PlayerAnswer`) | Texto + imagem enviados pela criança. |
| **Avaliação** (`Evaluation`) | Aprovação/rejeição humana de uma participação. |
| **Pontuação** (`ScoreTransaction`) | Registro de pontos concedidos. |
| **Ranking** (`RankingEntry`) | Classificação agregada de jogadores. |
| **Administrador** (`AdminUser`) | Pessoa que cadastra conteúdo e avalia. |
| **Responsável** (`Guardian`) | Adulto responsável pela criança (se aplicável). |

## 9. Formato obrigatório do relatório final

Todo agente deve encerrar sua execução com um relatório neste formato:

```markdown
# Relatório de execução

## 1. Objetivo da tarefa
## 2. Estado inicial encontrado
## 3. Documentação criada
## 4. Arquivos criados
## 5. Arquivos alterados
## 6. Principais requisitos identificados
## 7. Hipóteses registradas
## 8. Decisões pendentes
## 9. Opções de arquitetura analisadas
## 10. Recomendação preliminar
## 11. Validações executadas
## 12. Comandos executados
## 13. Problemas encontrados
## 14. Riscos e limitações
## 15. Perguntas para o orquestrador
## 16. Próxima etapa recomendada
## 17. Resumo do Git

- Repositório:
- Branch:
- Estado inicial:
- Estado final:
- Arquivos não rastreados:
- Arquivos modificados:
- Commits criados:
- Push realizado:
- Pull request criado:
```

O relatório deve ter detalhes suficientes para que o orquestrador defina o
próximo prompt **sem** depender do histórico do chat.
