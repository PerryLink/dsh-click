/**
 * Real helper smoke test (Windows only): mount the REAL local subprocess
 * provider and run the shipped PowerShell helper end to end — one `windows`
 * op proves the JSON round trip, the P/Invoke block, and the response
 * envelope. Skipped on non-Windows platforms.
 *
 * @module dsh-click/test/helper.spec
 */

import { Context } from '@deepseek-ai/cordis'
import LocalSubprocessRuntime from '@deepseek-ai/dsh-subprocess-local'
import { describe, expect, it } from 'vitest'
import { resolveConfig } from '../src/config.ts'
import { HelperBackend } from '../src/platform/runner.ts'

const describeOnWindows = process.platform === 'win32' ? describe : describe.skip

describeOnWindows('real PowerShell helper', () => {
  it('runs the windows op through the real subprocess provider', async () => {
    const ctx = new Context()
    await ctx.plugin(LocalSubprocessRuntime)
    const subprocess = ctx.get('subprocess') as import('@deepseek-ai/dsh-subprocess').SubprocessRuntime
    const backend = new HelperBackend(resolveConfig({}), subprocess)

    const windows = await backend.listWindows()
    expect(Array.isArray(windows)).toBe(true)
    for (const window of windows) {
      expect(window.windowId).toBeGreaterThan(0)
      expect(typeof window.title).toBe('string')
      expect(typeof window.className).toBe('string')
      expect(window.rect.width).toBeGreaterThanOrEqual(0)
    }
  }, 120_000)
})
