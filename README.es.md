<div align="center">

# 🖱️ dsh-click
- **Canal 1024 store**: `npm i -g dsh1024` una vez, luego `dsh1024 plugin --profile web add dsh-click` (cuenta para el ranking de instalaciones de [deepseek1024.com](https://deepseek1024.com)).

**Control nativo de escritorio multiplataforma para DeepSeek Harness — Windows primero.**

*Mira la pantalla y luego actúa — cada clic autorizado, cada acción auditada.*

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

## Compatibilidad

| Superficie | Estado |
|---|---|
| Harness | DeepSeek Harness `0.1.2-alpha.5` |
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
| `auditSessionEvents` | `true` | Añade eventos de auditoría `dsh-click/observed`/`dsh-click/action` a la sesión. La puerta adaptativa ya omite el append en hosts sin sobre (rc.6–rc.8, 0.1.1-rc.2 y 0.1.2-alpha.5, que falla cerrado ante tipos desconocidos en lectura); ponlo en `false` para detener por completo los appends de auditoría 0.1.2-alpha.5 (adaptado el 2026-09-02): el sobre de sesión conserva su campo ignorable solo para compatibilidad de lectura de logs almacenados - Session.append aún no puede estamparlo, por lo que el comportamiento de la puerta no cambia. |
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
- **Auditoría de sesión en builds del harness sin sobre.** Los eventos de auditoría cruzan una puerta adaptativa: los hosts que conocen el vocabulario agregan directamente, los hosts con el sobre `ignorable` agregan con el marcador, y los hosts sin sobre — `0.1.0-rc.6`–`0.1.0-rc.8`, `0.1.1-rc.2` y `0.1.2-alpha.5` (que eliminó el sobre y falla cerrado ante tipos desconocidos en lectura) — no reciben append de auditoría; los resultados de las herramientas siguen siendo la pista reconstruible. Pon `auditSessionEvents: false` para detener los appends por completo.

## Desarrollo

```sh
pnpm install        # node ^22.19 || >=24
pnpm run typecheck  # tsc: src + tests contra el checkout local del harness
pnpm run typecheck:ci  # tsc contra los tipos publicados 0.1.2-alpha.5 (sin paths)
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

Este proyecto es uno de los [33 complementos de DeepSeek Harness](https://github.com/PerryLink) mantenidos por [PerryLink](https://github.com/PerryLink). Si este te ayuda, probablemente los demás también:

| Plugin | One-liner |
|---|---|
| **[dsh-dsh-auto-review](https://github.com/PerryLink/dsh-dsh-auto-review)** | Auto-revisión de segundo modelo en la cadena de aprobación, con cierre en fallo por defecto | |
| **[dsh-dsh-background-agents](https://github.com/PerryLink/dsh-dsh-background-agents)** | Agentes hijos en segundo plano durables con barra lateral de UI web, mensajería e interrupción | |
| **[dsh-dsh-budget](https://github.com/PerryLink/dsh-dsh-budget)** | Gobernanza de costes para DeepSeek Harness: presupuestos, carbono y latencia en un panel. | |
| **[dsh-dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-dsh-checkpoint-rewind)** | Equivalente a /rewind de Claude Code: instantáneas, bifurcaciones de sesión, restauración de un solo uso | |
| **[dsh-dsh-claude-move](https://github.com/PerryLink/dsh-dsh-claude-move)** | Migra sesiones, memoria, habilidades y CLAUDE.md de Claude Code a DSH | |
| **[dsh-dsh-composer-history](https://github.com/PerryLink/dsh-dsh-composer-history)** | Historial de entrada estilo terminal para el compositor web: flechas, búsqueda Ctrl+R | |
| **[dsh-dsh-data-quality](https://github.com/PerryLink/dsh-dsh-data-quality)** | Comprobaciones de calidad de datasets y verificación de citas (el puente numérico opcional consumido aquí) | |
| **[dsh-dsh-defend](https://github.com/PerryLink/dsh-dsh-defend)** | Defensa contra inyección de prompts, jailbreak y fuga de secretos para DeepSeek Harness. | |
| **[dsh-dsh-doublecheck](https://github.com/PerryLink/dsh-dsh-doublecheck)** | Guardián de disciplina de ingeniería: interrogatorio de requisitos, puertas de pruebas, revisión adversaria | |
| **[dsh-dsh-draw](https://github.com/PerryLink/dsh-dsh-draw)** | Enrutamiento unificado de generación de imágenes estáticas para DeepSeek Harness. | |
| **[dsh-dsh-fast](https://github.com/PerryLink/dsh-dsh-fast)** | Diagnóstico de rendimiento de solo lectura para DeepSeek Harness. | |
| **[dsh-dsh-fund-research](https://github.com/PerryLink/dsh-dsh-fund-research)** | Informes de investigación deterministas para fondos mutuos públicos chinos | |
| **[dsh-dsh-github](https://github.com/PerryLink/dsh-dsh-github)** | Integración de PR/issues de GitHub para DSH, cada escritura controlada por aprobación | |
| **[dsh-dsh-industry-research](https://github.com/PerryLink/dsh-dsh-industry-research)** | Orquestación de investigación sectorial que sella sus entregables mediante el `ctx.researchReport.assemble` de este plugin | |
| **[dsh-dsh-library](https://github.com/PerryLink/dsh-dsh-library)** | Base de conocimiento documental local para DeepSeek Harness. | |
| **[dsh-dsh-local-ai](https://github.com/PerryLink/dsh-dsh-local-ai)** | Integración de modelos locales (Ollama) para DeepSeek Harness. | |
| **[dsh-dsh-lsp-actions](https://github.com/PerryLink/dsh-dsh-lsp-actions)** | Diagnósticos, formato, autocompletado, acciones de código y renombrado LSP sobre servidores de lenguaje | |
| **[dsh-dsh-mask](https://github.com/PerryLink/dsh-dsh-mask)** | Middleware de enmascaramiento de PII: anonimiza en el límite del modelo, restaura en la capa de visualización | |
| **[dsh-dsh-mcp-panel](https://github.com/PerryLink/dsh-dsh-mcp-panel)** | Panel de tiempo de ejecución MCP de solo lectura: comando /mcp + pestaña Settings con estado, herramientas y errores | |
| **[dsh-dsh-memento](https://github.com/PerryLink/dsh-dsh-memento)** | Memoria entre sesiones controlada por aprobación: costura ctx.memory + SQLite + herramienta de memoria | |
| **[dsh-dsh-observe](https://github.com/PerryLink/dsh-dsh-observe)** | Exportador de observabilidad OpenTelemetry y Langfuse para DeepSeek Harness. | |
| **[dsh-dsh-output-styles](https://github.com/PerryLink/dsh-dsh-output-styles)** | Cambio de estilo en tiempo de ejecución equivalente a outputStyles de Claude Code | |
| **[dsh-dsh-permission-rules](https://github.com/PerryLink/dsh-dsh-permission-rules)** | Reglas de permisos declarativas allow/deny/ask estilo Claude Code con auditoría | |
| **[dsh-dsh-plugin-guide](https://github.com/PerryLink/dsh-dsh-plugin-guide)** | Base de conocimiento de desarrollo de plugins como habilidad de agente bajo demanda | |
| **[dsh-dsh-research-report](https://github.com/PerryLink/dsh-dsh-research-report)** | Motor de informes de investigación verificables con evidencia direccionada por contenido | |
| **[dsh-dsh-score](https://github.com/PerryLink/dsh-dsh-score)** | Puntuación de calidad multidimensional para plugins de DeepSeek Harness. | |
| **[dsh-dsh-session-pin](https://github.com/PerryLink/dsh-dsh-session-pin)** | Fija sesiones en la barra lateral web con orden durable | |
| **[dsh-dsh-session-sync](https://github.com/PerryLink/dsh-dsh-session-sync)** | Sincronización de sesiones entre dispositivos para DeepSeek Harness — un espejo git dedicado de tu almacén de sesiones. | |
| **[dsh-dsh-skill-pack-security](https://github.com/PerryLink/dsh-dsh-skill-pack-security)** | Paquete de habilidades de auditoría de seguridad: escaneo de secretos, revisión de dependencias y cadena de suministro | |
| **[dsh-dsh-talk](https://github.com/PerryLink/dsh-dsh-talk)** | Bucle de sesión con voz para DeepSeek Harness: háblale y escucha su respuesta. | |
| **[dsh-dsh-test-drive](https://github.com/PerryLink/dsh-dsh-test-drive)** | Pruebas de instalación y humo aisladas para plugins de DeepSeek Harness. | |
| **[dsh-dsh-translate](https://github.com/PerryLink/dsh-dsh-translate)** | Traducción de parámetros entre proveedores y reparación determinista de JSON para DeepSeek Harness. | |

## License

[Apache License 2.0](LICENSE) © 2026 dsh-click contributors

### Instalar desde el mercado de DSH Desktop

Todos los plugins de PerryLink pueden explorarse en el mercado integrado de DSH Desktop: **Market → Sources → add source → pegar** `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` **→ seleccionarlo**. La instalación sigue pasando por la verificación de identidad npm del mercado y tu confirmación.
