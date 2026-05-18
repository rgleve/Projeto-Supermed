# Riscos e Alertas de Manutenção

Pontos frágeis do sistema que exigem atenção especial.

## Riscos ativos

### ALTO — Arquivos monolíticos grandes

`Code.js` (~2k linhas) e `Index.html` (~18k linhas) são difíceis de navegar. Uma mudança em local errado pode quebrar múltiplas views ou módulos sem aviso imediato.

**Mitigação:** Sempre uma mudança cirúrgica de cada vez. Nunca refatorar amplamente sem permissão.

---

### ALTO — Índices de coluna hardcoded

Todos os campos da Base são referenciados por índice numérico (col 9, 81, 91, 106, 120, 131, 134…). Se o layout do Excel mudar, todos os índices ficam errados silenciosamente.

**Mitigação:** Consultar [business-rules.md](business-rules.md) antes de qualquer alteração de coluna. Validar contra a planilha Bridge após sync.

---

### MÉDIO — Sem testes automatizados

Não há suite de testes. Regressões só são detectadas visualmente no webapp após `clasp push`.

**Mitigação:** Validar manualmente a view afetada após cada mudança. Usar `clasp logs` para erros de servidor.

---

### MÉDIO — Quota de execução do Apps Script

Google Apps Script tem limites de tempo de execução (6 min por execução) e cotas diárias. `syncExcelToBridge()` com arquivos grandes pode atingir o limite.

**Mitigação:** Monitorar duração do sync via `clasp logs`. Se próximo do limite, considerar sync incremental.

---

### BAIXO — Cache de frontend desatualizado

`cachedPortalData` persiste na sessão. Se a planilha for atualizada no servidor, o cliente não percebe sem recarregar.

**Mitigação:** Usuários podem forçar atualização via `limparCachesFrontPortal()` no console.

---

### BAIXO — Dependência de CDN externo

`Chart.js` e `chartjs-plugin-datalabels` são carregados de CDN em `Index.html`. Indisponibilidade do CDN quebra a view Curva ABC.

**Mitigação:** Em caso de problemas, baixar as libs e servi-las localmente via Apps Script.
