/**
 * Shared test harness: REAL Cordis `Context`, REAL `SessionStore`/`Session`,
 * REAL `ToolRuntime`, REAL `ApprovalService` from the 0.1.0-rc.6 peers — plus
 * an in-memory desktop backend, an in-memory subprocess provider (a subclass
 * of the REAL `SubprocessRuntime`), a fake attachment store, and a
 * structurally complete fake agent (the harness driver class, not a service).
 * The OS-facing desktop work is scripted data; the plugin contract, tool
 * pipeline, approval gate, and session audit run for real.
 *
 * @module dsh-click/test/harness
 */

import { Context, type Fiber } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { AttachmentStore, AttachmentId, type ImageAttachmentRef, type SaveImageAttachment } from '@deepseek-ai/dsh-attachment'
import SessionStore, { SessionId, type Session } from '@deepseek-ai/dsh-session'
import {
  SubprocessRuntime,
  type SubprocessCollectedOutputs,
  type SubprocessHandle,
  type SubprocessOutcome,
  type SubprocessOutputReader,
  type SubprocessSpawnSpec,
} from '@deepseek-ai/dsh-subprocess'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import ApprovalService from '@deepseek-ai/dsh-user-approval'
import {
  DshClickError,
  type ActionOutcome,
  type AppInfo,
  type ClickRequest,
  type DesktopBackend,
  type KeyRequest,
  type LaunchOutcome,
  type Screenshot,
  type ScrollRequest,
  type Tree,
  type WindowInfo,
  type WindowRef,
  type WindowSnapshot,
  type TypeRequest,
} from '../src/platform/types.ts'

/** The default snapshot every fake backend script starts from. */
export function makeSnapshot(overrides: Partial<WindowSnapshot> = {}): WindowSnapshot {
  return {
    windowId: 0x00112233,
    processId: 4242,
    executablePath: 'C:\\Apps\\demo.exe',
    title: 'Demo App',
    className: 'DemoClass',
    rect: { x: 10, y: 20, width: 800, height: 600 },
    foreground: false,
    treeHash: 'tree-hash-1',
    shotHash: 'shot-hash-1',
    elementCount: 3,
    ...overrides,
  }
}

/** The default action outcome fake backends script. */
export function makeOutcome(overrides: Partial<ActionOutcome> = {}): ActionOutcome {
  return {
    windowId: 0x00112233,
    action: 'click',
    delivered: 'uia',
    processBefore: { pid: 4242, executablePath: 'C:\\Apps\\demo.exe' },
    processAfter: { pid: 4242, executablePath: 'C:\\Apps\\demo.exe' },
    ...overrides,
  }
}

/** An in-memory desktop backend whose every call is scripted. */
export class FakeDesktopBackend implements DesktopBackend {
  readonly platform = 'win32'
  readonly available = true

  /** Scripted per-call results; errors thrown verbatim. */
  windows: WindowInfo[] | Error = []
  shotResult: Screenshot | Error = new DshClickError('not scripted', 'TEST')
  treeResult: Tree | Error = new DshClickError('not scripted', 'TEST')
  snapshotResult: WindowSnapshot | Error = makeSnapshot()
  clickResult: ActionOutcome | Error = makeOutcome()
  typeResult: ActionOutcome | Error = makeOutcome({ action: 'type' })
  scrollResult: ActionOutcome | Error = makeOutcome({ action: 'scroll' })
  keyResult: ActionOutcome | Error = makeOutcome({ action: 'key' })
  appsResult: AppInfo[] | Error = []
  launchResult: LaunchOutcome | Error = { processId: 9001, executablePath: 'C:\\Apps\\new.exe' }

  /** Recorded call shapes, for assertions. */
  calls: string[] = []

  async listWindows(): Promise<WindowInfo[]> {
    this.calls.push('windows')
    if (this.windows instanceof Error) throw this.windows
    return this.windows
  }

  async shot(_ref: WindowRef): Promise<Screenshot> {
    this.calls.push('shot')
    if (this.shotResult instanceof Error) throw this.shotResult
    return this.shotResult
  }

