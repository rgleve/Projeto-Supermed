# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

This is a **Google Apps Script operational dashboard portal** for Rede Assist 24H. It's a web application deployed as a Google Apps Script webapp that displays real-time operational indicators, metrics, and analytics for healthcare network operations.

**Key Facts:**
- Framework: Google Apps Script (server) + vanilla JavaScript (client)
- Deployment: `clasp` CLI for local dev sync
- Data: Google Sheets with automatic Excel sync
- Architecture: Server-side authentication + client-side rendering

## Development Commands

### Initial Setup
```bash
# Install Node dependencies (minimal - just @types/google-apps-script)
npm install

# Authenticate with Google Apps Script
clasp login

# View project info
clasp list
```

### Local Development Workflow
```bash
# Push changes from local to Google Apps Script
clasp push

# Pull changes from Google Apps Script to local (after online edits)
clasp pull

# View logs from Apps Script execution
clasp logs

# Open the deployed webapp in browser (after clasp push)
clasp open --webapp
```

### Git Workflow
```bash
# Before committing changes, always check the diff
git diff

# After validating changes, commit with a clear message
git commit -m "description"

# After changes affecting Code.js or Index.html, run clasp push
clasp push
```

### Managing Backups
- Backups are created automatically in `backups_locais/` directory
- Backup files are ignored by `.claspignore` to prevent deployment
- Don't commit backup files; they're local-only for recovery

## Architecture & Data Flow

### Server-Side (Code.js - 2,073 lines)

**Core Modules:**

1. **Authentication & Authorization** (lines 1-800)
   - `loginPortal(cpf, senha)` - CPF-based login with password hashing (salt+hash)
   - `validarSessao(token)` - Session validation with 12-hour expiry
   - `obterContextoAcessoUsuarioPortal(token)` - Returns user access context (permissions + scopes)
   - Manages Users, Sessions, AccessLogs, AccessProfiles, UserScopes sheets in auth spreadsheet

2. **User Management** (lines 900-1100)
   - `listarUsuariosPortal(token)` - List users with access control
   - `criarUsuarioPortal(token, payload)` - Create new user
   - `editarUsuarioPortal(token, usuarioId, payload)` - Edit user details
   - `resetarSenhaUsuarioPortal(token, usuarioId)` - Force password reset
   - `salvarEscoposUsuarioPortal(token, usuarioId, escopos)` - Set access scopes

3. **Data Access & Filtering** (lines 1200-1400)
   - `obterDadosExcelAutenticado(token)` - Returns filtered base/metas/feriados per user scope
   - `filtrarBasePorEscopoPortal_(base, escopos)` - Scope-based row filtering
   - Filters by: site (col 81), produto (col 106), supervisor (col 9), tipo="Operador" (col 91)

4. **Data Sync from Excel** (lines 1500-1700)
   - `syncExcelToBridge()` - Imports BASE_DASH_EXPORT.xlsx → Bridge Google Sheets
   - Converts Excel → Google Sheets format, validates, normalizes time fields
   - Creates temp sheet, validates data, atomic swap with backup
   - Critical for keeping dashboard data current

**Constants & Configuration:**
```javascript
const ID_PLANILHA_DADOS = '1sTeO8derRRrW5eB9FglZmee_ya_2v0szvck8F900FJg'; // Data sheet
const ID_PLANILHA_AUTH = '1GJO1tynFgWm2j34wNpNSFOlErXJ9cyeGoW9Fntoucc8'; // Auth sheet
const DURACAO_SESSAO_HORAS = 12; // Session duration
const COLUNAS_AUTORIZACAO_DADOS = { // Column indices in Base sheet
  supervisor: 9,
  site: 81,
  tipo: 91,      // Must be "Operador" to include row
  produto: 106
};
```

### Client-Side (Index.html - 17,991 lines)

**Architecture:**
- Single-page application with modular view structure
- Global state: `dashboardAccessContext` (user + scopes), `cachedPortalData` (base/metas/feriados)
- Debounced rendering system with view-specific render queues
- Multi-select filter system with localStorage persistence

