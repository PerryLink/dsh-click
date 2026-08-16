/**
 * The Windows backend: every operation spawns the native PowerShell helper
 * (`native/win32/dsh-click-helper.ps1`) through the harness's `ctx.subprocess`
 * seam. The request travels as JSON on stdin; the response is JSON on stdout
 * and is validated field-by-field at this wire boundary. Each call is
 * deadline-bounded (config `helperTimeoutMs`) and aborts with the caller's
 * signal (the subprocess service escalates to tree termination).
 *
 * @module dsh-click/platform/runner
 */

import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { SubprocessRuntime } from '@deepseek-ai/dsh-subprocess'
import type { ResolvedConfig } from '../config.ts'
import { HELPER_PROTOCOL_VERSION, VERSION } from '../version.ts'
import {
  DshClickError,
  expectNumber,
  expectProcessFacts,
  expectRecordValue,
  expectString,
  type ActionOutcome,
  type AppInfo,
  type ClickRequest,
  type DesktopBackend,
  type ElementInfo,
  type HelperRequest,
  type HelperResponse,
  type KeyRequest,
  type LaunchOutcome,
  type PixelHint,
  type Rect,
  type Screenshot,
  type ScrollRequest,
  type Tree,
  type WindowInfo,
  type WindowRef,
  type WindowSnapshot,
  type TypeRequest,
} from './types.ts'

/** Locate the shipped helper script from either source or bundle layout. */
function findHelperPath(): string {
  const override = process.env['DSH_CLICK_HELPER']
  if (override !== undefined && override !== '') return override
  let dir = path.dirname(fileURLToPath(import.meta.url))
  for (let depth = 0; depth < 8; depth += 1) {
    const candidate = path.join(dir, 'native', 'win32', 'dsh-click-helper.ps1')
    if (existsSync(candidate)) return candidate
    dir = path.dirname(dir)
  }
  throw new DshClickError('cannot locate native/win32/dsh-click-helper.ps1 next to the package', 'HELPER_MISSING')
}

/** Validate a helper rect at the wire boundary. */
function expectRect(value: unknown, op: string): Rect {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new DshClickError(`helper "${op}" returned a malformed rect`, 'BAD_HELPER_RESPONSE')
  }
  const record = value as Record<string, unknown>
  return {
    x: expectNumber(record, 'x', op),
    y: expectNumber(record, 'y', op),
    width: expectNumber(record, 'width', op),
    height: expectNumber(record, 'height', op),
  }
}

/** Validate one helper window record. */
function expectWindow(value: unknown, op: string): WindowInfo {
  const record = expectRecordValue(value, op)
  const processIdRaw = record['processId']
  const processId = typeof processIdRaw === 'number' ? processIdRaw : null
  const executablePath = record['executablePath']
  if (executablePath !== null && typeof executablePath !== 'string') {
    throw new DshClickError(`helper "${op}" returned malformed executablePath`, 'BAD_HELPER_RESPONSE')
  }
  return {
    windowId: expectNumber(record, 'windowId', op),
    processId,
    title: expectString(record, 'title', op),
    className: expectString(record, 'className', op),
    rect: expectRect(record['rect'], op),
    executablePath,
    visible: record['visible'] !== false,
  }
}

/** Validate one helper snapshot record. */
function expectSnapshot(value: unknown, op: string): WindowSnapshot {
  const record = expectRecordValue(value, op)
  const executablePath = record['executablePath']
  if (executablePath !== null && typeof executablePath !== 'string') {
    throw new DshClickError(`helper "${op}" returned malformed executablePath`, 'BAD_HELPER_RESPONSE')
  }
  return {
    windowId: expectNumber(record, 'windowId', op),
    processId: expectNumber(record, 'processId', op),
    executablePath,
    title: expectString(record, 'title', op),
    className: expectString(record, 'className', op),
    rect: expectRect(record['rect'], op),
    foreground: record['foreground'] === true,
    treeHash: expectString(record, 'treeHash', op),
    shotHash: expectString(record, 'shotHash', op),
    elementCount: expectNumber(record, 'elementCount', op),
  }
}

/** Validate one helper element record. */
function expectElement(value: unknown, op: string): ElementInfo {
  const record = expectRecordValue(value, op)
  const patterns = record['patterns']
  if (!Array.isArray(patterns) || patterns.some(item => typeof item !== 'string')) {
    throw new DshClickError(`helper "${op}" returned malformed element patterns`, 'BAD_HELPER_RESPONSE')
  }
  return {
    elementId: expectString(record, 'elementId', op),
    controlType: expectString(record, 'controlType', op),
    name: expectString(record, 'name', op),
    automationId: expectString(record, 'automationId', op),
    rect: expectRect(record['rect'], op),
    enabled: record['enabled'] === true,
    patterns: patterns as string[],
  }
}

