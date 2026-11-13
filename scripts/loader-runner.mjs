// scripts/loader-runner.mjs — real Loader composition runner (community
// five-layer model, layer 4). An independent process boots a real Context,
// mounts the vendored Loader with the Include builtin, reads the given
// cordis.yml (service rows + plugin row + config), then asserts the plugin's
// contributions through the authoritative tool registry and executes one real
// behavior. A scripted desktop backend is provided through the plugin's own
// `dsh-click/backend` seam so the composition stays sealed (no PowerShell, no
// network). Config is applied by the Loader, so the observed `maxSide` clamp
// proves the config in the file was honored.
//
// Usage: node scripts/loader-runner.mjs <cordis.yml>
// Exit 0 prints DSH_LOADER_RESULT <json>; any assertion or load failure exits
// non-zero with the reason on stderr (used by the invalid-config and
// default-export regression cases). A loader row whose `apply` (or config
// validation) threw is re-thrown from its own fiber so those negations still
// fail on the real reason instead of on the downstream "tool is missing"
// symptom — see `rethrowFirstFailedRow` below.

import { Context } from '@deepseek-ai/cordis'
import Include from '@deepseek-ai/cordis-plugin-include'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import { SessionId } from '@deepseek-ai/dsh-session'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// Dual-ruler call id: host master renamed dsh-llm's `CallId` brand to
// `ToolCallId`; a local identity keeps the runner green on both rulers.
const CallId = (id) => id

const configArgument = process.argv[2]
if (configArgument === undefined) {
  console.error('usage: loader-runner.mjs <cordis.yml>')
  process.exit(2)
}

const configPath = resolve(configArgument)
// Resolve bare package rows from this repository's dependency tree so the
// composition works with config files written anywhere (e.g. a temp dir).
const configRequire = createRequire(resolve(import.meta.dirname, '../package.json'))

// A sealed scripted backend: it records the `maxSide` the screen_shot tool
// forwards, so the runner can prove the Loader applied `maxScreenshotSide`.
const fakeBackend = {
  platform: 'win32',
  available: true,
  capturedMaxSide: undefined,
  async shot(_ref, maxSide, _scope, _signal) {
    this.capturedMaxSide = maxSide
    return {
      pngBase64: Buffer.from('fake-png-bytes').toString('base64'),
      width: 800,
      height: 600,
      captureMethod: 'printwindow-fullcontent',
      scope: 'window',
      snapshot: {
        windowId: 42,
        processId: 4242,
        executablePath: 'C:\\Apps\\demo.exe',
        title: 'Demo App',
        className: 'DemoClass',
        rect: { x: 0, y: 0, width: 800, height: 600 },
        foreground: false,
        treeHash: 'tree-hash-1',
        shotHash: 'shot-hash-1',
        elementCount: 1,
      },
    }
  },
}

