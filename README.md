<div align="center">

# 🖱️ dsh-click
- **1024 store channel**: `npm i -g dsh1024` once, then `dsh1024 plugin --profile web add dsh-click` (counts toward the [deepseek1024.com](https://deepseek1024.com) install ranking).
[![Gitee](https://img.shields.io/badge/Gitee-mirror-c71d23?logo=gitee)](https://gitee.com/perrylink/dsh-click)

**Cross-platform native desktop control for DeepSeek Harness — Windows first.**

*Look at the screen, then act — every click gated, every action audited.*

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

## Compatibility

| Surface | Status |
|---|---|
| Harness | DeepSeek Harness `0.1.1-rc.2` |
| Node | `^22.19.0 \|\| >=24.0.0` |
| Platforms | **Windows first** (UIAutomation + Win32 input, via a bundled PowerShell helper); macOS/Linux backends are reserved and fail closed with a clear reason |
| Model | Text-only models fully supported (`screen_read` returns structured text); vision models additionally get `screen_shot` images |

## What you get

`dsh-click` gives the harness a complete observe → act loop over native desktop applications:

- **`screen_shot`** — screenshot of a window (or the primary screen), downscaled to a configurable bound. With a vision-capable model the result carries the image; otherwise a text description keeps text-only models working.
- **`screen_read`** — the structured observation: the window's accessibility tree (element ids, types, names, rectangles, supported patterns) plus pixel-location hints with colors — plain text, no image model required.
- **`click` / `type` / `scroll` / `key`** — window-scoped actions addressed by element id or coordinates. Delivery prefers UIA invoke, falls back to posted window messages — and **never steals foreground focus**.
- **`app_list` / `app_launch`** — enumerate running applications and their windows; launch one by name or path.

Every mutating action crosses one safety boundary:

1. **Freshness** — the action must cite a `basedOn` observation; the window is re-captured right before acting and the action is refused if the screen changed (pixel-hash check + max-age bound).
2. **Approval** — `ctx.approval` gates every action by default; window-title/executable regexes can allowlist specific windows (still audited).
3. **Process identity** — the owning process's pid and executable path are verified before **and** after the act; a change refuses the outcome loudly.
4. **Audit** — observations and actions land in the session log as `dsh-click/observed` / `dsh-click/action` events (sanitized, log-only).

```text
model                           harness
  │ screen_read ──▶ observationId (+ elements, pixels)         ← structured text
  │ click {basedOn, target} ──▶ freshness check ──▶ approval ──▶ helper (UIA)
  │                             pixel hash changed? ── refuse + re-observe
  │                             pid/exe changed after act? ── PROCESS_CHANGED
  │ ◀── canonical JSON + audit events (dsh-click/action)
```

## Quick start

```sh
# 1. install the bundle into your profile
dsh plugin --profile web add "github:PerryLink/dsh-click#main"

# or from npm (published releases)
dsh plugin --profile web add dsh-click

# 2. restart and verify the row
dsh --profile web --dump-config | grep -A2 'id: dsh-click'
```

Then ask the agent to look at a window and act — the approval prompt appears for every mutating action:

```
> Open Notepad, type "hello", then read back what is on screen.
```

## Install & uninstall

- **git channel** (latest `main`): `dsh plugin --profile web add "github:PerryLink/dsh-click#main"` — the `prepare` script builds with production dependencies only.
- **npm channel** (published releases): `dsh plugin --profile web add dsh-click`.
- **tarball channel**: `pnpm pack` in this repo, then `dsh plugin --profile web add ./dsh-click-<version>.tgz`.
- **uninstall**: `dsh plugin --profile web remove dsh-click` (or remove the row from the profile patch).

> If pnpm reports `ERR_PNPM_IGNORED_BUILDS` for this package (esbuild's harmless platform-binary validation), add `allowBuilds: { esbuild: true }` to your `pnpm-workspace.yaml` — the `dsh` CLI prints the exact snippet.

## Configuration

All tunables are Schemastery `Config` fields (changeable from cordis.yml). An id-targeted override replaces the whole row — restate every key you need. `cordis.patch.yml` documents each key inline.

| Key | Default | Meaning |
|---|---|---|
| `requireApproval` | `true` | Gate every mutating action behind approval; observers never ask |
| `autoApproveWindows` | `[]` | Window-title/executable regexes that skip the approval ask (still freshness-checked and audited) |
| `auditSessionEvents` | `true` | Append `dsh-click/observed` / `dsh-click/action` session audit events. The adaptive gate already skips the append on envelope-less hosts (rc.6–rc.8, 0.1.1-rc.2, and 0.1.2-alpha.3, which fails closed on unknown types at read); set `false` to stop audit appends entirely 0.1.2-alpha.3 (adapted 2026-09-01): the session envelope keeps its ignorable field for stored-log read compatibility only - Session.append still cannot stamp it, so audit-gate behavior is unchanged. |
| `focusFallback` | `never` | Whether an action may bring the target window to the foreground as a last resort (`never` / `allow`) |
| `imageMode` | `auto` | `screen_shot` rendering: `auto` (image when the model accepts images, text otherwise) or `text` |
| `helperTimeoutMs` | `30000` | Per-helper-call timeout in ms (1..300000) |
| `maxHelperOutputBytes` | `25165824` | Cap on one helper response in bytes (1024..67108864) |
| `maxScreenshotSide` | `2560` | Longest screenshot side in pixels (320..7680); larger captures are downscaled |
| `staleCheckPixels` | `true` | Compare a fresh pixel hash before every action and refuse on change |
| `maxObservationAgeMs` | `30000` | Maximum age in ms of an observation an action may cite (1000..600000) |
| `maxCachedObservations` | `8` | LRU cap on cached observations (1..64) |
| `maxElements` | `500` | Cap on accessibility elements per `screen_read` (1..2000) |
| `maxTreeDepth` | `32` | Maximum accessibility tree-walk depth (1..64) |
| `maxTextLength` | `200` | Truncation length for sanitized model-visible strings (16..10000) |
| `rollbackEnabled` | `true` | Back up and restore control text when `type` fails |
| `ocr.enabled` / `command` / `language` | `true` / `tesseract` / `eng` | Optional OCR for the `screen_find` path (probed at mount; degrades to unavailable when tesseract is absent) |

Example override in your profile patch:

```yaml
- insert:
    - id: dsh-click
      name: dsh-click
      config:
        requireApproval: true
        autoApproveWindows: ['^Notepad']
        focusFallback: never
```

## Tools & surfaces

| Tool | Read-only | Needs approval | Notes |
|---|---|---|---|
| `screen_shot` | ✅ | — | Returns an `observationId` later actions cite in `basedOn`; image attachment when the model accepts images |
| `screen_read` | ✅ | — | Accessibility tree + pixel hints; element ids are what actions address |
| `click` | | ✅ | Exactly one of `elementId` or `(x, y)`; UIA invoke preferred, posted messages fallback |
| `type` | | ✅ | Value-pattern elements only; backs up and restores control text on failure |
| `scroll` | | ✅ | Element (scroll pattern) or window (posted wheel) |
| `key` | | ✅ | Posted key combinations (`"Ctrl+S"`); apps that ignore posted input refuse loudly |
| `app_list` | ✅ | — | Running applications and their visible windows |
| `app_launch` | | ✅ | By name or executable path, with optional arguments |

## Permissions & data

- **Permissions**: mutating actions cross the official `ctx.approval` seam — the plugin never re-implements or bypasses it. The allowlist only ever *skips the ask for specific windows*; it cannot disable the freshness or process-identity checks.
- **Data**: the plugin stores nothing on disk except the screenshots the attachment store keeps (content-addressed, under the harness's own attachment policy). Observations are cached in memory (LRU, bounded). No network requests, no credential storage.
- **Session log**: `dsh-click/observed` and `dsh-click/action` are log-only audit events carrying sanitized window/process facts — titles, paths, and free text are redacted and length-capped before they are written or shown.

## Security boundaries

- **Observe before act, every time.** Actions must cite a fresh observation; a changed screen (pixel hash) or an expired observation is refused with a model-readable reason demanding re-observation.
- **Approval is the default.** `requireApproval: true` unless you explicitly opt specific windows in; every action — allowed or not — is audit-logged.
- **No foreground stealing.** The helper never brings a target window to the foreground (`focusFallback: 'never'` by default); input is delivered through UIA or posted messages so background windows are not disturbed.
- **Process identity is re-verified** immediately before and after each action; a mid-act process swap fails the outcome (`PROCESS_CHANGED`).
- **Sanitized output.** Control characters are stripped, tabs collapse, credential-shaped values (keys, tokens, JWTs, bearer headers) are redacted before anything reaches the model or the log.
- **Fail closed.** Unsupported platforms, a missing subprocess service, or an unavailable helper refuse every call loudly — profiles keep booting everywhere.

## Known limitations

- **Windows first.** macOS and Linux backends are reserved; on those platforms every call fails closed with a clear reason.
- **Text-only fidelity.** `screen_read` depends on the application exposing UIAutomation; apps without an accessible tree yield pixel hints only. Coordinate clicks remain available.
- **Posted-input apps.** Some applications ignore posted window messages (games, some Electron surfaces); `key` reports this honestly instead of pretending success.
- **Session audit on envelope-less harness builds.** The audit events ride an adaptive gate: hosts that know the vocabulary append plainly, hosts with the `ignorable` envelope append with the marker, and envelope-less hosts — `0.1.0-rc.6`–`0.1.0-rc.8`, `0.1.1-rc.2`, and `0.1.2-alpha.3` (which removed the envelope and fails closed on unknown types at read) — get no audit append; the tool results remain the reconstructable audit trail. Set `auditSessionEvents: false` to stop audit appends entirely.

## Development

```sh
pnpm install        # node ^22.19 || >=24
pnpm run typecheck  # tsc: src + tests against the local harness checkout
pnpm run typecheck:ci  # tsc against the published 0.1.1-rc.2 types (no paths)
pnpm test           # vitest: 66 tests, 11 files (helper smoke runs on Windows)
pnpm run build      # tsdown bundle + tsc declarations (lib/)
pnpm run verify:self-contained  # dependency specs resolve from the registry
pnpm run verify:artifacts       # built ESM face + native helper present
pnpm pack           # the published tarball
```

## Topics

`dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `cordis`, `computer-use`, `windows-automation`, `uiautomation`, `desktop-control`, `screen-reader`

## Contributors

- [@PerryLink](https://github.com/PerryLink) — creator and maintainer: tool surface, action safety boundary, Windows native helper, sanitizers, and the five-language docs.
- [@Mchsd](https://github.com/Mchsd) — added the `auditSessionEvents` opt-out for harnesses whose session reader rejects the `dsh-click` audit events (#2).

## PerryLink DSH Plugin Family

This project is one of the [33 DeepSeek Harness plugins](https://github.com/PerryLink) maintained by [PerryLink](https://github.com/PerryLink). If this one helps you, the others likely will too:

| Plugin | One-liner |
|---|---|
| **[dsh-dsh-auto-review](https://github.com/PerryLink/dsh-dsh-auto-review)** | Second-model auto-review on the approval chain, fail-closed by default | |
| **[dsh-dsh-background-agents](https://github.com/PerryLink/dsh-dsh-background-agents)** | Durable background child agents with a Web UI sidebar, messaging and interrupt | |
| **[dsh-dsh-budget](https://github.com/PerryLink/dsh-dsh-budget)** | Cost governance for DeepSeek Harness: budgets, carbon, and latency in one panel. | |
| **[dsh-dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-dsh-checkpoint-rewind)** | Claude Code /rewind-equivalent: snapshots, session forks, one-shot restore | |
| **[dsh-dsh-claude-move](https://github.com/PerryLink/dsh-dsh-claude-move)** | Migrate Claude Code sessions, memory, skills and CLAUDE.md into DSH | |
| **[dsh-dsh-composer-history](https://github.com/PerryLink/dsh-dsh-composer-history)** | Terminal-style input history for the web composer: arrows, Ctrl+R search | |
| **[dsh-dsh-data-quality](https://github.com/PerryLink/dsh-dsh-data-quality)** | Dataset quality checks and citation cross-checks (the optional numeric bridge consumed here) | |
| **[dsh-dsh-defend](https://github.com/PerryLink/dsh-dsh-defend)** | Prompt-injection, jailbreak, and secret-leak defense for DeepSeek Harness. | |
| **[dsh-dsh-doublecheck](https://github.com/PerryLink/dsh-dsh-doublecheck)** | Engineering-discipline guard: requirements grill, test gates, adversary review | |
| **[dsh-dsh-draw](https://github.com/PerryLink/dsh-dsh-draw)** | Unified static-image generation routing for DeepSeek Harness. | |
| **[dsh-dsh-fast](https://github.com/PerryLink/dsh-dsh-fast)** | Read-only performance diagnostics for DeepSeek Harness. | |
| **[dsh-dsh-fund-research](https://github.com/PerryLink/dsh-dsh-fund-research)** | Deterministic research reports for Chinese public mutual funds | |
| **[dsh-dsh-github](https://github.com/PerryLink/dsh-dsh-github)** | GitHub PR/issues integration for DSH, every write gated by approval | |
| **[dsh-dsh-industry-research](https://github.com/PerryLink/dsh-dsh-industry-research)** | Industry research orchestration that seals its deliverables through this plugin's `ctx.researchReport.assemble` | |
| **[dsh-dsh-library](https://github.com/PerryLink/dsh-dsh-library)** | Local document knowledge base for DeepSeek Harness. | |
| **[dsh-dsh-local-ai](https://github.com/PerryLink/dsh-dsh-local-ai)** | Local-model (Ollama) integration for DeepSeek Harness. | |
| **[dsh-dsh-lsp-actions](https://github.com/PerryLink/dsh-dsh-lsp-actions)** | LSP diagnostics, formatting, completion, code actions and rename over language servers | |
| **[dsh-dsh-mask](https://github.com/PerryLink/dsh-dsh-mask)** | PII masking middleware: anonymize at the model boundary, restore at the display layer | |
| **[dsh-dsh-mcp-panel](https://github.com/PerryLink/dsh-dsh-mcp-panel)** | Read-only MCP runtime panel: /mcp command + Settings tab with status, tools and errors | |
| **[dsh-dsh-memento](https://github.com/PerryLink/dsh-dsh-memento)** | Approval-gated cross-session memory: ctx.memory seam + SQLite + memory tool | |
| **[dsh-dsh-observe](https://github.com/PerryLink/dsh-dsh-observe)** | OpenTelemetry and Langfuse observability exporter for DeepSeek Harness. | |
| **[dsh-dsh-output-styles](https://github.com/PerryLink/dsh-dsh-output-styles)** | Claude Code outputStyles-equivalent runtime style switching | |
| **[dsh-dsh-permission-rules](https://github.com/PerryLink/dsh-dsh-permission-rules)** | Claude Code-style declarative allow/deny/ask permission rules with audit | |
| **[dsh-dsh-plugin-guide](https://github.com/PerryLink/dsh-dsh-plugin-guide)** | Plugin-development knowledge base as an on-demand agent skill | |
| **[dsh-dsh-research-report](https://github.com/PerryLink/dsh-dsh-research-report)** | Verifiable research-report engine: content-addressed evidence ledger and sealed versions | |
| **[dsh-dsh-score](https://github.com/PerryLink/dsh-dsh-score)** | Multi-dimensional quality scoring for DeepSeek Harness plugins. | |
| **[dsh-dsh-session-pin](https://github.com/PerryLink/dsh-dsh-session-pin)** | Pin sessions in the Web sidebar with durable ordering | |
| **[dsh-dsh-session-sync](https://github.com/PerryLink/dsh-dsh-session-sync)** | Cross-device session sync for DeepSeek Harness — a dedicated git mirror of your session store. | |
| **[dsh-dsh-skill-pack-security](https://github.com/PerryLink/dsh-dsh-skill-pack-security)** | Security-audit skill pack: secret scan, dependency and supply-chain review | |
| **[dsh-dsh-talk](https://github.com/PerryLink/dsh-dsh-talk)** | Voice-first session loop for DeepSeek Harness: talk to it, hear it answer. | |
| **[dsh-dsh-test-drive](https://github.com/PerryLink/dsh-dsh-test-drive)** | Isolated install-and-smoke test drives for DeepSeek Harness plugins. | |
| **[dsh-dsh-translate](https://github.com/PerryLink/dsh-dsh-translate)** | Vendor parameter translation and deterministic JSON repair for DeepSeek Harness. | |

## License

[Apache License 2.0](LICENSE) © 2026 dsh-click contributors
