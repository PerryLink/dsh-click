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

describe('helper window records', () => {
  it('parses a minimized window with no rect', async () => {
    const { backend, subprocess } = makeBackend()
    subprocess.nextStdout = JSON.stringify({
      ok: true,
      result: [{
        windowId: 42,
        processId: 7,
        title: 'Explorer',
        className: 'CabinetWClass',
        rect: null,
        minimized: true,
        executablePath: null,
        visible: true,
      }],
    })
    const windows = await backend.listWindows()
    expect(windows[0]?.minimized).toBe(true)
    expect(windows[0]?.rect).toBeNull()
  })

  it('rejects a minimized window that still carries the placeholder rect', async () => {
    const { backend, subprocess } = makeBackend()
    subprocess.nextStdout = JSON.stringify({
      ok: true,
      result: [{
        windowId: 42,
        processId: 7,
        title: 'Explorer',
        className: 'CabinetWClass',
        rect: { x: -32000, y: -32000, width: 314, height: 50 },
        minimized: true,
        executablePath: null,
        visible: true,
      }],
    })
    await expect(backend.listWindows()).rejects.toMatchObject({ code: 'BAD_HELPER_RESPONSE' })
  })
})

describe('helper shot records', () => {
  function shotResult(overrides: Record<string, unknown> = {}): string {
    return JSON.stringify({
      ok: true,
      result: {
        pngBase64: 'AAA',
        width: 800,
        height: 600,
        captureMethod: 'printwindow-fullcontent',
        scope: 'window',
        snapshot: {
          windowId: 42,
          processId: 7,
          executablePath: null,
          title: 'T',
          className: 'C',
          rect: { x: 1, y: 2, width: 3, height: 4 },
          foreground: false,
          treeHash: 't',
          shotHash: 's',
          elementCount: 0,
        },
        ...overrides,
      },
    })
  }

  it('parses captureMethod/scope and forwards the requested scope', async () => {
    const { backend, subprocess } = makeBackend()
    subprocess.nextStdout = shotResult()
    const shot = await backend.shot({ windowId: 42 }, 800, 'virtual')
    expect(shot.captureMethod).toBe('printwindow-fullcontent')
    expect(shot.scope).toBe('window')
    const spec = subprocess.spawns[0]
    expect(spec).toBeDefined()
    if (spec === undefined) return
    const stdin = spec.stdio.stdin
    if (typeof stdin !== 'object') throw new Error('stdin was not captured')
    const request = JSON.parse(stdin.data) as { op: string; args: { scope: string; target: unknown } }
    expect(request.op).toBe('shot')
    expect(request.args.scope).toBe('virtual')
    expect(request.args.target).toEqual({ windowId: 42 })
  })

  it('accepts every documented capture method and screen scope', async () => {
    for (const captureMethod of ['printwindow-fullcontent', 'printwindow', 'copyfromscreen']) {
      const { backend, subprocess } = makeBackend()
      subprocess.nextStdout = shotResult({ captureMethod, scope: 'primary' })
      const shot = await backend.shot({}, 800, 'primary')
      expect(shot.captureMethod).toBe(captureMethod)
      expect(shot.scope).toBe('primary')
    }
  })

  it('rejects an unknown captureMethod', async () => {
    const { backend, subprocess } = makeBackend()
    subprocess.nextStdout = shotResult({ captureMethod: 'bitblt-magic' })
    await expect(backend.shot({ windowId: 1 }, 800, 'primary')).rejects.toMatchObject({ code: 'BAD_HELPER_RESPONSE' })
  })

  it('rejects an unknown capture scope', async () => {
    const { backend, subprocess } = makeBackend()
    subprocess.nextStdout = shotResult({ scope: 'secondary' })
    await expect(backend.shot({ windowId: 1 }, 800, 'primary')).rejects.toMatchObject({ code: 'BAD_HELPER_RESPONSE' })
  })

  it('still asks for a snapshot by the legacy windowId field', async () => {
    const { backend, subprocess } = makeBackend()
    subprocess.nextStdout = JSON.stringify({
      ok: true,
      result: {
        windowId: 42,
        processId: 7,
        executablePath: null,
        title: 'T',
        className: 'C',
        rect: { x: 1, y: 2, width: 3, height: 4 },
        foreground: false,
        treeHash: 't',
        shotHash: 's',
        elementCount: 0,
      },
    })
    await backend.snapshot(42)
    const spec = subprocess.spawns[0]
    if (spec === undefined) throw new Error('no spawn')
    const stdin = spec.stdio.stdin
    if (typeof stdin !== 'object') throw new Error('stdin was not captured')
    const request = JSON.parse(stdin.data) as { op: string; args: Record<string, unknown> }
    expect(request.op).toBe('snapshot')
    expect(request.args['windowId']).toBe(42)
    expect(request.args['target']).toBeUndefined()
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
