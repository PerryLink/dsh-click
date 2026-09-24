<div align="center">

# 🖱️ dsh-click
- **Canal 1024 store**: `npm i -g dsh1024` una vez, luego `dsh1024 plugin --profile web add dsh-click` (cuenta para el ranking de instalaciones de [deepseek1024.com](https://deepseek1024.com)).

**Control nativo de escritorio multiplataforma para DeepSeek Harness — Windows primero.**

*Mira la pantalla y luego actúa — cada clic autorizado, cada acción auditada.*

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
[![dshfind](https://dshfind.com/api/badge/PerryLink/dsh-click?metric=downloads&lang=es)](https://dshfind.com/es/plugins/PerryLink/dsh-click?ref=badge)

[English](README.md) · [简体中文](README-zh.md) · [Español](README-es.md) · [Português](README-pt.md) · [हिन्दी](README-hi.md)

</div>

---


<!-- star-cta -->
## ⭐ 如果它帮到了你

Este plugin forma parte de la [familia de plugins DSH](https://github.com/PerryLink) (más de 40, todos Apache-2.0). Si te resulta útil, **dale una estrella**: no desbloquea nada, pero ayuda a que la siguiente persona lo encuentre antes.

*English:* part of a 40+ plugin family for DeepSeek Harness. If it is useful, **a star helps the next person find it** — nothing is gated behind it.
## Compatibilidad

| Superficie | Estado |
|---|---|
| Harness | DeepSeek Harness `dsh-v0.1.7-rc.1` (tag de GitHub, verificado el 2026-09-24). Verificado el 2026-09-11 contra el checkout master dsh-v0.1.7-alpha.1 (cadena completa de gates + smoke de instalación de perfil). |
| Node | `^22.19.0 \|\| >=24.0.0` |
| Plataformas | **Windows primero** (UIAutomation + entrada Win32, mediante un helper de PowerShell incluido); los backends de macOS/Linux están reservados y fallan cerrado con un motivo claro |
| Modelo | Modelos solo-texto totalmente compatibles (`screen_read` devuelve texto estructurado); los modelos con visión reciben además las imágenes de `screen_shot` |

## Qué obtienes

`dsh-click` le da al harness un ciclo completo de observar → actuar sobre aplicaciones de escritorio nativas:

- **`screen_shot`** — captura de una ventana (o de la pantalla principal), reducida a un límite configurable. Con un modelo con visión el resultado incluye la imagen; en caso contrario, una descripción de texto mantiene funcionales a los modelos solo-texto.
- **`screen_read`** — la observación estructurada: el árbol de accesibilidad de la ventana (ids de elementos, tipos, nombres, rectángulos, patrones soportados) más pistas de píxeles con colores — texto plano, sin necesidad de modelo de imagen.
- **`click` / `type` / `scroll` / `key`** — acciones limitadas a la ventana, dirigidas por id de elemento o coordenadas. La entrega prefiere UIA invoke y recurre a mensajes de ventana enviados — y **nunca roba el foco de primer plano**.
- **`app_list` / `app_launch`** — enumera las aplicaciones en ejecución y sus ventanas; inicia una por nombre o ruta.

Cada acción que muta cruza una misma frontera de seguridad:

1. **Frescura** — la acción debe citar una observación `basedOn`; la ventana se vuelve a capturar justo antes de actuar y la acción se rechaza si la pantalla cambió (hash de píxeles + límite de antigüedad).
2. **Aprobación** — `ctx.approval` protege cada acción por defecto; las regex de título/ejecutable pueden permitir ventanas concretas (siguen auditadas).
3. **Identidad del proceso** — el pid y la ruta del ejecutable propietario se verifican antes **y** después del acto; un cambio rechaza el resultado en voz alta.
4. **Auditoría** — observaciones y acciones quedan en el registro de sesión como eventos `dsh-click/observed` / `dsh-click/action` (sanitizados, solo registro).

```text
modelo                          harness
  │ screen_read ──▶ observationId (+ elementos, píxeles)        ← texto estructurado
  │ click {basedOn, target} ──▶ verificación de frescura ──▶ aprobación ──▶ helper (UIA)
  │                             ¿hash de píxeles cambió? ── rechazar + volver a observar
  │                             ¿pid/exe cambió tras el acto? ── PROCESS_CHANGED
  │ ◀── JSON canónico + eventos de auditoría (dsh-click/action)
```

## Inicio rápido

```sh
# 1. instala el bundle en tu perfil
dsh plugin --profile web add "github:PerryLink/dsh-click#main"

# o desde npm (versiones publicadas)
dsh plugin --profile web add dsh-click

# 2. reinicia y verifica la fila
dsh --profile web --dump-config | grep -A2 'id: dsh-click'
```

Luego pídele al agente que mire una ventana y actúe — el aviso de aprobación aparece en cada acción que muta:

```
> Abre el Bloc de notas, escribe "hola" y lee de nuevo lo que hay en pantalla.
```

## Instalación y desinstalación

- **Canal git** (último `main`): `dsh plugin --profile web add "github:PerryLink/dsh-click#main"` — el script `prepare` compila solo con dependencias de producción.
- **Canal npm** (versiones publicadas): `dsh plugin --profile web add dsh-click`.
- **Canal tarball**: `pnpm pack` en este repositorio y luego `dsh plugin --profile web add ./dsh-click-<version>.tgz`.
- **Desinstalar**: `dsh plugin --profile web remove dsh-click` (o elimina la fila del parche del perfil).

> Si pnpm informa `ERR_PNPM_IGNORED_BUILDS` para este paquete (la validación inofensiva del binario de plataforma de esbuild), añade `allowBuilds: { esbuild: true }` a tu `pnpm-workspace.yaml` — el CLI `dsh` imprime el fragmento exacto.

## Configuración

Todos los ajustes son campos `Config` de Schemastery (modificables desde cordis.yml). Una sobrescritura dirigida por id reemplaza toda la fila — vuelve a declarar cada clave que necesites. `cordis.patch.yml` documenta cada clave en línea.

| Clave | Por defecto | Significado |
|---|---|---|
| `requireApproval` | `true` | Proteger cada acción que muta tras la aprobación; los observadores nunca preguntan |
| `autoApproveWindows` | `[]` | Regex de título de ventana/ruta de ejecutable que saltan la pregunta de aprobación (siguen con verificación de frescura y auditoría) |
| `auditSessionEvents` | `true` | Añade eventos de auditoría `dsh-click/observed`/`dsh-click/action` a la sesión. La puerta adaptativa ya omite el append en hosts sin sobre (rc.6–rc.8, 0.1.1-rc.2 y 0.1.2-rc.1, que falla cerrado ante tipos desconocidos en lectura); ponlo en `false` para detener por completo los appends de auditoría 0.1.2-rc.1 (adaptado el 2026-09-02): el sobre de sesión conserva su campo ignorable solo para compatibilidad de lectura de logs almacenados - Session.append aún no puede estamparlo, por lo que el comportamiento de la puerta no cambia. |
| `focusFallback` | `never` | Si una acción puede traer la ventana objetivo al primer plano como último recurso (`never` / `allow`) |
| `imageMode` | `auto` | Renderizado de `screen_shot`: `auto` (imagen si el modelo acepta imágenes, texto en caso contrario) o `text` |
| `helperTimeoutMs` | `30000` | Tiempo de espera por llamada al helper en ms (1..300000) |
| `maxHelperOutputBytes` | `25165824` | Límite de una respuesta del helper en bytes (1024..67108864) |
| `maxScreenshotSide` | `2560` | Lado más largo de la captura en píxeles (320..7680); las mayores se reducen |
| `staleCheckPixels` | `true` | Comparar un hash de píxeles fresco antes de cada acción y rechazar si cambió |
| `maxObservationAgeMs` | `30000` | Antigüedad máxima en ms de una observación que una acción puede citar (1000..600000) |
| `maxCachedObservations` | `8` | Límite LRU de observaciones en caché (1..64) |
| `maxElements` | `500` | Límite de elementos de accesibilidad por `screen_read` (1..2000) |
| `maxTreeDepth` | `32` | Profundidad máxima del recorrido del árbol de accesibilidad (1..64) |
| `maxTextLength` | `200` | Longitud de truncado de las cadenas visibles para el modelo (16..10000) |
| `rollbackEnabled` | `true` | Respaldar y restaurar el texto del control cuando `type` falla |
| `ocr.enabled` / `command` / `language` | `true` / `tesseract` / `eng` | OCR opcional para `screen_find` (probado al montar; degrada a no disponible sin tesseract) |

Ejemplo de sobrescritura en el parche de tu perfil:

```yaml
- insert:
    - id: dsh-click
      name: dsh-click
      config:
        requireApproval: true
        autoApproveWindows: ['^Notepad']
        focusFallback: never
```

## Herramientas y superficies

| Herramienta | Solo lectura | Requiere aprobación | Notas |
|---|---|---|---|
| `screen_shot` | ✅ | — | Devuelve un `observationId` que las acciones posteriores citan en `basedOn`; imagen adjunta cuando el modelo acepta imágenes |
| `screen_read` | ✅ | — | Árbol de accesibilidad + pistas de píxeles; los ids de elementos son lo que direccionan las acciones |
| `click` | | ✅ | Exactamente uno de `elementId` o `(x, y)`; se prefiere UIA invoke, con mensajes enviados como respaldo |
| `type` | | ✅ | Solo elementos con patrón de valor; respalda y restaura el texto del control en caso de fallo |
| `scroll` | | ✅ | Elemento (patrón scroll) o ventana (rueda enviada) |
| `key` | | ✅ | Combinaciones de teclas enviadas (`"Ctrl+S"`); las apps que ignoran la entrada enviada rechazan en voz alta |
| `app_list` | ✅ | — | Aplicaciones en ejecución y sus ventanas visibles |
| `app_launch` | | ✅ | Por nombre o ruta de ejecutable, con argumentos opcionales |

## Permisos y datos

- **Permisos**: las acciones que mutan cruzan la costura oficial `ctx.approval` — el plugin nunca la reimplementa ni la esquiva. La lista de permitidos solo *salta la pregunta para ventanas concretas*; no puede desactivar las verificaciones de frescura ni de identidad del proceso.
- **Datos**: el plugin no guarda nada en disco salvo las capturas que conserva el almacén de adjuntos (direccionadas por contenido, bajo la política de adjuntos del harness). Las observaciones viven en memoria (LRU acotado). Sin peticiones de red, sin almacenamiento de credenciales.
- **Registro de sesión**: `dsh-click/observed` y `dsh-click/action` son eventos de auditoría solo-registro con hechos sanitizados de ventana/proceso — títulos, rutas y texto libre se redactan y truncan antes de escribirse o mostrarse.

## Límites de seguridad

- **Observar antes de actuar, siempre.** Las acciones deben citar una observación fresca; una pantalla cambiada (hash de píxeles) o una observación caducada se rechaza con un motivo legible por el modelo que exige volver a observar.
- **La aprobación es el valor por defecto.** `requireApproval: true` salvo que permitas explícitamente ventanas concretas; cada acción — permitida o no — queda auditada.
- **Sin robo de foco.** El helper nunca trae la ventana objetivo al primer plano (`focusFallback: 'never'` por defecto); la entrada se entrega por UIA o mensajes enviados para no molestar a las ventanas en segundo plano.
- **La identidad del proceso se vuelve a verificar** inmediatamente antes y después de cada acción; un cambio de proceso a mitad de camino hace fallar el resultado (`PROCESS_CHANGED`).
- **Salida sanitizada.** Los caracteres de control se eliminan, los tabuladores se colapsan y los valores con forma de credencial (claves, tokens, JWT, cabeceras bearer) se redactan antes de llegar al modelo o al registro.
- **Fallo cerrado.** Plataformas no soportadas, un servicio de subprocesos ausente o un helper no disponible rechazan cada llamada en voz alta — los perfiles siguen arrancando en todas partes.

## Limitaciones conocidas

- **Windows primero.** Los backends de macOS y Linux están reservados; en esas plataformas cada llamada falla cerrado con un motivo claro.
- **Fidelidad solo-texto.** `screen_read` depende de que la aplicación exponga UIAutomation; las apps sin árbol accesible solo ofrecen pistas de píxeles. Los clics por coordenadas siguen disponibles.
- **Apps de entrada enviada.** Algunas aplicaciones ignoran los mensajes de ventana enviados (juegos, algunas superficies Electron); `key` lo informa con honestidad en lugar de fingir éxito.
- **Auditoría de sesión en builds del harness sin sobre.** Los eventos de auditoría cruzan una puerta adaptativa: los hosts que conocen el vocabulario agregan directamente, los hosts con el sobre `ignorable` agregan con el marcador, y los hosts sin sobre — `0.1.0-rc.6`–`0.1.0-rc.8`, `0.1.1-rc.2` y `0.1.2-rc.1` (que no puede estampar el marcador ignorable — el campo del sobre se conserva únicamente para compatibilidad de lectura de logs almacenados — y falla cerrado ante tipos desconocidos en lectura) — no reciben append de auditoría; los resultados de las herramientas siguen siendo la pista reconstruible. Pon `auditSessionEvents: false` para detener los appends por completo.

## Desarrollo

```sh
pnpm install        # node ^22.19 || >=24
pnpm run typecheck  # tsc: src + tests contra el checkout local del harness
pnpm run typecheck:ci  # tsc contra los tipos publicados 0.1.7-rc.1 (sin paths)
pnpm test           # vitest: 66 tests, 11 archivos (el smoke del helper corre en Windows)
pnpm run build      # bundle tsdown + declaraciones tsc (lib/)
pnpm run verify:self-contained  # las especificaciones de dependencias resuelven desde el registry
pnpm run verify:artifacts       # cara ESM construida + helper nativo presentes
pnpm pack           # el tarball publicado
```

## Topics

`dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `cordis`, `computer-use`, `windows-automation`, `uiautomation`, `desktop-control`, `screen-reader`

## Contributors

- [@PerryLink](https://github.com/PerryLink) — creador y mantenedor: superficie de herramientas, frontera de seguridad de acciones, helper nativo de Windows, sanitizadores y la documentación en cinco idiomas.
- [@Mchsd](https://github.com/Mchsd) — añadió la opción `auditSessionEvents` para harnesses cuyo lector de sesión rechaza los eventos de auditoría de `dsh-click` (#2).

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

### Instalar desde el mercado de DSH Desktop

Todos los plugins de PerryLink pueden explorarse en el mercado integrado de DSH Desktop: **Market → Sources → add source → pegar** `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` **→ seleccionarlo**. La instalación sigue pasando por la verificación de identidad npm del mercado y tu confirmación.
