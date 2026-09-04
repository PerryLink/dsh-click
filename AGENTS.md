# AGENTS.md

Standalone DeepSeek Harness plugin repository (`dsh-click`). Development follows the dsh-plugin-guide skill and the official plugin contract; this file records repo-local decisions.

## Layout

- `src/index.ts` — function-plugin contract (`name`/`inject`/`Config`/`apply`; NO default export — the Loader unwraps `exports.default ?? exports`). Injects `tools` only; the backend comes from the optional `dsh-click/backend` service (test/embedding seam) or platform selection.
- `src/config.ts` — Schemastery schema + explicit `resolveConfig` (no hidden `?? default` in `run()` paths); every default and bound is re-judged there so plain-JS mounts fail loud too.
- `src/tools.ts` — the eight tool definitions through `defineTool` with strict schema typing: parameter `required: true` must be `as const`, `oneOf` branches are `as const` tuples, and `execute`/`render` return types are inferred from the schema (never annotated with a broad `JsonValue` — that defeats `InferValue`).
- `src/actions.ts` — `ActionExecutor`: freshness (`requireFreshWindow`), approval gate (`requireApproval` / `autoApproveWindows` allowlist / `focusFallback`), process-identity verification before/after, and the `dsh-click/action` audit append.
- `src/observe.ts` — `ObservationStore`: LRU cache of observations addressed by id, with the staleness verdict (`fresh`/`stale`/`unknown`).
- `src/events.ts` — `dsh-click/observed` and `dsh-click/action` `SessionEventMap` members (declaration merging) + payload types.
- `src/sanitize.ts` — pure display/audit redaction: control characters stripped (NUL included), tabs collapse to a single space, secret values (`key=`/`key:`, JWTs, bearer tokens) redacted, values stop at control characters, and `sanitizeVisible` redacts BEFORE sanitizing.
- `src/vision.ts` — whether the current session's model accepts images (vision routing for `screen_shot`).
- `src/platform/types.ts` — the wire vocabulary shared with the native helper (the platform seam) + response field validators for the process trust line.
- `src/platform/runner.ts` — `HelperBackend`: spawns `native/win32/dsh-click-helper.ps1` through `ctx.subprocess`, JSON request on stdin / JSON response on stdout, deadline- and signal-bounded.
- `src/platform/selection.ts` — `createBackend`: Windows + `ctx.subprocess` → `HelperBackend`; everything else is an unavailable backend that fails closed with a model-readable reason (profiles keep booting everywhere).
- `native/win32/dsh-click-helper.ps1` — the PowerShell helper: UIAutomation reads and posted input, no foreground stealing, JSON protocol (`HELPER_PROTOCOL_VERSION`).
- `tests/` — vitest; real Cordis `Context` + real `SessionStore`/`Session`/`ToolRuntime`/`ApprovalService` from the `0.1.2-rc.1` peers; the desktop backend and subprocess are scripted fakes (the subprocess fake is a subclass of the REAL `SubprocessRuntime`), and the helper smoke test runs the real PowerShell helper end to end on Windows only.

## Hard rules applied here

- **Optional seam, fail closed.** `apply` reads the optional `dsh-click/backend` service first (tests/embeddings pre-select the desktop backend); real deployments fall through to `createBackend`, and an unavailable backend refuses every call with a model-readable reason instead of silently doing nothing.
- **Stale-state boundary.** Every mutating action must cite a `basedOn` observation id; the executor re-captures the window (pixel hash when `staleCheckPixels`, plus the max-age bound) and refuses on any difference — an action never acts on a screen that changed under it.
- **Approval first, allowlist explicit.** Mutating actions cross `ctx.approval` by default (`requireApproval: true`); only window-title/executable regexes from `autoApproveWindows` skip the ask, and those actions are still freshness-checked, process-verified, and audit-logged.
- **No foreground stealing.** The helper never brings a target window to the foreground; `focusFallback: 'allow'` is the only sanctioned escape hatch and stays `'never'` by default.
- **Process identity before and after.** Each action verifies pid + executable path around the act; a change throws `PROCESS_CHANGED` and the audit event records both facts.
- **Model-visible ⟺ logged.** The only model-visible plugin content is the sanitized tool output plus the audit facts; the audit append goes through the adaptive gate in `src/events.ts`: hosts that know the vocabulary append plainly, hosts with the `ignorable` envelope append with the marker, and envelope-less hosts (`0.1.0-rc.6`–`0.1.0-rc.8`, `0.1.1-rc.2`, and `0.1.2-alpha.1`, which removed the envelope and fails closed on unknown types at read) get no audit append — the tool results remain the reconstructable audit trail. `auditSessionEvents: false` stops audit appends entirely.
- **Audit never flips outcomes.** A failed audit append is swallowed — the tool result still carries the model-visible content.
- **Waterfall discipline.** This plugin registers no waterfall listeners today; if it ever does, allow/passthrough MUST call `next()` and only a deliberate deny/ask may short-circuit.
- **Loud misconfiguration.** Invalid regexes in `autoApproveWindows`, out-of-bounds numbers, and unknown enum members fail `resolveConfig` at load, never silently.

## Checks

`pnpm run typecheck && pnpm run typecheck:ci && pnpm test && pnpm run build && pnpm run verify:self-contained && pnpm run verify:artifacts && pnpm pack`

- `typecheck` resolves `@deepseek-ai/*` through tsconfig paths to the local harness checkout; `typecheck:ci` clears the paths and checks against the published `0.1.2-rc.1` types. Both must stay green — the package ships against 0.1.2-rc.1.
- `verify:artifacts` also proves the tarball's ESM face imports under plain Node and that the native helper ships.

## Release

`node scripts/release.mjs <x.y.z>` bumps package.json + `src/version.ts`, stamps the CHANGELOG `[Unreleased]` section, re-runs the full gate, and commits + tags (never pushes). `git push origin main --follow-tags` triggers `.github/workflows/release.yml`, which re-runs the gate, publishes to npm with provenance, and creates the GitHub Release from the stamped CHANGELOG section.

## Docs

- Five-language READMEs (`README.md`, `README.zh.md`, `README.es.md`, `README.pt.md`, `README.hi.md`) — keep all five in sync; the English file is the source of truth.
- GitHub topics `dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `cordis`, `computer-use`, `windows-automation`, `uiautomation`, `desktop-control`, `screen-reader` (mirror `package.json` keywords; the ecosystem's visibility channel is the `dsh-plugin` topic).
- License is Apache-2.0 (`LICENSE` + the package.json `license` field). `THIRD_PARTY_NOTICES.md` documents the build-time dependencies.
