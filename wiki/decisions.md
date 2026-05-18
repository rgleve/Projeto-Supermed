# Decisões de Arquitetura

Registro de decisões técnicas significativas, com justificativa.

## Formato

```
### [DATA] Título da decisão
**Contexto:** por que a decisão foi necessária
**Decisão:** o que foi escolhido
**Motivo:** por que essa opção e não outra
**Consequência:** o que isso implica para o futuro
```

---

### [2025] Arquitetura monolítica (dois arquivos grandes)

**Contexto:** Google Apps Script impõe restrições: apenas arquivos `.gs` e `.html` são suportados como unidades de deploy.

**Decisão:** Todo o servidor fica em `Code.js` e todo o cliente em `Index.html`.

**Motivo:** A plataforma não suporta múltiplos arquivos JS client-side de forma nativa sem bundler externo. Manter dois arquivos simplifica o deploy via `clasp`.

**Consequência:** Arquivos grandes (2k e 18k linhas). Navegação requer busca por nome de função. Mudanças cirúrgicas são obrigatórias para não introduzir regressões.

---

### [2025] Coluna Tempo de Casa = DQ (col 120), não EN (col 143)

**Contexto:** Havia duas colunas candidatas para "Tempo de Casa" na Base.

**Decisão:** Usar coluna 120 (DQ).

**Motivo:** Coluna 143 (EN) é antiga/incorreta e foi descartada após validação.

**Consequência:** Qualquer referência à col 143 para Tempo de Casa é um bug.

---

### [2025] Filtro de escopo aplicado no servidor

**Contexto:** Dados sensíveis de operadores de diferentes unidades não podem vazar entre perfis.

**Decisão:** `filtrarBasePorEscopoPortal_()` roda no servidor antes de retornar os dados ao cliente.

**Motivo:** Segurança — o cliente não pode ser confiado para aplicar restrições de acesso.

**Consequência:** Clientes recebem apenas as linhas autorizadas. Não há dado extra trafegando.

---

### [2025] Debounce de 500ms no rendering

**Contexto:** Filtros multi-select disparam eventos rapidamente quando o usuário seleciona múltiplas opções.

**Decisão:** `executarRenderDebouncedPortal()` aguarda 500ms de inatividade antes de renderizar.

**Motivo:** Evita thrashing de DOM com renders intermediários desnecessários.

**Consequência:** Pequeno delay perceptível após a última seleção, mas rendering muito mais eficiente.