  async tree(_ref: WindowRef): Promise<Tree> {
    this.calls.push('tree')
    if (this.treeResult instanceof Error) throw this.treeResult
    return this.treeResult
  }

  async snapshot(): Promise<WindowSnapshot> {
    this.calls.push('snapshot')
    if (this.snapshotResult instanceof Error) throw this.snapshotResult
    return this.snapshotResult
  }

  async click(_request: ClickRequest): Promise<ActionOutcome> {
    this.calls.push('click')
    if (this.clickResult instanceof Error) throw this.clickResult
    return this.clickResult
  }

  async type(_request: TypeRequest): Promise<ActionOutcome> {
    this.calls.push('type')
    if (this.typeResult instanceof Error) throw this.typeResult
    return this.typeResult
  }

  async scroll(_request: ScrollRequest): Promise<ActionOutcome> {
    this.calls.push('scroll')
    if (this.scrollResult instanceof Error) throw this.scrollResult
    return this.scrollResult
  }

  async key(_request: KeyRequest): Promise<ActionOutcome> {
    this.calls.push('key')
    if (this.keyResult instanceof Error) throw this.keyResult
    return this.keyResult
  }

  async apps(): Promise<AppInfo[]> {
    this.calls.push('apps')
    if (this.appsResult instanceof Error) throw this.appsResult
    return this.appsResult
  }

  async launch(): Promise<LaunchOutcome> {
    this.calls.push('launch')
    if (this.launchResult instanceof Error) throw this.launchResult
    return this.launchResult
  }
}

/** A subprocess provider whose spawns answer from scripted stdout/exit facts. */
export class FakeSubprocessRuntime extends SubprocessRuntime {
  /** Scripted stdout text for the next spawn. */
  nextStdout = ''
  /** Scripted exit code for the next spawn. */
  nextExitCode = 0
  /** Scripted stderr text for the next spawn. */
  nextStderr = ''
  /** Every spawn spec recorded. */
  spawns: SubprocessSpawnSpec[] = []

  constructor(ctx: Context) {
    super(ctx)
  }

  resolveExecutable(command: string): Promise<string> {
    return Promise.resolve(`C:\\Windows\\System32\\${command}`)
  }

  spawn(spec: SubprocessSpawnSpec): SubprocessHandle {
    this.spawns.push(spec)
    const stdout = this.nextStdout
    const stderr = this.nextStderr
    const exitCode = this.nextExitCode
    const readerOf = (text: string): SubprocessOutputReader => ({
      readFrom: fromByte => ({ text: text.slice(fromByte), nextOffset: text.length, lossy: false }),
    })
    const collected: SubprocessCollectedOutputs = {
      stdout: readerOf(stdout),
      stderr: readerOf(stderr),
    }
    const outcome: SubprocessOutcome = { exitCode, signal: null }
    return {
      pid: 7777,
      stdin: undefined,
      stdout: undefined,
      stderr: undefined,
      collected,
      done: Promise.resolve(outcome),
      terminate: () => undefined,
      waitForExit: async () => true,
    }
  }

  spawnTerminal(): never {
    throw new Error('not used by tests')
  }
}

/** An attachment store that keeps saved images in memory. */
export class FakeAttachmentStore extends AttachmentStore {
  readonly imageLimits = {
    maxImageBytes: 30 * 1024 * 1024,
    maxImagesPerMessage: 10,
    maxMessageImageBytes: 100 * 1024 * 1024,
    maxImagePixels: 100_000_000,
    maxImageDimension: 2000,
    mediaTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const,
  }

  saved: SaveImageAttachment[] = []

  constructor(ctx: Context) {
    super(ctx)
  }

  validateImage(input: SaveImageAttachment): Promise<void> {
    if (!this.imageLimits.mediaTypes.includes(input.mediaType)) return Promise.reject(new Error('unsupported media type'))
    return Promise.resolve()
  }

  async saveImage(input: SaveImageAttachment): Promise<ImageAttachmentRef> {
    await this.validateImage(input)
    this.saved.push(input)
    return {
      attachmentId: AttachmentId(`att-${this.saved.length}`),
      mediaType: input.mediaType,
      bytes: input.data.byteLength,
      width: 640,
      height: 480,
      ...input.name !== undefined ? { name: input.name } : {},
    }
  }

