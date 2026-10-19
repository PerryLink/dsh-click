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

```sh
dsh plugin --profile <name> add dsh-click
```


</div>

---


**📖 Base de conhecimento do ecossistema** — dados medidos, não marketing: [guia de desenvolvimento · dados de seleção · critérios de manutenção](https://perrylink.github.io/dsh-plugin-guide/).

<!-- star-cta -->
## Instalação e desinstalação

- **Canal git** (último `main`): `dsh plugin --profile web add github:PerryLink/dsh-click` — o script `prepare` compila apenas com dependências de produção.
- **Canal npm** (versões publicadas): `dsh plugin --profile web add dsh-click`.
- **Canal tarball**: `pnpm pack` neste repositório e então `dsh plugin --profile web add ./dsh-click-<version>.tgz`.
- **Desinstalar**: `dsh plugin --profile web remove dsh-click` (ou remova a linha do patch do perfil).

> Se o pnpm reportar `ERR_PNPM_IGNORED_BUILDS` para este pacote (a validação inofensiva do binário de plataforma do esbuild), adicione `allowBuilds: { esbuild: true }` ao seu `pnpm-workspace.yaml` — o CLI `dsh` imprime o trecho exato.

## ⭐ 如果它帮到了你

Este plugin faz parte da [família de plugins DSH](https://github.com/PerryLink) (mais de 40, todos Apache-2.0). Se for útil, **deixe uma estrela**: não desbloqueia nada, mas ajuda a próxima pessoa a encontrá-lo.

*English:* part of a 95 plugin family for DeepSeek Harness. If it is useful, **a star helps the next person find it** — nothing is gated behind it.

## What is dsh-click?

Controle nativo de desktop multiplataforma para o DeepSeek Harness — Windows primeiro.

Olhe para a tela e então aja — cada clique autorizado, cada ação auditada.

![Demonstração de terminal do dsh-click: dsh-click — 8 native desktop tools, freshness-checked and approval-gated](https://raw.githubusercontent.com/PerryLink/dsh-click/main/docs/assets/dsh-click-hero.png)

![Animated terminal demo of dsh-click](https://raw.githubusercontent.com/PerryLink/dsh-click/main/docs/assets/dsh-click-demo.gif)

*A mesma execução, animada.*

## Compatibilidade

| Superfície | Status |
|---|---|
| Harness | DeepSeek Harness `dsh-v0.2.1-alpha.1` (tag do GitHub, verificado em 2026-09-25). Verificado em 2026-09-11 contra o checkout master dsh-v0.1.7-alpha.1 (cadeia completa de gates + smoke de instalação de perfil). |
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
dsh plugin --profile web add github:PerryLink/dsh-click
```

```sh
# 1. instale o bundle no seu perfil
dsh plugin --profile web add github:PerryLink/dsh-click

# ou pelo npm (versões publicadas)
dsh plugin --profile web add dsh-click

# 2. reinicie e verifique a linha
dsh --profile web --dump-config | grep -A2 'id: dsh-click'
```

Depois peça ao agente para olhar uma janela e agir — o aviso de aprovação aparece em toda ação mutante:

```
> Abra o Bloco de Notas, digite "olá" e leia de volta o que está na tela.
```

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
pnpm run typecheck:ci  # tsc contra os tipos publicados 0.1.7-rc.2 (sem paths)
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

## Família de plugins DSH da PerryLink

Este projeto faz parte da família de plugins do DeepSeek Harness da [PerryLink](https://github.com/PerryLink). O registro fica recolhido abaixo para que cada README mantenha uma primeira tela curta; expanda para ver cada linha e seu status.

<details>
<summary>Expandir todos os plugins</summary>

| Plugin | Status |
|---|---|
| **[dsh-aqua-input-check](https://github.com/PerryLink/dsh-aqua-input-check)** |  |
| **[dsh-archive-check](https://github.com/PerryLink/dsh-archive-check)** |  |
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** |  |
| **[dsh-autotier](https://github.com/PerryLink/dsh-autotier)** |  |
| **[dsh-bid-ca-precheck](https://github.com/PerryLink/dsh-bid-ca-precheck)** |  |
| **[dsh-bid-qual-check](https://github.com/PerryLink/dsh-bid-qual-check)** |  |
| **[dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp)** |  |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** |  |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** |  |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** |  |
| **[dsh-contract-stance](https://github.com/PerryLink/dsh-contract-stance)** |  |
| **[dsh-customs-doc-check](https://github.com/PerryLink/dsh-customs-doc-check)** |  |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** |  |
| **[dsh-demurrage-ledger](https://github.com/PerryLink/dsh-demurrage-ledger)** |  |
| **[dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)** |  |
| **[dsh-drill-script-check](https://github.com/PerryLink/dsh-drill-script-check)** |  |
| **[dsh-eia-guide-check](https://github.com/PerryLink/dsh-eia-guide-check)** |  |
| **[dsh-emergency-plan](https://github.com/PerryLink/dsh-emergency-plan)** |  |
| **[dsh-essay-rubric-check](https://github.com/PerryLink/dsh-essay-rubric-check)** |  |
| **[dsh-evidence-check](https://github.com/PerryLink/dsh-evidence-check)** |  |
| **[dsh-export-ctl-check](https://github.com/PerryLink/dsh-export-ctl-check)** |  |
| **[dsh-fast](https://github.com/PerryLink/dsh-fast)** |  |
| **[dsh-fmea-table-check](https://github.com/PerryLink/dsh-fmea-table-check)** |  |
| **[dsh-forecast-penalty](https://github.com/PerryLink/dsh-forecast-penalty)** |  |
| **[dsh-fund-research](https://github.com/PerryLink/dsh-fund-research)** |  |
| **[dsh-github](https://github.com/PerryLink/dsh-github)** |  |
| **[dsh-gongwen-flow-check](https://github.com/PerryLink/dsh-gongwen-flow-check)** |  |
| **[dsh-gongwen-word-check](https://github.com/PerryLink/dsh-gongwen-word-check)** |  |
| **[dsh-guard-plan-qc](https://github.com/PerryLink/dsh-guard-plan-qc)** |  |
| **[dsh-hazchem-check](https://github.com/PerryLink/dsh-hazchem-check)** |  |
| **[dsh-hazplan-check](https://github.com/PerryLink/dsh-hazplan-check)** |  |
| **[dsh-hidden-risk-map](https://github.com/PerryLink/dsh-hidden-risk-map)** |  |
| **[dsh-hs-classify](https://github.com/PerryLink/dsh-hs-classify)** |  |
| **[dsh-icd-rule-check](https://github.com/PerryLink/dsh-icd-rule-check)** |  |
| **[dsh-industry-research](https://github.com/PerryLink/dsh-industry-research)** |  |
| **[dsh-lawcite-adapter](https://github.com/PerryLink/dsh-lawcite-adapter)** |  |
| **[dsh-laya](https://github.com/PerryLink/dsh-laya)** |  |
| **[dsh-lc-doc-check](https://github.com/PerryLink/dsh-lc-doc-check)** |  |
| **[dsh-learning-gap-check](https://github.com/PerryLink/dsh-learning-gap-check)** |  |
| **[dsh-library](https://github.com/PerryLink/dsh-library)** |  |
| **[dsh-local-ai](https://github.com/PerryLink/dsh-local-ai)** |  |
| **[dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions)** |  |
| **[dsh-mask](https://github.com/PerryLink/dsh-mask)** |  |
| **[dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel)** |  |
| **[dsh-medrec-qc](https://github.com/PerryLink/dsh-medrec-qc)** |  |
| **[dsh-memento](https://github.com/PerryLink/dsh-memento)** |  |
| **[dsh-nsfc-form-check](https://github.com/PerryLink/dsh-nsfc-form-check)** |  |
| **[dsh-nurse-record-check](https://github.com/PerryLink/dsh-nurse-record-check)** |  |
| **[dsh-observe](https://github.com/PerryLink/dsh-observe)** |  |
| **[dsh-origin-rvc-check](https://github.com/PerryLink/dsh-origin-rvc-check)** |  |
| **[dsh-ota-review-check](https://github.com/PerryLink/dsh-ota-review-check)** |  |
| **[dsh-output-styles](https://github.com/PerryLink/dsh-output-styles)** |  |
| **[dsh-paper-doc-adapter](https://github.com/PerryLink/dsh-paper-doc-adapter)** |  |
| **[dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules)** |  |
| **[dsh-permit-report-check](https://github.com/PerryLink/dsh-permit-report-check)** |  |
| **[dsh-pipeline-check](https://github.com/PerryLink/dsh-pipeline-check)** |  |
| **[dsh-pleading-draft](https://github.com/PerryLink/dsh-pleading-draft)** |  |
| **[dsh-plugin-doctor](https://github.com/PerryLink/dsh-plugin-doctor)** |  |
| **[dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide)** |  |
| **[dsh-plugin-kit](https://github.com/PerryLink/dsh-plugin-kit)** |  |
| **[dsh-plugin-upgrade](https://github.com/PerryLink/dsh-plugin-upgrade)** |  |
| **[dsh-policy-brief-draft](https://github.com/PerryLink/dsh-policy-brief-draft)** |  |
| **[dsh-power-loss-split](https://github.com/PerryLink/dsh-power-loss-split)** |  |
| **[dsh-power-ticket-check](https://github.com/PerryLink/dsh-power-ticket-check)** |  |
| **[dsh-ppap-check](https://github.com/PerryLink/dsh-ppap-check)** |  |
| **[dsh-protest-deadline](https://github.com/PerryLink/dsh-protest-deadline)** |  |
| **[dsh-railway-window](https://github.com/PerryLink/dsh-railway-window)** |  |
| **[dsh-repair-order-qc](https://github.com/PerryLink/dsh-repair-order-qc)** |  |
| **[dsh-research-report](https://github.com/PerryLink/dsh-research-report)** |  |
| **[dsh-review-reply-check](https://github.com/PerryLink/dsh-review-reply-check)** |  |
| **[dsh-rulefile-check](https://github.com/PerryLink/dsh-rulefile-check)** |  |
| **[dsh-safety-brief-check](https://github.com/PerryLink/dsh-safety-brief-check)** |  |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** |  |
| **[dsh-session-sync](https://github.com/PerryLink/dsh-session-sync)** |  |
| **[dsh-site-log-check](https://github.com/PerryLink/dsh-site-log-check)** |  |
| **[dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security)** |  |
| **[dsh-soe-decision-check](https://github.com/PerryLink/dsh-soe-decision-check)** |  |
| **[dsh-soilwater-check](https://github.com/PerryLink/dsh-soilwater-check)** |  |
| **[dsh-sop-sync-check](https://github.com/PerryLink/dsh-sop-sync-check)** |  |
| **[dsh-spc-gbt-adapter](https://github.com/PerryLink/dsh-spc-gbt-adapter)** |  |
| **[dsh-talk](https://github.com/PerryLink/dsh-talk)** |  |
| **[dsh-tender-extract](https://github.com/PerryLink/dsh-tender-extract)** |  |
| **[dsh-tender-matrix](https://github.com/PerryLink/dsh-tender-matrix)** |  |
| **[dsh-test-drive](https://github.com/PerryLink/dsh-test-drive)** |  |
| **[dsh-ticktick](https://github.com/PerryLink/dsh-ticktick)** |  |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** |  |
| **[dsh-warranty-calc](https://github.com/PerryLink/dsh-warranty-calc)** |  |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | 🚫 RETIRADO — ver o README do repositório |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | 🚫 RETIRADO — ver o README do repositório |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | 🚫 RETIRADO — ver o README do repositório |

</details>

## License

[Apache License 2.0](LICENSE) © 2026 dsh-click contributors

### Instalar a partir do mercado do DSH Desktop

Todos os plugins PerryLink podem ser explorados no mercado integrado do DSH Desktop: **Market → Sources → add source → colar** `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` **→ selecionar**. A instalação continua passando pela verificação de identidade npm do mercado e pela sua confirmação.