const ctx = new Context()
/** Error-severity log records, kept so a failed row's reason survives for the assertion. */
const capturedErrors = []
ctx.logger.exporter({
  levels: { default: 0 },
  export: (message) => {
    if (message.level === 'error' || message.level === 0) {
      capturedErrors.push(message.args?.[0] instanceof Error ? message.args[0] : new Error(String(message.args?.[0] ?? message.message ?? 'loader error')))
    }
  },
})
try {
  ctx.baseUrl = `${pathToFileURL(dirname(configPath)).href}/`
  // The plugin reads its backend from this optional seam before falling back
  // to platform selection, so the composition exercises the real tool
  // pipeline against scripted desktop data instead of spawning PowerShell.
  ctx.provide('dsh-click/backend', fakeBackend)
  await ctx.plugin(Loader)
  ctx.loader.internal = /** @type {any} */ ({
    version: 'v2',
    async import(specifier) {
      if (specifier.startsWith('file:')) return import(specifier)
      if (specifier.startsWith('node:')) return import(specifier)
      const absolute = /^([a-zA-Z]:)?[\\/]/u.test(specifier)
      return import(pathToFileURL(absolute ? specifier : configRequire.resolve(specifier)).href)
    },
  })
  ctx.loader.builtins.include = Include
  await ctx.loader.create({
    name: 'cordis:include',
    config: { path: pathToFileURL(configPath).href },
  })
  await ctx.loader.await()
  // cordis 4.1.0 no longer rejects `loader.await()` when a row fails to apply:
  // the error settles on that row's fiber. Await every row fiber so an invalid
  // config or a missing inject still fails loud here on the real reason instead
  // of surfacing as a missing registry entry. (0.2.2 upgrade fix; measured
  // against loader 1.1.0.)
  for (const entry of ctx.loader.entries()) await entry.fiber
  rethrowFirstFailedRow()

  // Authoritative registry: all eight tools are registered.
  const schemas = ctx.tools.schemas()
  const names = schemas.map(schema => schema.name)
  for (const expected of ['screen_shot', 'screen_read', 'click', 'type', 'scroll', 'key', 'app_list', 'app_launch']) {
    if (!names.includes(expected)) {
      throw new Error(`Loader composition: ${expected} tool is missing from the tools registry`)
    }
  }

  // Real behavior through the real tools registry: screen_shot forwards the
  // config-clamped `maxSide` to the backend. 0.2.2 dispatches a whole batch and
  // settles one correlated result per call.
  const session = ctx.sessions.create(SessionId('dsh-click-loader-runner'))
  const agent = /** @type {any} */ ({
    id: session.id,
    options: { provider: 'deepseek', model: 'demo-model' },
    session,
    inbox: {},
    status: 'idle',
    ctx,
    cancel: () => undefined,
    whenIdle: async () => undefined,
    runMaintenance: async (task) => task(new AbortController().signal),
    send: () => undefined,
    followup: () => undefined,
    steer: () => undefined,
    inject: () => undefined,
  })
  const batch = await ctx.tools.execute({
    calls: [{ type: 'tool-call', id: CallId('dsh-click-loader-runner'), name: 'screen_shot', arguments: JSON.stringify({ maxSide: 9999 }) }],
    agent,
    signal: new AbortController().signal,
  })
  const result = batch.results[0]?.result
  if (result === undefined) {
    throw new Error('Loader composition: screen_shot produced no result')
  }
  if (result.isError) {
    throw new Error(`Loader composition: screen_shot errored: ${result.error?.message ?? String(result.error)}`)
  }

  const summary = {
    tools: names,
    observationId: /** @type {any} */ (result.value)?.observationId,
    capturedMaxSide: fakeBackend.capturedMaxSide,
  }
  process.stdout.write(`DSH_LOADER_RESULT ${JSON.stringify(summary)}\n`)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
} finally {
  await ctx.fiber.dispose()
}

/**
 * Re-throw the first FAILED loader row's error — fallback for the fiber await.
 *
 * `cordis-plugin-loader` 1.0.6 dropped the failure surface `await()` had in
 * 1.0.4: the old body collected `entry._await()` outcomes and threw the single
 * failure (or an AggregateError), while 1.0.6's body only loops over
 * `_initTask || fiber.inertia` and returns as soon as there is no pending
 * task — so a row whose config validation or `apply` threw no longer makes
 * `await()` reject. cordis 4.1.0 keeps that behavior but parks the reason on
 * the row's fiber (`Fiber._error`, re-thrown by `fiber.await()`), which is why
 * the caller awaits every row fiber first. This state scan stays as a fallback
 * for a row whose error does not surface through `fiber.await()`; the reason is
 * then recovered from the row's own error records.
 *
 * `DSH_LOADER_RUNNER_NO_RETHROW=1` disables it for re-measurement only.
 */
function rethrowFirstFailedRow() {
  if (process.env.DSH_LOADER_RUNNER_NO_RETHROW === '1') return
  const failed = []
  for (const entry of ctx.loader.entries()) {
    const fiber = entry?.fiber
    // FiberState.FAILED === 3 (const enum, erased at runtime). A failed row keeps no
    // `fiber.error` on this line, so the reason is recovered from the row's own log records.
    if (fiber?.state === 3) failed.push(capturedErrors.shift() ?? new Error(`loader row ${String(entry?.options?.name ?? '?')} failed`))
  }
  if (failed.length === 1) throw failed[0]
  if (failed.length > 1) throw new AggregateError(failed, 'loader fibers failed')
}
