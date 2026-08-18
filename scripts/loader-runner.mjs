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
// default-export regression cases).

import { Context } from '@deepseek-ai/cordis'
import Include from '@deepseek-ai/cordis-plugin-include'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import { CallId } from '@deepseek-ai/dsh-llm'
import { SessionId } from '@deepseek-ai/dsh-session'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

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
  async shot(_ref, maxSide, _signal) {
    this.capturedMaxSide = maxSide
    return {
      pngBase64: Buffer.from('fake-png-bytes').toString('base64'),
      width: 800,
      height: 600,
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

  // Authoritative registry: all eight tools are registered.
  const schemas = ctx.tools.schemas()
  const names = schemas.map(schema => schema.name)
  for (const expected of ['screen_shot', 'screen_read', 'click', 'type', 'scroll', 'key', 'app_list', 'app_launch']) {
    if (!names.includes(expected)) {
      throw new Error(`Loader composition: ${expected} tool is missing from the tools registry`)
    }
  }

  // Real behavior through the real tools registry: screen_shot forwards the
  // config-clamped `maxSide` to the backend.
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
  const result = await ctx.tools.execute({
    callId: CallId('dsh-click-loader-runner'),
    name: 'screen_shot',
    arguments: { maxSide: 9999 },
    agent,
    signal: new AbortController().signal,
  })
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