/** Validate one helper pixel hint. */
function expectPixel(value: unknown, op: string): PixelHint {
  const record = expectRecordValue(value, op)
  return {
    label: expectString(record, 'label', op),
    x: expectNumber(record, 'x', op),
    y: expectNumber(record, 'y', op),
    color: expectString(record, 'color', op),
  }
}

/** Validate one helper action outcome. */
function expectActionOutcome(value: unknown, op: string): ActionOutcome {
  const record = expectRecordValue(value, op)
  const delivered = expectString(record, 'delivered', op)
  if (delivered !== 'uia' && delivered !== 'posted' && delivered !== 'none') {
    throw new DshClickError(`helper "${op}" returned an unknown delivered mechanism`, 'BAD_HELPER_RESPONSE')
  }
  const restored = record['restored']
  if (restored !== undefined && typeof restored !== 'boolean') {
    throw new DshClickError(`helper "${op}" returned a non-boolean restored flag`, 'BAD_HELPER_RESPONSE')
  }
  const detail = record['detail']
  if (detail !== undefined && typeof detail !== 'string') {
    throw new DshClickError(`helper "${op}" returned a non-string detail`, 'BAD_HELPER_RESPONSE')
  }
  return {
    windowId: expectNumber(record, 'windowId', op),
    action: expectString(record, 'action', op),
    delivered,
    processBefore: expectProcessFacts(record['processBefore'], op),
    processAfter: expectProcessFacts(record['processAfter'], op),
    ...restored !== undefined ? { restored } : {},
    ...detail !== undefined ? { detail } : {},
  }
}

/** The Windows helper backend over `ctx.subprocess`. */
export class HelperBackend implements DesktopBackend {
  /** Resolved powershell executable path, cached across calls. */
  private powershell: Promise<string> | undefined

  readonly available = true

  /** @param config - resolved limits for timeout and output size. */
  /** @param subprocess - the subprocess service that runs the helper. */
  constructor(
    private readonly config: ResolvedConfig,
    private readonly subprocess: SubprocessRuntime,
  ) {}

  readonly platform = 'win32'

  /** Run one helper operation and return its validated result payload. */
  private async invoke(op: string, args: Record<string, unknown>, signal?: AbortSignal): Promise<unknown> {
    const request: HelperRequest = {
      protocol: HELPER_PROTOCOL_VERSION,
      pluginVersion: VERSION,
      requestId: randomUUID(),
      op,
      args,
    }
    const helperPath = findHelperPath()
    const executable = await this.resolvePowershell()
    const deadline = AbortSignal.timeout(this.config.helperTimeoutMs)
    const fused = signal === undefined ? deadline : AbortSignal.any([signal, deadline])
    const handle = this.subprocess.spawn({
      argv: [executable, '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', helperPath],
      cwd: process.cwd(),
      stdio: {
        stdin: { data: JSON.stringify(request) },
        stdout: { maxBytes: this.config.maxHelperOutputBytes },
        stderr: { maxBytes: 64 * 1024 },
      },
      graceMs: 5_000,
      signal: fused,
    })
    const outcome = await handle.done
    const stdoutText = handle.collected.stdout?.readFrom(0).text ?? ''
    const stderrText = handle.collected.stderr?.readFrom(0).text ?? ''
    if (outcome.exitCode !== 0) {
      const tail = stderrText.trim().split(/\r?\n/u).slice(-3).join(' | ')
      throw new DshClickError(
        `helper "${op}" failed (exit ${outcome.exitCode}${tail === '' ? '' : `: ${tail}`})`,
        'HELPER_FAILED',
      )
    }
    let response: HelperResponse
    try {
      response = JSON.parse(stdoutText) as HelperResponse
    } catch {
      const hint = stdoutText.length === 0 ? 'no stdout' : 'malformed JSON on stdout'
      throw new DshClickError(`helper "${op}" produced ${hint}`, 'BAD_HELPER_RESPONSE')
    }
    if (typeof response !== 'object' || response === null || typeof response.ok !== 'boolean') {
      throw new DshClickError(`helper "${op}" returned a malformed response envelope`, 'BAD_HELPER_RESPONSE')
    }
    if (!response.ok) {
      const error = response.error
      if (typeof error !== 'object' || error === null
        || typeof error.code !== 'string' || typeof error.message !== 'string') {
        throw new DshClickError(`helper "${op}" returned a malformed error envelope`, 'BAD_HELPER_RESPONSE')
      }
      throw new DshClickError(`helper "${op}": ${error.message}`, error.code)
    }
    return response.result
  }

  /** Resolve (and cache) the powershell executable through the subprocess seam. */
  private resolvePowershell(): Promise<string> {
    this.powershell ??= this.subprocess
      .resolveExecutable('powershell.exe')
      .catch((error: unknown) => {
        this.powershell = undefined
        throw new DshClickError(
          `cannot resolve powershell.exe for the desktop helper: ${error instanceof Error ? error.message : String(error)}`,
          'HELPER_MISSING',
        )
      })
    return this.powershell
  }

