/**
 * Sealed adversarial helper suite (U6): a fake subprocess provider scripts
 * the platform-helper behaviors that a real PowerShell helper would hit in
 * the wild — the executable cannot be resolved (unavailable) and the helper
 * hangs past its deadline (timeout). Both fail closed instead of hanging or
 * silently succeeding. No PowerShell and no network is involved; the JSON
 * wire validation and malformed-output cases (非畸形输出) live in
 * `platform.spec.ts`.
 * @module dsh-click/test/helper-fake.spec
 */

import { Context } from '@deepseek-ai/cordis'
import {
  SubprocessRuntime,
  type SubprocessCollectedOutputs,
  type SubprocessHandle,
  type SubprocessOutputReader,
  type SubprocessSpawnSpec,
} from '@deepseek-ai/dsh-subprocess'
import { describe, expect, it } from 'vitest'
import { resolveConfig } from '../src/config.ts'
import { HelperBackend } from '../src/platform/runner.ts'

function emptyReader(): SubprocessOutputReader {
  return { readFrom: () => ({ text: '', nextOffset: 0, lossy: false }) }
}

/** A subprocess provider whose spawn hangs until the spec's signal aborts. */
class HangingSubprocessRuntime extends SubprocessRuntime {
  constructor(ctx: Context) {
    super(ctx)
  }

  resolveExecutable(command: string): Promise<string> {
    return Promise.resolve(`C:\\Windows\\System32\\${command}`)
  }

  spawn(spec: SubprocessSpawnSpec): SubprocessHandle {
    return {
      pid: 7777,
      stdin: undefined,
      stdout: undefined,
      stderr: undefined,
      collected: { stdout: emptyReader(), stderr: emptyReader() } as SubprocessCollectedOutputs,
      done: new Promise((_resolve, reject) => {
        spec.signal?.addEventListener('abort', () => {
          reject(new Error('helper deadline aborted the hung spawn'))
        }, { once: true })
      }),
      terminate: () => undefined,
      waitForExit: async () => true,
    }
  }

  spawnTerminal(): never {
    throw new Error('not used by tests')
  }
}

/** A subprocess provider that cannot resolve the helper executable. */
class BrokenResolveSubprocessRuntime extends SubprocessRuntime {
  constructor(ctx: Context) {
    super(ctx)
  }

  resolveExecutable(): Promise<string> {
    return Promise.reject(new Error('powershell.exe not found'))
  }

  spawn(): SubprocessHandle {
    throw new Error('should never spawn once the executable cannot be resolved')
  }

  spawnTerminal(): never {
    throw new Error('not used by tests')
  }
}

describe('helper unavailable', () => {
  it('fails closed with HELPER_MISSING when the executable cannot be resolved', async () => {
    const ctx = new Context()
    const backend = new HelperBackend(resolveConfig({}), new BrokenResolveSubprocessRuntime(ctx))
    await expect(backend.listWindows()).rejects.toMatchObject({ code: 'HELPER_MISSING' })
    await ctx.fiber.dispose()
  })
})

describe('helper timeout', () => {
  it('aborts a hung helper within the configured deadline instead of hanging', async () => {
    const ctx = new Context()
    const subprocess = new HangingSubprocessRuntime(ctx)
    const backend = new HelperBackend(resolveConfig({ helperTimeoutMs: 100 }), subprocess)
    await expect(backend.listWindows()).rejects.toThrow(/aborted/u)
    await ctx.fiber.dispose()
  })
})
