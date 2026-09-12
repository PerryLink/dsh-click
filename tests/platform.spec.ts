/**
 * The helper-process wire boundary: request framing, response validation,
 * error envelopes, exit codes, and the backend selection/availability
 * contract. The subprocess provider is scripted (a subclass of the REAL
 * `SubprocessRuntime`); the JSON decoding and field validation run for real.
 *
 * @module dsh-click/test/platform.spec
 */

import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import { resolveConfig } from '../src/config.ts'
import { UnavailableBackend } from '../src/platform/selection.ts'
import { HelperBackend } from '../src/platform/runner.ts'
import { DshClickError } from '../src/platform/types.ts'
import { FakeSubprocessRuntime } from './harness.ts'

function makeBackend() {
  const ctx = new Context()
  const subprocess = new FakeSubprocessRuntime(ctx)
  const backend = new HelperBackend(resolveConfig({}), subprocess)
  return { backend, subprocess }
}

describe('HelperBackend request framing', () => {
  it('sends the JSON request on stdin with the protocol handshake', async () => {
    const { backend, subprocess } = makeBackend()
    subprocess.nextStdout = JSON.stringify({
      ok: true,
      result: [{
        windowId: 42,
        processId: 7,
        title: 'T',
        className: 'C',
        rect: { x: 0, y: 0, width: 10, height: 10 },
        executablePath: null,
        visible: true,
      }],
    })
    const windows = await backend.listWindows()
    expect(windows).toHaveLength(1)
    expect(windows[0]?.windowId).toBe(42)

    const spec = subprocess.spawns[0]
    expect(spec).toBeDefined()
    if (spec === undefined) return
    expect(spec.argv).toContain('-NoProfile')
    expect(spec.argv).toContain('-File')
    expect(spec.argv.at(-1)).toMatch(/dsh-click-helper\.ps1$/u)
    expect(typeof spec.stdio.stdin).toBe('object')
    if (typeof spec.stdio.stdin !== 'object') return
    const request = JSON.parse(spec.stdio.stdin.data) as { protocol: number; op: string; pluginVersion: string }
    expect(request.protocol).toBe(1)
    expect(request.op).toBe('windows')
    expect(request.pluginVersion).toMatch(/^\d+\.\d+\.\d+$/u)
  })

  it('surfaces a helper error envelope with its code', async () => {
    const { backend, subprocess } = makeBackend()
    subprocess.nextStdout = JSON.stringify({ ok: false, error: { code: 'WINDOW_NOT_FOUND', message: 'window 7 not found' } })
    await expect(backend.snapshot(7)).rejects.toMatchObject({ code: 'WINDOW_NOT_FOUND' })
  })

  it('fails loud on a non-zero exit with the stderr tail', async () => {
    const { backend, subprocess } = makeBackend()
    subprocess.nextExitCode = 1
    subprocess.nextStderr = 'Exception: boom'
    await expect(backend.listWindows()).rejects.toMatchObject({ code: 'HELPER_FAILED' })
    await expect(backend.listWindows()).rejects.toThrow(/boom/u)
  })

  it('fails loud on malformed stdout', async () => {
    const { backend, subprocess } = makeBackend()
    subprocess.nextStdout = 'not json at all'
    await expect(backend.listWindows()).rejects.toMatchObject({ code: 'BAD_HELPER_RESPONSE' })
  })

  it('validates response fields at the wire boundary', async () => {
    const { backend, subprocess } = makeBackend()
    subprocess.nextStdout = JSON.stringify({
      ok: true,
      result: { windowId: 1, processId: 'not-a-number', executablePath: null, title: 'T', className: 'C', rect: { x: 0, y: 0, width: 1, height: 1 }, foreground: false, treeHash: 't', shotHash: 's', elementCount: 0 },
    })
    await expect(backend.snapshot(1)).rejects.toMatchObject({ code: 'BAD_HELPER_RESPONSE' })
  })

  it('validates action outcomes at the wire boundary', async () => {
    const { backend, subprocess } = makeBackend()
    subprocess.nextStdout = JSON.stringify({
      ok: true,
      result: { windowId: 1, action: 'click', delivered: 'uia', processBefore: { pid: 1, executablePath: null }, processAfter: { pid: 1, executablePath: 5 } },
    })
    await expect(backend.click({ windowId: 1, x: 0, y: 0, button: 'left' }, false)).rejects.toMatchObject({ code: 'BAD_HELPER_RESPONSE' })
  })
})

describe('UnavailableBackend', () => {
  it('reports its reason and fails closed on every operation', () => {
    const backend = new UnavailableBackend('darwin', 'macOS is reserved')
    expect(backend.available).toBe(false)
    expect(backend.unavailableReason).toContain('macOS')
    expect(() => backend.listWindows()).toThrow(DshClickError)
    expect(() => backend.listWindows()).toThrow(/macOS/u)
  })
})