  async listWindows(signal?: AbortSignal): Promise<WindowInfo[]> {
    const result = await this.invoke('windows', {}, signal)
    if (!Array.isArray(result)) throw new DshClickError('helper "windows" returned a non-array result', 'BAD_HELPER_RESPONSE')
    return result.map(item => expectWindow(item, 'windows'))
  }

  async shot(ref: WindowRef, maxSide: number, signal?: AbortSignal): Promise<Screenshot> {
    const result = await this.invoke('shot', {
      target: ref,
      maxSide,
      maxElements: this.config.maxElements,
      maxDepth: this.config.maxTreeDepth,
    }, signal)
    const record = expectRecordValue(result, 'shot')
    return {
      pngBase64: expectString(record, 'pngBase64', 'shot'),
      width: expectNumber(record, 'width', 'shot'),
      height: expectNumber(record, 'height', 'shot'),
      snapshot: expectSnapshot(record['snapshot'], 'shot'),
    }
  }

  async tree(ref: WindowRef, maxElements: number, maxDepth: number, includePixels: boolean, signal?: AbortSignal): Promise<Tree> {
    const result = await this.invoke('tree', { target: ref, maxElements, maxDepth, includePixels }, signal)
    const record = expectRecordValue(result, 'tree')
    const elements = record['elements']
    const pixels = record['pixels']
    if (!Array.isArray(elements) || !Array.isArray(pixels)) {
      throw new DshClickError('helper "tree" returned malformed elements/pixels arrays', 'BAD_HELPER_RESPONSE')
    }
    return {
      snapshot: expectSnapshot(record['snapshot'], 'tree'),
      elements: elements.map(item => expectElement(item, 'tree')),
      pixels: pixels.map(item => expectPixel(item, 'tree')),
    }
  }

  async snapshot(windowId: number, signal?: AbortSignal): Promise<WindowSnapshot> {
    const result = await this.invoke('snapshot', {
      windowId,
      maxElements: this.config.maxElements,
      maxDepth: this.config.maxTreeDepth,
    }, signal)
    return expectSnapshot(result, 'snapshot')
  }

  async click(request: ClickRequest, focusFallback: boolean, signal?: AbortSignal): Promise<ActionOutcome> {
    const result = await this.invoke('click', { request, focusFallback }, signal)
    return expectActionOutcome(result, 'click')
  }

  async type(request: TypeRequest, focusFallback: boolean, signal?: AbortSignal): Promise<ActionOutcome> {
    const result = await this.invoke('type', { request, focusFallback }, signal)
    return expectActionOutcome(result, 'type')
  }

  async scroll(request: ScrollRequest, focusFallback: boolean, signal?: AbortSignal): Promise<ActionOutcome> {
    const result = await this.invoke('scroll', { request, focusFallback }, signal)
    return expectActionOutcome(result, 'scroll')
  }

  async key(request: KeyRequest, focusFallback: boolean, signal?: AbortSignal): Promise<ActionOutcome> {
    const result = await this.invoke('key', { request, focusFallback }, signal)
    return expectActionOutcome(result, 'key')
  }

  async apps(signal?: AbortSignal): Promise<AppInfo[]> {
    const result = await this.invoke('apps', {}, signal)
    if (!Array.isArray(result)) throw new DshClickError('helper "apps" returned a non-array result', 'BAD_HELPER_RESPONSE')
    return result.map((item) => {
      const record = expectRecordValue(item, 'apps')
      const windows = record['windows']
      if (!Array.isArray(windows)) throw new DshClickError('helper "apps" returned malformed windows', 'BAD_HELPER_RESPONSE')
      const executablePath = record['executablePath']
      if (executablePath !== null && typeof executablePath !== 'string') {
        throw new DshClickError('helper "apps" returned malformed executablePath', 'BAD_HELPER_RESPONSE')
      }
      return {
        processId: expectNumber(record, 'processId', 'apps'),
        name: expectString(record, 'name', 'apps'),
        executablePath,
        windows: windows.map(windowInfo => expectWindow(windowInfo, 'apps')),
      }
    })
  }

  async launch(name: string, args: readonly string[], signal?: AbortSignal): Promise<LaunchOutcome> {
    const result = await this.invoke('launch', { name, args }, signal)
    const record = expectRecordValue(result, 'launch')
    const executablePath = record['executablePath']
    if (executablePath !== null && typeof executablePath !== 'string') {
      throw new DshClickError('helper "launch" returned malformed executablePath', 'BAD_HELPER_RESPONSE')
    }
    return {
      processId: expectNumber(record, 'processId', 'launch'),
      executablePath,
    }
  }
}
