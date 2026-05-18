# Issues Conhecidos

Bugs conhecidos, comportamentos esperados que podem parecer bugs, e workarounds ativos.

## Formato

```
### [STATUS] Título
**Sintoma:** o que o usuário vê
**Causa:** raiz do problema
**Workaround / Solução:** o que fazer
**Notas:** contexto adicional
```

Status: `ABERTO` | `RESOLVIDO` | `COMPORTAMENTO ESPERADO` | `WON'T FIX`

---

### [COMPORTAMENTO ESPERADO] "Sessão inválida" após ~12h

**Sintoma:** Usuário recebe mensagem de sessão inválida sem ter feito nada errado.

**Causa:** Sessões expiram em 12 horas por design (`DURACAO_SESSAO_HORAS = 12`).

**Workaround:** Recarregar a página e relogar.

---

### [RESOLVIDO] Tempo entre chamadas calculado incorretamente

**Sintoma:** Métrica de tempo entre chamadas exibia valor errado.

**Causa:** Campo não estava sendo normalizado corretamente.

**Solução:** Corrigido. O campo já está tratado — não reprocessar.

---

### [RESOLVIDO] Coluna Tempo de Casa usava índice errado (col 143)

**Sintoma:** Tempo de Casa exibia valor zerado ou incorreto.

**Causa:** Código referenciava coluna EN (143) que é antiga.

**Solução:** Corrigido para coluna DQ (120). Ver [decisions.md](decisions.md).

---

### [ABERTO] Sync Excel falha silenciosamente se arquivo não encontrado

**Sintoma:** `syncExcelToBridge()` não lança erro visível se `BASE_DASH_EXPORT.xlsx` não estiver no Drive.

**Causa:** Tratamento de erro incompleto no fluxo de sync.

**Workaround:** Verificar via `clasp logs` após cada sync. Confirmar que o arquivo existe no Drive antes de rodar.

**Notas:** Não alterar Code.js para corrigir sem permissão explícita.