**Core Views** (each is a `<section class="app-view" id="view-*">`)
1. **view-resumo-geral** - Executive summary with KPI cards and projection
2. **view-produtividade** - Hierarchical table (Unit > Product > Supervisor > Operator)
3. **view-maturidade-operacao** - Maturity matrix and wave analysis
4. **view-curva-abc** - ABC curve analysis with Chart.js
5. **view-zerados-logados** - Idle and logged-in operators
6. **view-indicadores-operador** - Per-operator metrics with unit comparison
7. **view-raio-x-operador** - Deep operator analysis by month with guidance
8. **view-simulador** - Commission impact simulator
9. **view-admin-usuarios** - User management (admin only)

**Data Processing Pipeline:**
```
google.script.run.obterDadosExcelAutenticado(token)
  ↓
prepararBaseNormalizadaPortal() - Parse dates, times, normalize text
  ↓
processarDados(opcoes) - Compute aggregations, groupings, calculations
  ↓
View-specific render functions (renderizar*) - Generate HTML
  ↓
Apply to DOM with debouncing to prevent thrashing
```

**Key Functions:**
- `processarDados(opcoes)` (line 11263) - Main aggregation: groups by site/product/supervisor/operador
- `atualizarIndicadoresOperador()` (line 12724) - Hierarchical render for Produtividade view
- `renderizarViewAtivaPortal(nomeView)` (line 9171) - Route active view to render function
- `carregarContextoAcessoDashboard_()` (line 10233) - Load user access context from server

**Data Columns (Base Sheet):**
- Col 9: supervisor, Col 81: site, Col 91: tipo (must be "Operador"), Col 106: produto
- Col 120: Tempo de Casa (correct column), Col 131: Aderência Líquida (EB), Col 134: Ligações (EE)
- Time fields normalized from serial dates to seconds (parseSerialDate, parseDataBase)
- Only rows where CN (col 91) === "Operador" are included

**Rendering Strategy:**
- `solicitarRender*()` functions mark view as pending
- Debounced via `executarRenderDebouncedPortal()` with 500ms default wait
- Prevents duplicate renders during rapid filter changes
- View caching via `obterCachePortal()` / `salvarCachePortal()`

## Important Conventions & Rules

**From PROJECT_CONTEXT.md:**
1. Make **one change at a time**
2. Show `git diff` before applying changes
3. **Do not alter Code.js** without explicit permission
4. **Do not alter cards, comparativo, or fixed calculations** without permission
5. **Do not refactor widely** without asking first
6. **Keep HTML/CSS/JS changes isolated** - don't mix concerns
7. After local changes: `git diff` → validate → `git commit` → `clasp push`
8. Timestamps are UTC ISO format via `agoraIso_()`

**Data Assumptions:**
- Only include rows where CN (col 91) = "Operador" exactly
- Aderência Líquida: EB (col 131)
- Ligações: EE (col 134) as average
- Tempo de Casa: DQ (col 120) - **not EN** (col 143 is old/wrong)
- Time between calls already corrected
- Mês Referência Metas normalized via `normalizarMesReferenciaMetas()`

**Development Mode Settings:**
- Light theme default, dark theme via localStorage
- Theme toggle persists: `localStorage.setItem('portalTheme', 'dark')`
- Debug logs via `logDebugPortal()` if needed
- Cache clearing via `limparCachesFrontPortal()`

## File Structure

```
.
├── Code.js                    # Server: auth, data access, user mgmt (2,073 lines)
├── Index.html                 # Client: SPA with all views & styles (17,991 lines)
├── appsscript.json            # Apps Script manifest (timezone, services, permissions)
├── .clasp.json                # Clasp config (scriptId, rootDir)
├── jsconfig.json              # JS config (empty, for IDE hints)
├── package.json               # Minimal deps (@types/google-apps-script)
├── PROJECT_CONTEXT.md         # Development rules & data assumptions
├── AGENTS.md                  # This file
├── .git/                      # Git history (30+ commits, main & feature/aba-produtividade)
├── backups_locais/            # Local backup files (gitignored)
└── node_modules/              # @types (gitignored)
```

## Common Development Scenarios

