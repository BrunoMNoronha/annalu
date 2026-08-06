# 08 — Segurança e privacidade

> ⚠️ **Este documento não é aconselhamento jurídico.** Por envolver **crianças**
> e **fotografias**, uma **revisão jurídica futura** sobre LGPD e proteção de
> menores **poderá ser necessária** antes do lançamento. Itens marcados
> `PENDENTE` exigem decisão; ver [decisões pendentes](12-decisoes-pendentes.md).

## 1. Contexto sensível

- O público inclui **crianças**, categoria de titulares com proteção reforçada
  pela LGPD.
- O produto coleta **fotografias**, que podem conter imagem de menores e
  metadados sensíveis.
- Consequência: privacidade e segurança são **requisitos de primeira classe**,
  não opcionais.

## 2. Consentimento

- Deve-se prever **consentimento** apropriado (provavelmente do responsável
  legal). A forma exata é `PENDENTE`.
- O consentimento deve ser **específico, informado e revogável**.
- Registrar consentimento como histórico **append-only** (`ConsentRecord`); o
  **estado vigente deriva dos registros**, não de um campo em `Guardian` (ver
  [modelo de dados](07-modelo-de-dados-inicial.md)).
- Sem consentimento válido, câmera/galeria/upload de menores ficam **bloqueados**
  (gate de mídia — ver seção 12).

## 3. Minimização de dados

- Coletar **apenas** o estritamente necessário para o jogo.
- Evitar nome completo, documentos, endereço, geolocalização e qualquer dado não
  essencial.
- Preferir apelidos/identificadores não sensíveis para o jogador.

## 4. Fotografias

- Armazenamento **privado** em objetos; nunca em buckets/URLs públicas.
- Acesso somente via **URL assinada/autorizada** e com verificação de papel.
- **Validação de upload:**
  - Tipos permitidos: imagens (ex.: JPEG, PNG, WebP) — lista exata `PENDENTE`.
  - Tamanho máximo de arquivo definido e aplicado no cliente e no servidor
    (`PENDENTE` o valor).
  - Verificação de conteúdo/assinatura de arquivo, não apenas extensão.
- **Metadados EXIF:** remover metadados sensíveis (especialmente
  **geolocalização**) antes de armazenar (`HIPÓTESE`, recomendado).
- Não expor imagens de uma criança a outros jogadores.

## 5. Controle de acesso

- Painel administrativo com **autenticação** obrigatória e **autorização por
  papel** (RBAC).
- Princípio do menor privilégio: cada papel acessa só o necessário.
- Endpoints de imagem e de dados de crianças exigem autorização; negar por
  padrão.

## 6. URLs privadas e upload seguro

- URLs de imagem devem ser **assinadas e temporárias** quando possível.
- Nunca colocar dados pessoais/sensíveis em query strings ou logs.
- Upload por canal seguro (HTTPS) e, preferencialmente, com validação
  servidor-side antes de confirmar a persistência.

## 7. Retenção e exclusão

- Definir **política de retenção** de imagens e dados (prazos `PENDENTE`).
- Prever **exclusão** (lógica e/ou física) mediante solicitação ou fim do
  propósito, coerente com direitos do titular na LGPD.
- Exclusão deve remover também o objeto no armazenamento, não só o registro.

## 8. Auditoria

- Registrar ações administrativas relevantes (avaliações, alterações de
  conteúdo) em `AuditLog` (`HIPÓTESE`).
- Log de auditoria **imutável**, com autor, ação, alvo e data.
- Logs **não** devem conter dados pessoais desnecessários nem conteúdo de
  imagens.

## 9. Separação de ambientes

- Ambientes **dev**, **teste** e **produção** isolados (credenciais, bancos e
  armazenamento distintos).
- Dados de produção **não** são copiados para dev/teste.

## 10. Dados de teste

- **Proibido** usar dados pessoais reais em testes, fixtures ou seeds.
- Usar dados fictícios e imagens não identificáveis / sintéticas.

## 11. Boas práticas gerais

- Segredos fora do versionamento (variáveis de ambiente / cofre).
- Dependências monitoradas quanto a vulnerabilidades (ver seção 13).
- Transporte sempre por HTTPS.
- Tratamento de erros sem vazar detalhes internos ao usuário final.

## 11.1. Política de dependências e auditoria

> Aplica-se a toda mudança de dependências. Faz parte dos gates de CI.

**Critérios de bloqueio (obrigatórios antes de qualquer push):**

- **Nenhuma** vulnerabilidade **crítica** ou **alta** pode permanecer no conjunto
  **completo** de dependências (produção + desenvolvimento).
- **Nenhuma** vulnerabilidade **moderada, alta ou crítica** pode permanecer em
  dependências de **produção**.
- Vulnerabilidades **baixas/moderadas exclusivamente de desenvolvimento** só
  podem permanecer quando, cumulativamente: não houver correção estável e
  compatível; o componente não for executado em produção; a exposição prática
  tiver sido analisada; e o risco estiver **documentado** com justificativa.

**Gates de CI** (em [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)):

- `pnpm audit --prod --audit-level=moderate` → bloqueia moderadas+ em produção.
- `pnpm audit --audit-level=high` → bloqueia altas/críticas em qualquer lugar.