  readImage(): never {
    throw new Error('not used by tests')
  }
}

/** Build a structurally complete fake agent over a real session. */
export function makeAgent(session: Session, options: { provider?: string; model?: string } = {}): Agent {
  const fake = {
    id: session.id,
    options,
    session,
    inbox: {},
    status: 'idle',
    ctx: new Context(),
    cancel: () => undefined,
    whenIdle: async () => undefined,
    runMaintenance: async (task: (signal: AbortSignal) => Promise<unknown>) => task(new AbortController().signal),
    send: () => undefined,
    followup: () => undefined,
    steer: () => undefined,
    inject: () => undefined,
  }
  return fake as unknown as Agent
}

/** How the approval answerer behaves in the harness. */
export type ApprovalPolicy = 'grant' | 'deny' | 'unavailable' | 'absent'

/** Harness assembly options. */
export interface HarnessOptions {
  /** Raw plugin config. */
  config?: Record<string, unknown>
  /** Scripted desktop backend (defaults to the in-memory fake). */
  backend?: DesktopBackend
  /** Approval answerer policy. */
  approval?: ApprovalPolicy
  /** Mount the fake attachment store. */
  attachments?: boolean
  /** Fake llm service: whether the current model accepts images. */
  vision?: boolean
  /** Skip mounting the subprocess provider. */
  noSubprocess?: boolean
}

/** Everything a mounted harness hands back to a test. */
export interface Harness {
  readonly ctx: Context
  readonly session: Session
  readonly agent: Agent
  readonly backend: DesktopBackend
  readonly subprocess: FakeSubprocessRuntime
  /** The fiber this plugin was mounted under; dispose it to prove HMR safety. */
  readonly pluginFiber: Fiber
}

/**
 * Mount real session/tools/approval services, a fake desktop backend, a fake
 * subprocess provider, and this plugin; open one turn so approval asks work.
 *
 * @param options - assembly options.
 * @returns the mounted harness.
 */
export async function mountHarness(options: HarnessOptions = {}): Promise<Harness> {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  const session = ctx.sessions.create(SessionId('dsh-click-harness'))
  session.append('turn/start', { turn: 1 })
  ctx.provide('systemPrompt', { tools: () => () => undefined, section: () => () => undefined } as never)
  await ctx.plugin(ToolRuntime)
  const backend = options.backend ?? new FakeDesktopBackend()

  if (options.approval !== 'absent') {
    await ctx.plugin(ApprovalService)
    const policy = options.approval ?? 'unavailable'
    ctx.on('approval/request', () => {
      if (policy === 'grant') return Promise.resolve('allowed-once' as const)
      if (policy === 'deny') return Promise.resolve('rejected' as const)
      throw new Error('no answerer')
    })
  }

  if (options.noSubprocess !== true) {
    // `SubprocessRuntime` is a Cordis Service: constructing it self-registers
    // 'subprocess' on `ctx` — providing it again would double-register.
    new FakeSubprocessRuntime(ctx)
  }
  // The plugin reads its backend from this optional seam first, so the
  // scripted desktop backend (or the unavailable stub) is what tools drive —
  // the platform-selection path is covered separately by platform.spec.
  ctx.provide('dsh-click/backend', backend)
  if (options.attachments === true) {
    await ctx.plugin(FakeAttachmentStore)
  }
  if (options.vision === true) {
    ctx.provide('llm', {
      resolveModelInfo: async (provider: string, model: string) => ({
        provider,
        id: model,
        name: model,
        inputModalities: ['text', 'image'],
      }),
    } as never)
  }

  const plugin = await import('../src/index.ts')
  const pluginFiber = await ctx.plugin(plugin as unknown as import('@deepseek-ai/cordis').Plugin, options.config ?? {})

  const subprocess = ctx.get('subprocess') as unknown as FakeSubprocessRuntime
  const agent = makeAgent(session, { provider: 'deepseek', model: 'demo-model' })
  return { ctx, session, agent, backend, subprocess, pluginFiber }
}

/** Re-exported for specs that assemble backend scripts directly. */
export { DshClickError }
