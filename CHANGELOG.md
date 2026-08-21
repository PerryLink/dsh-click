# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.2] - 2026-08-21

### Added

- `auditSessionEvents` config option (default `true`): set `false` to stop appending `dsh-click/observed` / `dsh-click/action` session audit events. The `0.1.0-rc.6`–`0.1.0-rc.8` harness peers expose no append-envelope (`ignorable`) option for plugin events, so the two-argument audit appends land as required-on-read events; harnesses whose session reader uses a static event whitelist (DeepSeek Harness rc.6–rc.8 `KNOWN_SESSION_EVENT_TYPES`) refuse to resume such sessions with "event type ... unknown to this harness and not marked ignorable". Disabling the audit append is the workaround until the harness gains a plugin-event registration surface.

### Changed

- Harness peers upgraded from `0.1.0-rc.6` to `0.1.0-rc.8`: all `@deepseek-ai/dsh-*` devDependencies pinned to `0.1.0-rc.8`, peerDependencies widened to `>=0.1.0-rc.8 <0.2.0`, and the declared compatibility now targets `0.1.0-rc.8`.

## [0.1.1] - 2026-08-16

### Fixed

- PowerShell helper rewritten as BOM-prefixed ASCII so Windows PowerShell 5.1 parses it on every system codepage (Windows CI matrix).
- `pnpm-workspace.yaml` now declares `allowBuilds` for esbuild, node-pty, and dsh-subprocess-local — clean installs no longer fail with `ERR_PNPM_IGNORED_BUILDS`.

### Docs

- Install sections in all five READMEs document the `allowBuilds` snippet for `ERR_PNPM_IGNORED_BUILDS`.

## [0.1.0] - 2026-08-16

### Added

- Eight desktop-control tools behind one safety boundary: `screen_shot`, `screen_read` (structured accessibility tree + pixel hints for text-only models), `click`, `type`, `scroll`, `key`, `app_list`, `app_launch`.
- Windows native helper (`native/win32/dsh-click-helper.ps1`) driven over the `ctx.subprocess` seam with a JSON wire protocol (UIAutomation + posted input, never stealing foreground focus).
- Safety boundary on every mutating action: fresh-observation requirement (`basedOn`) with pixel-hash staleness rejection, approval gate (configurable window allowlist), process-identity verification before and after each action, and `type` rollback.
- `dsh-click/observed` and `dsh-click/action` session audit events (sanitized, log-only).
- Optional backend seam (`dsh-click/backend`) so embeddings and tests can pre-select the desktop backend.
- Schemastery configuration with fail-loud bounds; every tunable documented in `cordis.patch.yml` and the five-language READMEs.

### Changed

- Sanitizers: secret values stop at control characters, tabs collapse to a single space, and `sanitizeVisible` redacts before sanitizing.
- Session audit appends use the two-argument `Session.append` form so the package typechecks and runs on the pinned `0.1.0-rc.6` peers (those builds have no append-envelope option).

### Fixed

- Tool definitions now satisfy the strict `defineTool` schema typing (parameter `required: true as const`, output-schema tuples, schema-inferred execute/render signatures).
- Test harness double-registration of the subprocess service (Cordis services self-register on construction).
