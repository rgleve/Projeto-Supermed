# Arquitetura Técnica

## Code.js — Servidor (Google Apps Script)

Arquivo único com ~2.073 linhas. Dividido em módulos funcionais:

### 1. Autenticação e Autorização (linhas 1–800)

| Função | Descrição |
|---|---|
| `loginPortal(cpf, senha)` | Login via CPF; retorna token de sessão |
| `validarSessao(token)` | Valida token; sessão expira em 12h |
| `obterContextoAcessoUsuarioPortal(token)` | Retorna permissões + escopos do usuário |

Abas da planilha Auth usadas: `Users`, `Sessions`, `AccessLogs`, `AccessProfiles`, `UserScopes`.

### 2. Gestão de Usuários (linhas 900–1100)

| Função | Descrição |
|---|---|
| `listarUsuariosPortal(token)` | Lista usuários conforme permissão |
| `criarUsuarioPortal(token, payload)` | Cria novo usuário |
| `editarUsuarioPortal(token, usuarioId, payload)` | Edita dados do usuário |
| `resetarSenhaUsuarioPortal(token, usuarioId)` | Força reset de senha |
| `salvarEscoposUsuarioPortal(token, usuarioId, escopos)` | Define escopos de acesso |

### 3. Acesso e Filtragem de Dados (linhas 1200–1400)

| Função | Descrição |
|---|---|
| `obterDadosExcelAutenticado(token)` | Retorna base/metas/feriados filtrados por escopo |
| `filtrarBasePorEscopoPortal_(base, escopos)` | Filtragem linha a linha por site/produto/supervisor |

Colunas usadas no filtro de escopo:

| Campo | Coluna (índice base-0) |
|---|---|
| supervisor | 9 |
| site | 81 |
| tipo | 91 (deve ser `"Operador"`) |
| produto | 106 |

### 4. Sync Excel → Sheets (linhas 1500–1700)

Função: `syncExcelToBridge()`

- Lê `BASE_DASH_EXPORT.xlsx` do Google Drive
- Converte para formato Sheets, valida, normaliza campos de tempo
- Cria aba temporária → valida → swap atômico com backup
- Campos de tempo convertidos de serial date para segundos

---

## Index.html — Cliente (SPA, ~17.991 linhas)

### Estado global

| Variável | Conteúdo |
|---|---|
| `dashboardAccessContext` | Contexto de acesso do usuário logado (permissões, escopos) |
| `cachedPortalData` | Cache da base normalizada (base, metas, feriados) |

### Pipeline de processamento

```
obterDadosExcelAutenticado(token)          [servidor]
  ↓
prepararBaseNormalizadaPortal()            [parse datas, normaliza textos]
  ↓
processarDados(opcoes)           ~L11263   [agrega por site/produto/supervisor/op]
  ↓
renderizar*()                              [gera HTML da view ativa]
  ↓
DOM (debounce 500ms via executarRenderDebouncedPortal)
```

### Funções-chave

| Função | Linha | Papel |
|---|---|---|
| `processarDados(opcoes)` | ~11263 | Agregação principal |
| `atualizarIndicadoresOperador()` | ~12724 | Render hierárquico da Produtividade |
| `renderizarViewAtivaPortal(nomeView)` | ~9171 | Roteador de views |
| `carregarContextoAcessoDashboard_()` | ~10233 | Carrega contexto do servidor |

### Estratégia de rendering

- `solicitarRender*()` — marca a view como pendente
- `executarRenderDebouncedPortal()` — executa com debounce de 500ms
- Evita renders duplicados durante mudanças rápidas de filtro
- Cache por view: `obterCachePortal()` / `salvarCachePortal()`

### Mapeamento de colunas da Base (índices base-0)

| Campo | Coluna | Nota |
|---|---|---|
| supervisor | 9 | |
| site | 81 | |
| tipo | 91 | Somente `"Operador"` |
| produto | 106 | |
| Tempo de Casa | 120 (DQ) | **Correto** — col 143 (EN) é antigo/errado |
| Aderência Líquida | 131 (EB) | |
| Ligações | 134 (EE) | Média |
