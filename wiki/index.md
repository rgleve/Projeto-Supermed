# Wiki — Dashboard Operacional

LLM Wiki do projeto **dashboard-operacional** (Rede Assist 24H).

## Arquivos desta wiki

| Arquivo | Conteúdo |
|---|---|
| [overview.md](overview.md) | Visão geral do sistema, stack e fluxo de dados |
| [technical-architecture.md](technical-architecture.md) | Arquitetura técnica detalhada (Code.js + Index.html) |
| [business-rules.md](business-rules.md) | Regras de negócio e premissas dos dados |
| [decisions.md](decisions.md) | Decisões de arquitetura e design tomadas |
| [known-issues.md](known-issues.md) | Bugs conhecidos e comportamentos esperados |
| [risks.md](risks.md) | Riscos, pontos frágeis e alertas de manutenção |
| [log.md](log.md) | Histórico cronológico de mudanças relevantes |
| [pages/](pages/) | Artigos aprofundados por tema específico |

## Diretório `raw/`

Arquivos brutos de entrada (exports, dumps, CSVs) usados para análise e sync. Nunca commitados.

## Como usar

- **Antes de alterar** algo relevante: leia o contexto da wiki.
- **Depois de resolver** um problema significativo: atualize a wiki.
- Regras de negócio ficam em `business-rules.md`, não em comentários de código.
- Decisões técnicas com justificativa ficam em `decisions.md`.
