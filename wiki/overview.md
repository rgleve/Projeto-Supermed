# Visão Geral do Sistema

## O que é

Portal operacional web da **Rede Assist 24H**, exibindo indicadores em tempo real para equipes de operação de saúde. Desenvolvido em Google Apps Script (servidor) + JavaScript puro (cliente).

## Stack

| Camada | Tecnologia |
|---|---|
| Servidor | Google Apps Script (Code.js) |
| Cliente | Vanilla JS + HTML/CSS (Index.html) |
| Dados | Google Sheets (Bridge) sincronizado via Excel |
| Deploy | `clasp push` → Google Apps Script |
| Autenticação | CPF + senha com hash SHA-256 + salt |

## Fluxo de dados principal

```
BASE_DASH_EXPORT.xlsx (Drive)
  ↓  syncExcelToBridge()
Google Sheets "Base" (Bridge)
  ↓  obterDadosExcelAutenticado(token)
Cache do cliente (cachedPortalData)
  ↓  prepararBaseNormalizadaPortal()
Base normalizada (datas, tempos em segundos)
  ↓  processarDados(opcoes)
Agregações por site / produto / supervisor / operador
  ↓  renderizar*()
Views do dashboard (debounce 500ms)
```

## Planilhas Google envolvidas

| ID | Propósito |
|---|---|
| `1sTeO8derRRrW5eB9FglZmee_ya_2v0szvck8F900FJg` | Dados (Base, Metas, Feriados) |
| `1GJO1tynFgWm2j34wNpNSFOlErXJ9cyeGoW9Fntoucc8` | Auth (Users, Sessions, AccessLogs, Profiles, UserScopes) |

## Views disponíveis

1. **Resumo Geral** — KPIs executivos e projeção
2. **Produtividade** — tabela hierárquica Unidade > Produto > Supervisor > Operador
3. **Maturidade da Operação** — matriz de maturidade e análise de ondas
4. **Curva ABC** — classificação ABC com Chart.js
5. **Zerados / Logados** — operadores ociosos e logados
6. **Indicadores por Operador** — métricas individuais com comparativo
7. **Raio-X do Operador** — análise mensal aprofundada
8. **Simulador** — impacto de comissão
9. **Admin Usuários** — gestão de usuários (admin only)
