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

```sh
dsh plugin --profile <name> add dsh-click
```


</div>

---


**📖 Base de conocimiento del ecosistema** — datos medidos, no marketing: [guía de desarrollo · datos de selección · criterios de mantenimiento](https://perrylink.github.io/dsh-plugin-guide/).

<!-- star-cta -->
## Instalación y desinstalación

- **Canal git** (último `main`): `dsh plugin --profile web add github:PerryLink/dsh-click` — el script `prepare` compila solo con dependencias de producción.
- **Canal npm** (versiones publicadas): `dsh plugin --profile web add dsh-click`.
- **Canal tarball**: `pnpm pack` en este repositorio y luego `dsh plugin --profile web add ./dsh-click-<version>.tgz`.
- **Desinstalar**: `dsh plugin --profile web remove dsh-click` (o elimina la fila del parche del perfil).

> Si pnpm informa `ERR_PNPM_IGNORED_BUILDS` para este paquete (la validación inofensiva del binario de plataforma de esbuild), añade `allowBuilds: { esbuild: true }` a tu `pnpm-workspace.yaml` — el CLI `dsh` imprime el fragmento exacto.

## ⭐ 如果它帮到了你

Este plugin forma parte de la [familia de plugins DSH](https://github.com/PerryLink) (más de 40, todos Apache-2.0). Si te resulta útil, **dale una estrella**: no desbloquea nada, pero ayuda a que la siguiente persona lo encuentre antes.

*English:* part of a 95 plugin family for DeepSeek Harness. If it is useful, **a star helps the next person find it** — nothing is gated behind it.

## What is dsh-click?

Control nativo de escritorio multiplataforma para DeepSeek Harness — Windows primero.

Mira la pantalla y luego actúa — cada clic autorizado, cada acción auditada.

![Demostración de terminal de dsh-click: dsh-click — 8 native desktop tools, freshness-checked and approval-gated](https://raw.githubusercontent.com/PerryLink/dsh-click/main/docs/assets/dsh-click-hero.png)

![Animated terminal demo of dsh-click](https://raw.githubusercontent.com/PerryLink/dsh-click/main/docs/assets/dsh-click-demo.gif)

*La misma ejecución, animada.*

## Compatibilidad

| Superficie | Estado |
|---|---|
| Harness | DeepSeek Harness `dsh-v0.2.1-alpha.1` (tag de GitHub, verificado el 2026-09-25). Verificado el 2026-09-11 contra el checkout master dsh-v0.1.7-alpha.1 (cadena completa de gates + smoke de instalación de perfil). |
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
dsh plugin --profile web add github:PerryLink/dsh-click
```

```sh
# 1. instala el bundle en tu perfil
dsh plugin --profile web add github:PerryLink/dsh-click

# o desde npm (versiones publicadas)
dsh plugin --profile web add dsh-click

# 2. reinicia y verifica la fila
dsh --profile web --dump-config | grep -A2 'id: dsh-click'
```

Luego pídele al agente que mire una ventana y actúe — el aviso de aprobación aparece en cada acción que muta:

```
> Abre el Bloc de notas, escribe "hola" y lee de nuevo lo que hay en pantalla.
```

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
pnpm run typecheck:ci  # tsc contra los tipos publicados 0.1.7-rc.2 (sin paths)
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

Este proyecto es uno de los **87 plugins activamente mantenidos** de DeepSeek Harness de [PerryLink](https://github.com/PerryLink). El registro familiar tiene **95** plugins — **5 congelados**, **3 retirados** — y permanece plegado abajo para que cada README conserve una primera pantalla corta. Expándelo para ver cada fila, con el motivo en la columna Estado.

<details>
<summary>Expandir los 95 plugins</summary>

| Plugin | Una línea | Estado |
|---|---|---|
| **[dsh-aqua-input-check](https://github.com/PerryLink/dsh-aqua-input-check)** | 水产养殖投入品记录核对（按投入品用量、休药期与起捕间隔核对记录自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-archive-check](https://github.com/PerryLink/dsh-archive-check)** | 档案归档完整性与保管期限核对（依据《档案法》及配套规定，仅提示差异，不作出定性结论） |  |
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** | Second-model auto-review on the approval chain, fail-closed by default |  |
| **[dsh-autotier](https://github.com/PerryLink/dsh-autotier)** | Automatic strong/cheap model-tier routing with deterministic risk guards and a `/tier` command |  |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | Durable background child agents with a Web UI sidebar, messaging and interrupt | 🚫 RETIRADO — ver el README del repositorio |
| **[dsh-bid-ca-precheck](https://github.com/PerryLink/dsh-bid-ca-precheck)** | 投标文件符合性预检（按招标文件逐条核对响应情况，仅提示差异，不作出定性结论） |  |
| **[dsh-bid-qual-check](https://github.com/PerryLink/dsh-bid-qual-check)** | 投标人资格条件核对（按资格条件与证明材料核对逐条响应，仅提示差异，不作出定性结论） |  |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | Cost governance for DeepSeek Harness: budgets, carbon, and latency in one panel. | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp)** | Read-only MCP server exposing the certification registry: grades, snapshots and five-dimension evidence |  |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** | Claude Code /rewind-equivalent: snapshots, session forks, one-shot restore |  |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | Migrate Claude Code sessions, memory, skills and CLAUDE.md into DSH | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** | Cross-platform native desktop control for DeepSeek Harness — Windows first. |  |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** | Terminal-style input history for the web composer: arrows, Ctrl+R search |  |
| **[dsh-contract-stance](https://github.com/PerryLink/dsh-contract-stance)** | 合同条款立场台账核对（按立场、风险等级与退让底线核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-customs-doc-check](https://github.com/PerryLink/dsh-customs-doc-check)** | 报关单证一致性核对（按公开的报关单填制规范核对单证间字段一致性，仅提示差异，不作出定性结论） |  |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** | Dataset quality checks and citation cross-checks (the optional numeric bridge consumed here) |  |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | Prompt-injection, jailbreak, and secret-leak defense for DeepSeek Harness. | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-demurrage-ledger](https://github.com/PerryLink/dsh-demurrage-ledger)** | 滞箱费台账核对（按免箱期与费率核对超期天数与金额的自洽性，仅提示差异，不作出定性结论） |  |
| **[dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)** | Engineering-discipline guard: requirements grill, test gates, adversary review |  |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | Unified static-image generation routing for DeepSeek Harness. | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-drill-script-check](https://github.com/PerryLink/dsh-drill-script-check)** | 应急演练脚本核对（按阶段、响应分级、指挥与资源要素核对脚本齐备，仅提示差异，不作出定性结论） |  |
| **[dsh-eia-guide-check](https://github.com/PerryLink/dsh-eia-guide-check)** | 环评导则适用性核对（按要素、导则名称与执行标准核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-emergency-plan](https://github.com/PerryLink/dsh-emergency-plan)** | 应急预案要素齐备性与条款级页码定位（依据 GB/T 29639-2020 等公开文件，仅提示差异，不作出定性结论） |  |
| **[dsh-essay-rubric-check](https://github.com/PerryLink/dsh-essay-rubric-check)** | 作文量表评分核对（按评分项、原文定位与分值算术核对评分自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-evidence-check](https://github.com/PerryLink/dsh-evidence-check)** | 证据清单齐备性核对（按待证事实与证据要素核对清单自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-export-ctl-check](https://github.com/PerryLink/dsh-export-ctl-check)** | 出口管制物项核对（按管制清单、最终用途与许可证核对台账齐备，仅提示差异，不作出定性结论） |  |
| **[dsh-fast](https://github.com/PerryLink/dsh-fast)** | Read-only performance diagnostics for DeepSeek Harness. |  |
| **[dsh-fmea-table-check](https://github.com/PerryLink/dsh-fmea-table-check)** | FMEA 分析表要素齐备性与风险顺序数一致性核对（按公开的 FMEA 方法标准核对表内自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-forecast-penalty](https://github.com/PerryLink/dsh-forecast-penalty)** | 预测准确率考核核对（按准确率、门槛与考核单价核对考核费用的算术自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-fund-research](https://github.com/PerryLink/dsh-fund-research)** | Deterministic research reports for Chinese public mutual funds |  |
| **[dsh-github](https://github.com/PerryLink/dsh-github)** | GitHub PR/issues integration for DSH, every write gated by approval |  |
| **[dsh-gongwen-flow-check](https://github.com/PerryLink/dsh-gongwen-flow-check)** | 公文流转与办理时限核对（按公开的公文处理规范核对环节完整性与时限，仅提示差异，不作出定性结论） |  |
| **[dsh-gongwen-word-check](https://github.com/PerryLink/dsh-gongwen-word-check)** | 公文格式要素核对（按公开的党政机关公文格式标准核对版头与主体要素，仅提示差异，不作出定性结论） |  |
| **[dsh-guard-plan-qc](https://github.com/PerryLink/dsh-guard-plan-qc)** | 劳动保护与安全防护用品配置表核对（按公开的配备标准核对品名规格与配置数量，仅提示差异，不作出定性结论） |  |
| **[dsh-hazchem-check](https://github.com/PerryLink/dsh-hazchem-check)** | 危险化学品临界量与重大危险源辨识核对（按储存量与临界量核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-hazplan-check](https://github.com/PerryLink/dsh-hazplan-check)** | HAZOP 分析表要素齐备性与偏差推导一致性核对（依据公开的危险与可操作性分析标准，仅提示差异，不作出定性结论） |  |
| **[dsh-hidden-risk-map](https://github.com/PerryLink/dsh-hidden-risk-map)** | 安全隐患台账→《工贸企业重大事故隐患判定标准》（应急管理部令第10号）条款映射提示（仅提示差异，不作出定性结论） |  |
| **[dsh-hs-classify](https://github.com/PerryLink/dsh-hs-classify)** | 商品归类层级一致性核对（按章、品目、子目与商品编号的层级关系核对自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-icd-rule-check](https://github.com/PerryLink/dsh-icd-rule-check)** | ICD 合并编码与星剑号配对提示（依据 GB/T 14396-2016 与公开的 ICD 使用说明，仅提示差异，不作出定性结论） |  |
| **[dsh-industry-research](https://github.com/PerryLink/dsh-industry-research)** | Industry research orchestration that seals its deliverables through this plugin's `ctx.researchReport.assemble` |  |
| **[dsh-lawcite-adapter](https://github.com/PerryLink/dsh-lawcite-adapter)** | 法条引用与文书要素核对（按名称、条号、原文与效力状态核对引用可核验性，仅提示差异，不作出定性结论） |  |
| **[dsh-laya](https://github.com/PerryLink/dsh-laya)** | Laya typed decisions (`noul`/`choice`/`score`) as a first-class Cordis service and model-visible tools |  |
| **[dsh-lc-doc-check](https://github.com/PerryLink/dsh-lc-doc-check)** | 信用证单据条款核对（按单据种类、份数、期限与不符点核对交单自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-learning-gap-check](https://github.com/PerryLink/dsh-learning-gap-check)** | 能力差距与培养计划核对（按能力等级差、培养措施与完成期限核对台账闭环，仅提示差异，不作出定性结论） |  |
| **[dsh-library](https://github.com/PerryLink/dsh-library)** | Local document knowledge base for DeepSeek Harness. |  |
| **[dsh-local-ai](https://github.com/PerryLink/dsh-local-ai)** | Local-model (Ollama) integration for DeepSeek Harness. |  |
| **[dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions)** | LSP diagnostics, formatting, completion, code actions and rename over language servers |  |
| **[dsh-mask](https://github.com/PerryLink/dsh-mask)** | PII masking middleware: anonymize at the model boundary, restore at the display layer |  |
| **[dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel)** | Read-only MCP runtime panel: /mcp command + Settings tab with status, tools and errors |  |
| **[dsh-medrec-qc](https://github.com/PerryLink/dsh-medrec-qc)** | 病案首页形式质控与逻辑矛盾提示（依据国卫办医发〔2016〕24号等公开文件，仅提示差异，不作出定性结论） |  |
| **[dsh-memento](https://github.com/PerryLink/dsh-memento)** | Approval-gated cross-session memory: ctx.memory seam + SQLite + memory tool |  |
| **[dsh-nsfc-form-check](https://github.com/PerryLink/dsh-nsfc-form-check)** | 国家自然科学基金申请书形式审查与匿名化提示（依据《国家自然科学基金条例》与申请人导入的当年指南，仅提示差异，不作出定性结论） |  |
| **[dsh-nurse-record-check](https://github.com/PerryLink/dsh-nurse-record-check)** | 护理记录时限、签名与评估表完整性校验（依据《病历书写基本规范》等公开文件，仅提示差异，不作出定性结论） |  |
| **[dsh-observe](https://github.com/PerryLink/dsh-observe)** | OpenTelemetry and Langfuse observability exporter for DeepSeek Harness. |  |
| **[dsh-origin-rvc-check](https://github.com/PerryLink/dsh-origin-rvc-check)** | 原产地区域价值成分核对（按 RVC 定义式与门槛核对原产地判定自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-ota-review-check](https://github.com/PerryLink/dsh-ota-review-check)** | 在线点评回复台账核对（按回复时限、问题分类与整改状态核对台账闭环，仅提示差异，不作出定性结论） |  |
| **[dsh-output-styles](https://github.com/PerryLink/dsh-output-styles)** | Claude Code outputStyles-equivalent runtime style switching |  |
| **[dsh-paper-doc-adapter](https://github.com/PerryLink/dsh-paper-doc-adapter)** | 试卷解析结构核对（按题型、答案、分值与 yotta 标识核对试卷结构自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules)** | Claude Code-style declarative allow/deny/ask permission rules with audit |  |
| **[dsh-permit-report-check](https://github.com/PerryLink/dsh-permit-report-check)** | 行政许可办理核对（按申请材料、法定时限与决定记录核对台账闭环，仅提示差异，不作出定性结论） |  |
| **[dsh-pipeline-check](https://github.com/PerryLink/dsh-pipeline-check)** | 项目全流程文件链条核对（按环节先后与金额口径核对链条自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-pleading-draft](https://github.com/PerryLink/dsh-pleading-draft)** | 起诉状要素齐备性核对（按诉请、事实、证据、法条四要素核对文书齐备，仅提示差异，不作出定性结论） |  |
| **[dsh-plugin-doctor](https://github.com/PerryLink/dsh-plugin-doctor)** | Zero-dependency static + sandbox smoke detector for DSH plugins |  |
| **[dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide)** | Plugin-development knowledge base as an on-demand agent skill |  |
| **[dsh-plugin-kit](https://github.com/PerryLink/dsh-plugin-kit)** | Shared zero-runtime-dependency toolkit for the PerryLink DSH plugins |  |
| **[dsh-plugin-upgrade](https://github.com/PerryLink/dsh-plugin-upgrade)** | One-package, one-corridor-index plugin upgrade skill: routes a repository to the matching closed corridor card |  |
| **[dsh-policy-brief-draft](https://github.com/PerryLink/dsh-policy-brief-draft)** | 政策专报要素核对（按观点、依据、出处与建议核对专报齐备，仅提示差异，不作出定性结论） |  |
| **[dsh-power-loss-split](https://github.com/PerryLink/dsh-power-loss-split)** | 线损电量拆分与考核表核对（依据公开的线损计算口径，仅提示差异，不作出定性结论） |  |
| **[dsh-power-ticket-check](https://github.com/PerryLink/dsh-power-ticket-check)** | 电力工作票要素齐备性与签发许可顺序核对（依据现行电力安全工作规程，仅提示差异，不作出定性结论） |  |
| **[dsh-ppap-check](https://github.com/PerryLink/dsh-ppap-check)** | PPAP 提交要素齐备性核对（按公开的 PPAP 手册与提交等级核对要素齐备与版本填写，仅提示差异，不作出定性结论） |  |
| **[dsh-protest-deadline](https://github.com/PerryLink/dsh-protest-deadline)** | 质疑与投诉期限核对（按公开的政府采购质疑投诉规定核对期限与台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-railway-window](https://github.com/PerryLink/dsh-railway-window)** | 铁路施工天窗台账核对（按时间窗、时长算术与命令号核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | Multi-channel approval/question bridge: WeChat/Telegram/Feishu, session console | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-repair-order-qc](https://github.com/PerryLink/dsh-repair-order-qc)** | 维修工单结算核对（按项目金额、配件工时合计与结算总额核对算术自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-research-report](https://github.com/PerryLink/dsh-research-report)** | Verifiable research-report engine: content-addressed evidence ledger and sealed versions |  |
| **[dsh-review-reply-check](https://github.com/PerryLink/dsh-review-reply-check)** | 审稿意见逐条回应覆盖核对（按意见与回应一一对应核对覆盖完整性，仅提示差异，不作出定性结论） |  |
| **[dsh-rulefile-check](https://github.com/PerryLink/dsh-rulefile-check)** | 规则库文件自检核对（按条款引用纪律与效力上限核对规则库自身合规，仅提示差异，不作出定性结论） |  |
| **[dsh-safety-brief-check](https://github.com/PerryLink/dsh-safety-brief-check)** | 安全技术交底记录要素齐备性与签字闭环核对（依据公开的安全生产法规与检查标准，仅提示差异，不作出定性结论） |  |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** | Multi-dimensional quality scoring for DeepSeek Harness plugins. |  |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | Pin sessions in the Web sidebar with durable ordering | 🚫 RETIRADO — ver el README del repositorio |
| **[dsh-session-sync](https://github.com/PerryLink/dsh-session-sync)** | Cross-device session sync for DeepSeek Harness — a dedicated git mirror of your session store. |  |
| **[dsh-site-log-check](https://github.com/PerryLink/dsh-site-log-check)** | 监理日志跨日连续性与旁站覆盖提示（依据 GB/T 50319-2013 等公开文件，仅提示差异，不作出定性结论） |  |
| **[dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security)** | Security-audit skill pack: secret scan, dependency and supply-chain review |  |
| **[dsh-soe-decision-check](https://github.com/PerryLink/dsh-soe-decision-check)** | 三重一大决策台账核对（按前置研究、会议审议与决议记录核对程序留痕，仅提示差异，不作出定性结论） |  |
| **[dsh-soilwater-check](https://github.com/PerryLink/dsh-soilwater-check)** | 土壤与地下水监测台账核对（按点位、监测项目、限值与超标判定核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-sop-sync-check](https://github.com/PerryLink/dsh-sop-sync-check)** | 作业规程与 FMEA／控制计划一致性核对（按编号与版本核对三份文件是否同步，仅提示差异，不作出定性结论） |  |
| **[dsh-spc-gbt-adapter](https://github.com/PerryLink/dsh-spc-gbt-adapter)** | 控制图常数与过程能力指数核对（按 GB/T 4091 的常规控制图常数表核对控制限与 Cp/Cpk 的自洽性，仅提示差异，不作出定性结论） |  |
| **[dsh-talk](https://github.com/PerryLink/dsh-talk)** | Voice-first session loop for DeepSeek Harness: talk to it, hear it answer. |  |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | Cross-session team rooms: shared message bus, task board and timeline | 🚫 RETIRADO — ver el README del repositorio |
| **[dsh-tender-extract](https://github.com/PerryLink/dsh-tender-extract)** | 招标文件条款摘录核对（按出处与原文逐字核对摘录完整性，仅提示差异，不作出定性结论） |  |
| **[dsh-tender-matrix](https://github.com/PerryLink/dsh-tender-matrix)** | 评标因素评分矩阵核对（按分值上限与合计核对矩阵自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-test-drive](https://github.com/PerryLink/dsh-test-drive)** | Isolated install-and-smoke test drives for DeepSeek Harness plugins. |  |
| **[dsh-ticktick](https://github.com/PerryLink/dsh-ticktick)** | TickTick/Dida365 task bridge: session-header panel + 11 tools |  |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** | Vendor parameter translation and deterministic JSON repair for DeepSeek Harness. |  |
| **[dsh-warranty-calc](https://github.com/PerryLink/dsh-warranty-calc)** | 质保期与索赔金额核对（按质保期月数与里程、索赔金额算式核对自洽，仅提示差异，不作出定性结论） |  |

</details>

</details>

</details>

## License

[Apache License 2.0](LICENSE) © 2026 dsh-click contributors

### Instalar desde el mercado de DSH Desktop

Todos los plugins de PerryLink pueden explorarse en el mercado integrado de DSH Desktop: **Market → Sources → add source → pegar** `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` **→ seleccionarlo**. La instalación sigue pasando por la verificación de identidad npm del mercado y tu confirmación.
