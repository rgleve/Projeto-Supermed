# Dashboard Supermed - Contexto do Projeto

## Ambiente
Projeto em Google Apps Script usando VS Code e clasp.

## Arquivos principais
- Code.js: backend Apps Script. Não alterar salvo pedido explícito.
- Index.html: frontend com HTML, CSS e JavaScript.

## Estado atual
- Portal Supermed funcionando.
- Módulo Indicadores Operador / Supervisão criado.
- Cards-resumo funcionam com dados reais.
- Comparativo por Unidade funciona com dados reais.
- Visão Hierárquica usa dados reais.
- Visão Hierárquica renderiza: Unidade > Produto > Supervisor > Tempo de Casa > Operador.
- Visão Hierárquica tem expandir/recolher.
- Modo Executivo / Completo existe via fIndModo.
- fIndModo chama atualizarIndicadoresOperador().
- ordenarTempoCasaIndicadores já existe.
- A tabela hierárquica usa tbody id="indHierarchyBody".
- Existe CSS liquid glass em evolução.
- Correção de scroll foi aplicada no CSS.

## Premissas de dados
- Usar somente linhas em que CN, índice 91, seja exatamente "Operador".
- Aderência Líquida usa EB, índice 131.
- Ligações usa EE, índice 134, como média.
- Tempo entre chamadas já foi corrigido.
- Tempo de Casa correto é DQ, índice 120.
- Tempo de Casa anterior EN, índice 143, estava errado.

## Regras de trabalho
- Uma mudança por vez.
- Mostrar diff antes de aplicar.
- Não alterar Code.js sem autorização.
- Não alterar cards, comparativo ou cálculos já corrigidos sem pedido explícito.
- Não fazer refatoração ampla sem pedir.
- Não mexer em HTML/JS quando a tarefa for só CSS.
- Não mexer em CSS quando a tarefa for só lógica.
- Depois de aplicar mudanças locais, rodar git diff antes de commit.
- Depois de validar, fazer commit.
- Depois de mudanças que precisam ir ao Apps Script, rodar clasp push.