### Adding a New Filter to a View
1. Add select/multi-select HTML element in view section
2. Update `criarMultiSelectPortal()` calls in initialization
3. Extract values with `obterValoresMultiSelectPortal(selectId)`
4. Pass to `processarDados({site: [...], produto: [...], ...})`
5. Trigger render via `solicitarRender<View>()`

### Fixing a Calculation Error
1. Identify the column index (cross-reference data assumptions)
2. Locate calculation in `processarDados()` or view-specific function
3. `git diff` to show the fix
4. Validate with test data
5. `git commit` and `clasp push`

### Adding a New View
1. Create `<section class="app-view" id="view-newview">` in HTML
2. Add nav item to sidebar (copy existing pattern)
3. Create `renderizarNewView()` function
4. Add to `renderizarViewAtivaPortal()` switch
5. Add `solicitarRenderNewView()` trigger function
6. Test view rendering with filters

### Syncing Excel Data
1. Run `syncExcelToBridge()` via clasp logs or Apps Script editor
2. Monitor sync logs via `clasp logs` for warnings
3. Verify data in Bridge Google Sheets "Base" sheet
4. Clear frontend cache via `limparCachesFrontPortal()` if needed
5. Reload webapp to pull fresh data

## Debugging & Troubleshooting

**Apps Script Logs:**
```bash
clasp logs
```
Shows execution logs from server functions, useful for auth/sync debugging.

**Browser Console:**
- Check network tab for `google.script.run` calls
- `dashboardAccessContext` - current user auth context
- `cachedPortalData` - cached base/metas/feriados
- `logDebugPortal()` for custom debug output

**Common Issues:**
- **"Sessão inválida"**: Token expired or user logged out, reload page
- **No data showing**: Check `obterDadosExcelAutenticado` response in network tab
- **Filters not working**: Verify `processarDados` is called after filter change
- **Sync failing**: Check Base sheet exists, Excel file readable, columns aligned

## Dependencies & External Services

**NPM:**
- `@types/google-apps-script` - TypeScript types for IDE hints

**External Libraries (CDN in Index.html):**
- `Chart.js` 3.9.1 - Charting for Curva ABC view
- `chartjs-plugin-datalabels` 2.0.0 - Data labels on charts
- Google Fonts: `Inter` - UI font

**Google Services:**
- Google Sheets API (Bridge & Data sheets)
- Google Drive API (Excel file sync)
- Google Apps Script (deployment & runtime)

**Scopes Required:**
- `spreadsheets` - Read/write Base, Metas, Feriados, Auth sheets
- `drive` - Read Excel file for sync

## Performance Considerations

- **Rendering debounce**: 500ms default to prevent DOM thrashing during rapid filter changes
- **Cache layer**: `cachedPortalData` prevents repeated server calls
- **Sheet data normalized**: Time fields converted to seconds on load for faster calculations
- **Lazy view rendering**: Only active view renders, others stay hidden
- **Multi-select optimization**: Stores normalized values for fast filtering

## Security Notes

- Passwords hashed with salt (SHA-256 via Apps Script Utilities)
- Session tokens hashed before storage
- User scopes enforce row-level filtering (no client-side bypass possible)
- HTML escaping in user-generated content via `escapeHtmlPortal_()`
- CSRF protection via Apps Script's built-in session handling
---

# LLM Wiki Karpathy

This project must maintain a persistent LLM Wiki to preserve architectural decisions, business rules, debugging history, risks, contradictions, and operational context.

## Purpose

The wiki exists so Codex does not repeatedly rediscover the same facts, reintroduce old bugs, or make broad changes without understanding the project history.

## Core Rules

1. Before making relevant changes, check the wiki context.
2. After solving a meaningful problem, update the wiki.
3. Register business rules separately from technical implementation.
4. Register known bugs, fixes, and decisions.
5. Never overwrite project rules already defined in this AGENTS.md.
6. Never change Code.js without explicit permission.
7. Prefer small, surgical changes.
8. Always show the expected diff before applying risky changes.
9. When there is uncertainty, state the assumption before editing.
10. Keep a log of important changes and why they were made.

## Suggested Wiki Structure

Create and maintain this structure:

```text
wiki/
  index.md
  overview.md
  log.md
  decisions.md
  risks.md
  business-rules.md
  technical-architecture.md
  known-issues.md
  pages/
raw/