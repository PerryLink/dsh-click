<div align="center">

# 🖱️ dsh-click

**Controle nativo de desktop multiplataforma para o DeepSeek Harness — Windows primeiro.**

*Olhe para a tela e então aja — cada clique autorizado, cada ação auditada.*

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![DSH plugin](https://img.shields.io/badge/dsh-plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-click/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-click/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-click?label=version)](https://github.com/PerryLink/dsh-click/releases)
[![npm version](https://img.shields.io/npm/v/dsh-click)](https://www.npmjs.com/package/dsh-click)
[![npm downloads](https://img.shields.io/npm/dm/dsh-click)](https://www.npmjs.com/package/dsh-click)

[English](README.md) · [简体中文](README.zh.md) · [Español](README.es.md) · [Português](README.pt.md) · [हिन्दी](README.hi.md)

</div>

---

## Compatibilidade

| Superfície | Status |
|---|---|
| Harness | DeepSeek Harness `0.1.1-rc.2` |
| Node | `^22.19.0 \|\| >=24.0.0` |
| Plataformas | **Windows primeiro** (UIAutomation + entrada Win32, via um helper PowerShell embutido); os backends macOS/Linux estão reservados e falham fechado com um motivo claro |
| Modelo | Modelos somente texto totalmente suportados (`screen_read` retorna texto estruturado); modelos com visão recebem também as imagens do `screen_shot` |

## O que você ganha

O `dsh-click` dá ao harness um ciclo completo de observar → agir sobre aplicativos de desktop nativos:

- **`screen_shot`** — captura de uma janela (ou da tela principal), reduzida a um limite configurável. Com um modelo com visão o resultado traz a imagem; caso contrário, uma descrição em texto mantém os modelos somente texto funcionando.
- **`screen_read`** — a observação estruturada: a árvore de acessibilidade da janela (ids de elementos, tipos, nomes, retângulos, padrões suportados) mais dicas de pixels com cores — texto puro, sem exigir modelo de imagem.
- **`click` / `type` / `scroll` / `key`** — ações limitadas à janela, endereçadas por id de elemento ou coordenadas. A entrega prefere UIA invoke e recorre a mensagens de janela postadas — e **nunca rouba o foco em primeiro plano**.
- **`app_list` / `app_launch`** — enumera os aplicativos em execução e suas janelas; inicia um por nome ou caminho.

Toda ação mutante cruza uma mesma fronteira de segurança:

1. **Atualidade** — a ação deve citar uma observação `basedOn`; a janela é recapturada logo antes de agir e a ação é recusada se a tela mudou (hash de pixels + limite de idade).
2. **Aprovação** — `ctx.approval` protege cada ação por padrão; regex de título/executável podem liberar janelas específicas (ainda auditadas).
3. **Identidade do processo** — o pid e o caminho do executável dono são verificados antes **e** depois do ato; uma mudança recusa o resultado em voz alta.
4. **Auditoria** — observações e ações entram no registro de sessão como eventos `dsh-click/observed` / `dsh-click/action` (sanitizados, somente registro).

```text
modelo                          harness
  │ screen_read ──▶ observationId (+ elementos, pixels)        ← texto estruturado
  │ click {basedOn, target} ──▶ verificação de atualidade ──▶ aprovação ──▶ helper (UIA)
  │                             hash de pixels mudou? ── recusar + reobservar
  │                             pid/exe mudou após o ato? ── PROCESS_CHANGED
  │ ◀── JSON canônico + eventos de auditoria (dsh-click/action)
```

## Início rápido

```sh
# 1. instale o bundle no seu perfil
dsh plugin --profile web add "github:PerryLink/dsh-click#main"

# ou pelo npm (versões publicadas)
dsh plugin --profile web add dsh-click

# 2. reinicie e verifique a linha
dsh --profile web --dump-config | grep -A2 'id: dsh-click'
```

Depois peça ao agente para olhar uma janela e agir — o aviso de aprovação aparece em toda ação mutante:

```
> Abra o Bloco de Notas, digite "olá" e leia de volta o que está na tela.
```

## Instalação e desinstalação

- **Canal git** (último `main`): `dsh plugin --profile web add "github:PerryLink/dsh-click#main"` — o script `prepare` compila apenas com dependências de produção.
- **Canal npm** (versões publicadas): `dsh plugin --profile web add dsh-click`.
- **Canal tarball**: `pnpm pack` neste repositório e então `dsh plugin --profile web add ./dsh-click-<version>.tgz`.
- **Desinstalar**: `dsh plugin --profile web remove dsh-click` (ou remova a linha do patch do perfil).

> Se o pnpm reportar `ERR_PNPM_IGNORED_BUILDS` para este pacote (a validação inofensiva do binário de plataforma do esbuild), adicione `allowBuilds: { esbuild: true }` ao seu `pnpm-workspace.yaml` — o CLI `dsh` imprime o trecho exato.

## Configuração

Todos os ajustes são campos `Config` do Schemastery (alteráveis pelo cordis.yml). Uma sobrescrita direcionada por id substitui a linha inteira — redeclare cada chave que precisar. O `cordis.patch.yml` documenta cada chave em linha.

| Chave | Padrão | Significado |
|---|---|---|
| `requireApproval` | `true` | Proteger toda ação mutante atrás da aprovação; observadores nunca perguntam |
| `autoApproveWindows` | `[]` | Regex de título de janela/caminho de executável que pulam a pergunta de aprovação (ainda passam por atualidade e auditoria) |
| `auditSessionEvents` | `true` | Acrescenta eventos de auditoria `dsh-click/observed`/`dsh-click/action` à sessão; defina `false` quando o leitor de sessões do harness não reconhecer esses tipos (lista branca estática do DeepSeek Harness rc.6–rc.8) — um log com eles recusa a retomada |
| `focusFallback` | `never` | Se uma ação pode trazer a janela alvo ao primeiro plano como último recurso (`never` / `allow`) |
| `imageMode` | `auto` | Renderização do `screen_shot`: `auto` (imagem quando o modelo aceita imagens, texto caso contrário) ou `text` |
| `helperTimeoutMs` | `30000` | Tempo limite por chamada ao helper em ms (1..300000) |
| `maxHelperOutputBytes` | `25165824` | Limite de uma resposta do helper em bytes (1024..67108864) |
| `maxScreenshotSide` | `2560` | Maior lado da captura em pixels (320..7680); capturas maiores são reduzidas |
| `staleCheckPixels` | `true` | Comparar um hash de pixels novo antes de cada ação e recusar se mudou |
| `maxObservationAgeMs` | `30000` | Idade máxima em ms de uma observação que uma ação pode citar (1000..600000) |
| `maxCachedObservations` | `8` | Limite LRU de observações em cache (1..64) |
| `maxElements` | `500` | Limite de elementos de acessibilidade por `screen_read` (1..2000) |
| `maxTreeDepth` | `32` | Profundidade máxima do percurso da árvore de acessibilidade (1..64) |
| `maxTextLength` | `200` | Comprimento de truncamento das strings visíveis ao modelo (16..10000) |
| `rollbackEnabled` | `true` | Fazer backup e restaurar o texto do controle quando `type` falha |

Exemplo de sobrescrita no patch do seu perfil:

```yaml
- insert:
    - id: dsh-click
      name: dsh-click
      config:
        requireApproval: true
        autoApproveWindows: ['^Notepad']
        focusFallback: never
```

## Ferramentas e superfícies

| Ferramenta | Somente leitura | Requer aprovação | Notas |
|---|---|---|---|
| `screen_shot` | ✅ | — | Retorna um `observationId` que ações posteriores citam em `basedOn`; anexo de imagem quando o modelo aceita imagens |
| `screen_read` | ✅ | — | Árvore de acessibilidade + dicas de pixels; os ids de elementos são o endereçamento das ações |
| `click` | | ✅ | Exatamente um de `elementId` ou `(x, y)`; prefere UIA invoke, com mensagens postadas como fallback |
| `type` | | ✅ | Somente elementos com padrão de valor; faz backup e restaura o texto do controle em falha |
| `scroll` | | ✅ | Elemento (padrão scroll) ou janela (roda postada) |
| `key` | | ✅ | Combinações de teclas postadas (`"Ctrl+S"`); apps que ignoram entrada postada recusam em voz alta |
| `app_list` | ✅ | — | Aplicativos em execução e suas janelas visíveis |
| `app_launch` | | ✅ | Por nome ou caminho do executável, com argumentos opcionais |

## Permissões e dados

- **Permissões**: ações mutantes cruzam a costura oficial `ctx.approval` — o plugin nunca a reimplementa nem a contorna. A lista de permissão apenas *pula a pergunta para janelas específicas*; não pode desativar as verificações de atualidade nem de identidade do processo.
- **Dados**: o plugin não grava nada em disco além das capturas mantidas pelo armazenamento de anexos (endereçadas por conteúdo, sob a política de anexos do harness). Observações ficam em memória (LRU limitado). Sem requisições de rede, sem armazenamento de credenciais.
- **Registro de sessão**: `dsh-click/observed` e `dsh-click/action` são eventos de auditoria somente-registro com fatos sanitizados de janela/processo — títulos, caminhos e texto livre são redigidos e truncados antes de serem gravados ou exibidos.

## Limites de segurança

- **Observe antes de agir, sempre.** Ações devem citar uma observação atual; uma tela mudada (hash de pixels) ou uma observação expirada é recusada com um motivo legível pelo modelo exigindo nova observação.
- **Aprovação é o padrão.** `requireApproval: true` a menos que você libere explicitamente janelas específicas; toda ação — liberada ou não — é auditada.
- **Sem roubo de foco.** O helper nunca traz a janela alvo ao primeiro plano (`focusFallback: 'never'` por padrão); a entrada é entregue via UIA ou mensagens postadas para não perturbar janelas em segundo plano.
- **A identidade do processo é reverificada** imediatamente antes e depois de cada ação; uma troca de processo no meio faz o resultado falhar (`PROCESS_CHANGED`).
- **Saída sanitizada.** Caracteres de controle são removidos, tabulações colapsam e valores com forma de credencial (chaves, tokens, JWT, cabeçalhos bearer) são redigidos antes de chegar ao modelo ou ao registro.
- **Falha fechada.** Plataformas não suportadas, um serviço de subprocesso ausente ou um helper indisponível recusam cada chamada em voz alta — perfis continuam inicializando em todo lugar.

## Limitações conhecidas

- **Windows primeiro.** Os backends macOS e Linux estão reservados; nessas plataformas cada chamada falha fechado com um motivo claro.
- **Fidelidade somente texto.** O `screen_read` depende de o aplicativo expor UIAutomation; apps sem árvore acessível oferecem apenas dicas de pixels. Cliques por coordenadas continuam disponíveis.
- **Apps de entrada postada.** Alguns aplicativos ignoram mensagens de janela postadas (jogos, algumas superfícies Electron); o `key` informa isso com honestidade em vez de fingir sucesso.
- **Auditoria de sessão em builds do harness até rc.8.** Os eventos de auditoria usam a forma de dois argumentos de `Session.append` (os peers `0.1.0-rc.6`–`0.1.0-rc.8` não expõem opção de envelope de append para eventos de plugin); nesses builds os eventos são required-on-read, e um leitor de sessões de lista branca estática (rc.6–rc.8 `KNOWN_SESSION_EVENT_TYPES`) recusa retomar um log que os contenha salvo se `auditSessionEvents` for `false`.

## Desenvolvimento

```sh
pnpm install        # node ^22.19 || >=24
pnpm run typecheck  # tsc: src + tests contra o checkout local do harness
pnpm run typecheck:ci  # tsc contra os tipos publicados 0.1.1-rc.2 (sem paths)
pnpm test           # vitest: 66 testes, 11 arquivos (o smoke do helper roda no Windows)
pnpm run build      # bundle tsdown + declarações tsc (lib/)
pnpm run verify:self-contained  # especificações de dependências resolvem pelo registry
pnpm run verify:artifacts       # face ESM construída + helper nativo presentes
pnpm pack           # o tarball publicado
```

## Topics

`dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `cordis`, `computer-use`, `windows-automation`, `uiautomation`, `desktop-control`, `screen-reader`

## Contributors

- [@PerryLink](https://github.com/PerryLink) — criador e mantenedor: superfície de ferramentas, fronteira de segurança das ações, helper nativo do Windows, sanitizadores e a documentação em cinco idiomas.

## PerryLink DSH Plugin Family

Este projeto é um dos [29 complementos do DeepSeek Harness](https://github.com/PerryLink) mantidos por [PerryLink](https://github.com/PerryLink). Se este ajuda você, os outros provavelmente também ajudarão:

| Plugin | One-liner |
|---|---|
| [dsh-auto-review](https://github.com/PerryLink/dsh-auto-review) | Auto-revisão com segundo modelo na cadeia de aprovação, falha fechada por padrão |
| [dsh-background-agents](https://github.com/PerryLink/dsh-background-agents) | Agentes filhos em segundo plano e duráveis com barra lateral Web, mensagens e interrupção |
| [dsh-budget](https://github.com/PerryLink/dsh-budget) | Governança de custos para DeepSeek Harness: orçamentos, carbono e latência em um painel. |
| [dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind) | Equivalente ao /rewind do Claude Code: instantâneos, bifurcações e restauração de uma vez |
| [dsh-claude-move](https://github.com/PerryLink/dsh-claude-move) | Migra sessões, memória, skills e CLAUDE.md do Claude Code para o DSH |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** | Controle de desktop nativo multiplataforma para DeepSeek Harness — Windows primeiro. |
| [dsh-composer-history](https://github.com/PerryLink/dsh-composer-history) | Histórico de entrada estilo terminal para o compositor web: setas, busca Ctrl+R |
| [dsh-defend](https://github.com/PerryLink/dsh-defend) | Defesa contra injeção de prompt, jailbreak e vazamento de segredos para DeepSeek Harness. |
| [dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck) | Guarda de disciplina de engenharia: sabatina de requisitos, portões de teste, revisão adversária |
| [dsh-draw](https://github.com/PerryLink/dsh-draw) | Roteamento unificado de geração de imagens estáticas para DeepSeek Harness. |
| [dsh-fast](https://github.com/PerryLink/dsh-fast) | Diagnóstico de desempenho somente leitura para DeepSeek Harness. |
| [dsh-github](https://github.com/PerryLink/dsh-github) | Integração de PR/issues do GitHub para DSH, toda escrita com aprovação |
| [dsh-library](https://github.com/PerryLink/dsh-library) | Base de conhecimento documental local para DeepSeek Harness. |
| [dsh-local-ai](https://github.com/PerryLink/dsh-local-ai) | Integração de modelos locais (Ollama) para DeepSeek Harness. |
| [dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions) | Diagnóstico, formatação, completação, ações e renomeação LSP via servidores de linguagem |
| [dsh-mask](https://github.com/PerryLink/dsh-mask) | Middleware de mascaramento de PII para DeepSeek Harness — anonimiza antes do modelo e restaura na camada de exibição. |
| [dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel) | Painel MCP somente leitura: comando /mcp + aba de configurações com status, ferramentas e erros |
| [dsh-memento](https://github.com/PerryLink/dsh-memento) | Memória entre sessões com porta de aprovação: seam ctx.memory + SQLite + ferramenta memory |
| [dsh-observe](https://github.com/PerryLink/dsh-observe) | Exportador de observabilidade OpenTelemetry e Langfuse para DeepSeek Harness. |
| [dsh-output-styles](https://github.com/PerryLink/dsh-output-styles) | Troca de estilos em tempo de execução equivalente ao outputStyles do Claude Code |
| [dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules) | Regras declarativas allow/deny/ask estilo Claude Code com auditoria |
| [dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide) | Base de conhecimento de desenvolvimento de plugins como skill de agente sob demanda |
| [dsh-score](https://github.com/PerryLink/dsh-score) | Pontuação de qualidade multidimensional para plugins do DeepSeek Harness. |
| [dsh-session-pin](https://github.com/PerryLink/dsh-session-pin) | Fixa sessões na barra lateral Web com ordenação durável |
| [dsh-session-sync](https://github.com/PerryLink/dsh-session-sync) | Sincronização de sessões entre dispositivos para DeepSeek Harness — um espelho git dedicado do seu armazenamento de sessões. |
| [dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security) | Pacote de skills de auditoria de segurança: varredura de segredos, revisão de dependências e cadeia de suprimentos |
| [dsh-talk](https://github.com/PerryLink/dsh-talk) | Loop de sessão com voz para DeepSeek Harness: fale e ouça a resposta. |
| [dsh-test-drive](https://github.com/PerryLink/dsh-test-drive) | Testes isolados de instalação e inicialização para plugins do DeepSeek Harness. |
| [dsh-translate](https://github.com/PerryLink/dsh-translate) | Tradução de parâmetros entre fornecedores e reparo determinístico de JSON para DeepSeek Harness. |

## License

[Apache License 2.0](LICENSE) © 2026 dsh-click contributors
