<div align="center">

# 🖱️ dsh-click
- **Canal 1024 store**: `npm i -g dsh1024` uma vez, depois `dsh1024 plugin --profile web add dsh-click` (conta para o ranking de instalações do [deepseek1024.com](https://deepseek1024.com)).

**Controle nativo de desktop multiplataforma para o DeepSeek Harness — Windows primeiro.**

*Olhe para a tela e então aja — cada clique autorizado, cada ação auditada.*

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Gitee](https://img.shields.io/badge/Gitee-mirror-c71d23?logo=gitee)](https://gitee.com/perrylink/dsh-click)
[![DSH plugin](https://img.shields.io/badge/dsh--plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![dsh-doctor](https://raw.githubusercontent.com/PerryLink/dsh-plugin-doctor/main/badges/PerryLink__dsh-click.svg)](https://github.com/PerryLink/dsh-plugin-doctor#verified-徽章)
[![DSH Market](https://raw.githubusercontent.com/2BingLing/dsh-market/master/assets/readme/badge-listed-en.svg)](https://dsh.market/)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-click/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-click/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-click?label=version)](https://github.com/PerryLink/dsh-click/releases)
[![npm version](https://img.shields.io/npm/v/dsh-click)](https://www.npmjs.com/package/dsh-click)
[![npm downloads](https://img.shields.io/npm/dm/dsh-click)](https://www.npmjs.com/package/dsh-click)
[![dshfind](https://dshfind.com/api/badge/PerryLink/dsh-click?metric=downloads&lang=pt)](https://dshfind.com/pt/plugins/PerryLink/dsh-click?ref=badge)

[English](README.md) · [简体中文](README-zh.md) · [Español](README-es.md) · [Português](README-pt.md) · [हिन्दी](README-hi.md)

</div>

---

## Compatibilidade

| Superfície | Status |
|---|---|
| Harness | DeepSeek Harness `dsh-v0.1.7-alpha.1` (tag do GitHub, verificado em 2026-09-11). Verificado em 2026-09-11 contra o checkout master dsh-v0.1.7-alpha.1 (cadeia completa de gates + smoke de instalação de perfil). |
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
| `auditSessionEvents` | `true` | Acrescenta eventos de auditoria `dsh-click/observed`/`dsh-click/action` à sessão. A porta adaptativa já omite o append em hosts sem envelope (rc.6–rc.8, 0.1.1-rc.2 e 0.1.2-rc.1, que falha fechado para tipos desconhecidos na leitura); defina `false` para interromper totalmente os appends de auditoria 0.1.2-rc.1 (adaptado em 2026-09-02): o envelope de sessão mantém seu campo ignorable apenas para compatibilidade de leitura de logs armazenados - o Session.append ainda não consegue estampá-lo, então o comportamento da porta não muda. |
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
| `ocr.enabled` / `command` / `language` | `true` / `tesseract` / `eng` | OCR opcional para `screen_find` (detectado na montagem; degrada para indisponível sem tesseract) |

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
- **Auditoria de sessão em builds do harness sem envelope.** Os eventos de auditoria cruzam uma porta adaptativa: hosts que conhecem o vocabulário acrescentam diretamente, hosts com o envelope `ignorable` acrescentam com o marcador, e hosts sem envelope — `0.1.0-rc.6`–`0.1.0-rc.8`, `0.1.1-rc.2` e `0.1.2-rc.1` (que não consegue estampar o marcador ignorável — o campo do envelope é mantido apenas para compatibilidade de leitura de logs armazenados — e falha fechado para tipos desconhecidos na leitura) — não recebem append de auditoria; os resultados das ferramentas continuam sendo a trilha reconstruível. Defina `auditSessionEvents: false` para interromper os appends por completo.

## Desenvolvimento

```sh
pnpm install        # node ^22.19 || >=24
pnpm run typecheck  # tsc: src + tests contra o checkout local do harness
pnpm run typecheck:ci  # tsc contra os tipos publicados 0.1.5-rc.2 (sem paths)
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
- [@Mchsd](https://github.com/Mchsd) — adicionou a opção `auditSessionEvents` para harnesses cujo leitor de sessão rejeita os eventos de auditoria do `dsh-click` (#2).

## PerryLink DSH Plugin Family

This project is one of the **45 DeepSeek Harness plugins** maintained by [PerryLink](https://github.com/PerryLink). If this one helps you, the others likely will too:

| Plugin | One-liner |
|---|---|
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** | Second-model auto-review on the approval chain, fail-closed by default | |
| **[dsh-autotier](https://github.com/PerryLink/dsh-autotier)** | Automatic strong/cheap model-tier routing with deterministic risk guards and a `/tier` command | |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | Durable background child agents with a Web UI sidebar, messaging and interrupt | |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | Cost governance for DeepSeek Harness: budgets, carbon, and latency in one panel. | |
| **[dsh-catalog](https://github.com/PerryLink/dsh-catalog)** | DSH Desktop Market standard catalog source for the PerryLink family | |
| **[dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp)** | Read-only MCP server exposing the certification registry: grades, snapshots and five-dimension evidence | |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** | Claude Code /rewind-equivalent: snapshots, session forks, one-shot restore | |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | Migrate Claude Code sessions, memory, skills and CLAUDE.md into DSH | |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** | Cross-platform native desktop control for DeepSeek Harness — Windows first. | |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** | Terminal-style input history for the web composer: arrows, Ctrl+R search | |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** | Dataset quality checks and citation cross-checks (the optional numeric bridge consumed here) | |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | Prompt-injection, jailbreak, and secret-leak defense for DeepSeek Harness. | |
| **[dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)** | Engineering-discipline guard: requirements grill, test gates, adversary review | |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | Unified static-image generation routing for DeepSeek Harness. | |
| **[dsh-fast](https://github.com/PerryLink/dsh-fast)** | Read-only performance diagnostics for DeepSeek Harness. | |
| **[dsh-fund-research](https://github.com/PerryLink/dsh-fund-research)** | Deterministic research reports for Chinese public mutual funds | |
| **[dsh-github](https://github.com/PerryLink/dsh-github)** | GitHub PR/issues integration for DSH, every write gated by approval | |
| **[dsh-industry-research](https://github.com/PerryLink/dsh-industry-research)** | Industry research orchestration that seals its deliverables through this plugin's `ctx.researchReport.assemble` | |
| **[dsh-laya](https://github.com/PerryLink/dsh-laya)** | Laya typed decisions (`noul`/`choice`/`score`) as a first-class Cordis service and model-visible tools | |
| **[dsh-library](https://github.com/PerryLink/dsh-library)** | Local document knowledge base for DeepSeek Harness. | |
| **[dsh-local-ai](https://github.com/PerryLink/dsh-local-ai)** | Local-model (Ollama) integration for DeepSeek Harness. | |
| **[dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions)** | LSP diagnostics, formatting, completion, code actions and rename over language servers | |
| **[dsh-mask](https://github.com/PerryLink/dsh-mask)** | PII masking middleware: anonymize at the model boundary, restore at the display layer | |
| **[dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel)** | Read-only MCP runtime panel: /mcp command + Settings tab with status, tools and errors | |
| **[dsh-memento](https://github.com/PerryLink/dsh-memento)** | Approval-gated cross-session memory: ctx.memory seam + SQLite + memory tool | |
| **[dsh-observe](https://github.com/PerryLink/dsh-observe)** | OpenTelemetry and Langfuse observability exporter for DeepSeek Harness. | |
| **[dsh-output-styles](https://github.com/PerryLink/dsh-output-styles)** | Claude Code outputStyles-equivalent runtime style switching | |
| **[dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules)** | Claude Code-style declarative allow/deny/ask permission rules with audit | |
| **[dsh-plugin-certification](https://github.com/PerryLink/dsh-plugin-certification)** | Community certification registry with repro-checkable grades and badges | |
| **[dsh-plugin-doctor](https://github.com/PerryLink/dsh-plugin-doctor)** | Zero-dependency static + sandbox smoke detector for DSH plugins | |
| **[dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide)** | Plugin-development knowledge base as an on-demand agent skill | |
| **[dsh-plugin-kit](https://github.com/PerryLink/dsh-plugin-kit)** | Shared zero-runtime-dependency toolkit for the PerryLink DSH plugins | |
| **[dsh-plugin-upgrade](https://github.com/PerryLink/dsh-plugin-upgrade)** | One-package, one-corridor-index plugin upgrade skill: routes a repository to the matching closed corridor card | |
| **[dsh-plugin-upgrade-015](https://github.com/PerryLink/dsh-plugin-upgrade-015)** | Merged `0.1.3-alpha.1` → `0.1.5-rc.1` upgrade corridor card plus a zero-dependency seam scanner | |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | Multi-channel approval/question bridge: WeChat/Telegram/Feishu, session console | |
| **[dsh-research-report](https://github.com/PerryLink/dsh-research-report)** | Verifiable research-report engine: content-addressed evidence ledger and sealed versions | |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** | Multi-dimensional quality scoring for DeepSeek Harness plugins. | |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | Pin sessions in the Web sidebar with durable ordering | |
| **[dsh-session-sync](https://github.com/PerryLink/dsh-session-sync)** | Cross-device session sync for DeepSeek Harness — a dedicated git mirror of your session store. | |
| **[dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security)** | Security-audit skill pack: secret scan, dependency and supply-chain review | |
| **[dsh-talk](https://github.com/PerryLink/dsh-talk)** | Voice-first session loop for DeepSeek Harness: talk to it, hear it answer. | |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | Cross-session team rooms: shared message bus, task board and timeline | |
| **[dsh-test-drive](https://github.com/PerryLink/dsh-test-drive)** | Isolated install-and-smoke test drives for DeepSeek Harness plugins. | |
| **[dsh-ticktick](https://github.com/PerryLink/dsh-ticktick)** | TickTick/Dida365 task bridge: session-header panel + 11 tools | |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** | Vendor parameter translation and deterministic JSON repair for DeepSeek Harness. | |


## License

[Apache License 2.0](LICENSE) © 2026 dsh-click contributors

### Instalar a partir do mercado do DSH Desktop

Todos os plugins PerryLink podem ser explorados no mercado integrado do DSH Desktop: **Market → Sources → add source → colar** `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` **→ selecionar**. A instalação continua passando pela verificação de identidade npm do mercado e pela sua confirmação.
