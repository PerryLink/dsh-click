# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