**Classificação:** produção vs. desenvolvimento é definida pelo **grafo real**
do gerenciador (`pnpm audit --prod`, `pnpm why <pkg>`), nunca por suposição.
Um pacote usado apenas em build/testes ainda pode constar como produção se
entrar no grafo de produção de uma dependência direta.

**Regras de remediação (nesta ordem):** remover dependência não utilizada →
patch → minor → major estável e compatível → substituição → mitigação
documentada (último recurso). É **proibido**: usar versões beta/RC/canary;
`pnpm audit --fix --force`; `overrides` sem justificativa; `ignore-scripts` ou
supressão global da auditoria como "solução"; reduzir artificialmente a
severidade; ou ignorar um advisory sem justificativa registrada.

**`overrides` de segurança** são permitidos apenas para elevar dependências
**transitivas** a versões corrigidas **compatíveis** (patch/minor no mesmo
major), com justificativa. Overrides que saem da faixa declarada pela
dependência direta (ex.: `sharp`, ver seção 11.2) são tratados como **risco
técnico controlado** e exigem verificação automatizada.

**Dependabot** ([`.github/dependabot.yml`](../.github/dependabot.yml)) monitora
atualizações: **patch/minor** são agrupados em um único PR; **major** abre em
**PR separado**; **nenhuma** atualização tem auto-merge.

**Revisão humana:** atualizações **major** sensíveis (ex.: Next.js, React,
Prisma, Vitest) exigem revisão humana — notas de migração e verificação de
breaking changes — e **não** são mescladas automaticamente.

## 11.2. Override temporário de `sharp` (risco técnico controlado)

- **Faixa declarada pelo Next.js 15.5.22:** `sharp@^0.34.3`.
- **Versão forçada no projeto:** `sharp >=0.35.0` (via `pnpm.overrides`), para
  eliminar a vulnerabilidade alta `GHSA-f88m-g3jw-g9cj`.
- **Natureza:** o override está **fora** da faixa originalmente declarada pelo
  framework. Portanto **não** é automaticamente compatível — é um **risco
  técnico controlado e monitorado**, não um risco inexistente.
- **Controle:** a compatibilidade é validada por um **smoke test de produção**
  ([`scripts/smoke-production.mjs`](../scripts/smoke-production.mjs), script
  `smoke:production`) que sobe `next start` e exercita a rota de otimização de
  imagem (`/_next/image`) com a versão de `sharp` resolvida. O CI executa esse
  teste após o build; se a otimização falhar, o CI falha.
- **Condição de remoção:** o override deve ser **removido** quando uma versão
  **estável** adotada do Next.js declarar uma faixa de `sharp` que já inclua a
  correção (`>=0.35.0`). Não migrar para versões beta/preview/RC/canary.
- **Manutenção:** toda atualização futura de `next` ou `sharp` deve
  **reexecutar** a auditoria (`pnpm audit`) e o smoke test de produção antes de
  aceitar a mudança.

## 12. Decisões de segurança do MVP (6 ago 2026)

> Derivadas do [pacote de decisões](13-pacote-decisoes-mvp.md). Não constituem
> aconselhamento jurídico.

- **Código de acesso da criança = credencial.** Armazenar somente **hash**
  (`access_code_hash`), nunca em texto puro; **não** registrar em logs; **não**
  transportar em query string; aplicar **rate limiting**; permitir **rotação e
  revogação**; evitar códigos triviais.
- **Autenticação de adultos** (direção de produto): responsável e administrador
  autenticam por **e-mail (link/código) ou Google**; a criança **não** usa
  e-mail/Google/senha; identidade externa é separada do perfil de domínio e não
  substitui o UUID interno; nenhuma credencial de provedor é persistida
  indevidamente.
- **Consentimento append-only** (`ConsentRecord`): concessão/revogação
  versionadas e auditáveis; estado vigente derivado do histórico (sem apagar
  registros).
- **Gate de mídia:** câmera, galeria e upload ficam **bloqueados até**
  responsável autenticado e consentimento aplicável.
- **Expurgo de upload órfão:** uploads não confirmados dentro da tolerância
  (`upload_grace_seconds`, 60 s) têm o objeto removido.
- **Retenção de fotografias:** ciclo técnico configurável (`retention_until`,
  expurgo, auditoria sem imagem); **prazo `DEPENDE DE REVISÃO JURÍDICA`** — o
  **lançamento com fotografias fica bloqueado** até essa revisão.
- **Faixa etária (DEC-017) pendente:** enquanto isso, **não** coletar data de
  nascimento nem idade, e **não** inferir idade por fotografia.

## 13. Revisão jurídica (registro)

> **PENDENTE:** validar com jurídico os requisitos de LGPD, base legal,
> consentimento parental, retenção e direitos do titular **antes do
> lançamento**. Registrar a conclusão como ADR.

## Referências cruzadas

- [Requisitos (RNF-SEG, RNF-PRIV)](01-escopo-e-requisitos.md)
- [Modelo de dados inicial](07-modelo-de-dados-inicial.md)
- [Estratégia de testes](10-estrategia-de-testes.md)
- [Decisões pendentes](12-decisoes-pendentes.md)
