# Log de Mudanças

Histórico cronológico de alterações relevantes feitas no sistema.

## Formato

```
### [YYYY-MM-DD] Título da mudança
**Arquivo:** qual arquivo foi alterado
**O que mudou:** descrição objetiva
**Por quê:** motivação
**Impacto:** o que pode ter sido afetado
```

---

### [2025] Inicialização da LLM Wiki

**Arquivo:** `wiki/` (nova estrutura)

**O que mudou:** Criação da estrutura inicial da wiki com index, overview, arquitetura técnica, regras de negócio, decisões, issues conhecidos, riscos e log.

**Por quê:** Preservar contexto arquitetural e regras de negócio para futuras instâncias de Claude Code, evitando redescoberta de fatos já conhecidos.

**Impacto:** Nenhum impacto em arquivos funcionais.

---

### [2025] Correção da coluna Tempo de Casa

**Arquivo:** `Index.html`

**O que mudou:** Índice da coluna Tempo de Casa corrigido de 143 (EN, errada) para 120 (DQ, correta).

**Por quê:** Valor exibido estava incorreto.

**Impacto:** View Produtividade e qualquer view que exiba Tempo de Casa.

---

### [2025] Correção de ligações e tempo entre chamadas

**Arquivo:** `Index.html`

**O que mudou:** Campos de ligações e tempo entre chamadas corrigidos.

**Por quê:** Métricas exibiam valores incorretos.

**Impacto:** Métricas de produtividade dos operadores.

---

_Adicionar entradas aqui sempre que uma mudança relevante for feita._
