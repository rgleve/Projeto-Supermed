# Regras de Negócio

Premissas dos dados e regras operacionais que devem ser respeitadas em qualquer alteração no código.

## Filtragem de linhas da Base

- **Somente linhas onde coluna CN (col 91) === `"Operador"`** são incluídas.
- Linhas de supervisores, coordenadores, etc. são excluídas automaticamente.

## Colunas críticas (índices base-0)

| Indicador | Coluna correta | Observação |
|---|---|---|
| Tempo de Casa | 120 (DQ) | Col 143 (EN) existe mas está errada — não usar |
| Aderência Líquida | 131 (EB) | |
| Ligações | 134 (EE) | Exibido como média |
| Tempo entre chamadas | — | Já corrigido; não reprocessar |

## Metas

- O campo `Mês Referência Metas` é normalizado pela função `normalizarMesReferenciaMetas()` antes de qualquer comparação.
- Não comparar strings de mês sem normalizar.

## Escopos de acesso

- Usuários têm escopos que restringem as linhas visíveis: site, produto, supervisor.
- O filtro é aplicado **no servidor** em `filtrarBasePorEscopoPortal_()`.
- Não existe bypass possível pelo cliente — o servidor entrega apenas os dados permitidos.

## Sessões

- Expiram em **12 horas** (`DURACAO_SESSAO_HORAS = 12`).
- Após expiração, o usuário recebe `"Sessão inválida"` e deve relogar.

## Senhas

- Hash SHA-256 com salt via `Utilities.computeDigest()` do Apps Script.
- Tokens de sessão também são hasheados antes de armazenar.

## Timestamps

- Sempre em formato UTC ISO via `agoraIso_()`.
- Nunca usar `new Date().toString()` diretamente.

## Restrições de alteração

- **Não alterar cards, comparativo, ou cálculos fixos** sem permissão explícita.
- **Não alterar Code.js** sem permissão explícita.
- Uma mudança de cada vez; mostrar `git diff` antes de aplicar.
