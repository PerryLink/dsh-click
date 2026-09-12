/**
 * Backend selection: which {@link DesktopBackend} serves this deployment.
 * Selection never fails at load — an unsupported platform or a missing
 * subprocess service yields an unavailable backend whose every call fails
 * closed with a model-readable reason, so profiles keep booting everywhere
 * and actions refuse loudly instead of silently doing nothing.
 *
 * @module dsh-click/platform/selection
 */

import type { Context } from '@deepseek-ai/cordis'
import type { SubprocessRuntime } from '@deepseek-ai/dsh-subprocess'
import type { ResolvedConfig } from '../config.ts'
import { HelperBackend } from './runner.ts'
import {
  DshClickError,
  type ActionOutcome,
  type AppInfo,
  type DesktopBackend,
  type LaunchOutcome,
  type Screenshot,
  type Tree,
  type WindowInfo,
  type WindowSnapshot,
} from './types.ts'

/** A backend that cannot act: every operation fails closed with the given reason. */
export class UnavailableBackend implements DesktopBackend {
  /** @param platform - the platform id this stub stands in for. */
  /** @param reason - model-readable reason why the backend cannot act. */
  constructor(readonly platform: string, readonly reason: string) {}

  readonly available = false

  get unavailableReason(): string {
    return this.reason
  }

  /** Throw the shared backend-unavailable failure. */
  private refuse(): never {
    throw new DshClickError(
      `dsh-click backend unavailable on ${this.platform}: ${this.reason}`,
      'BACKEND_UNAVAILABLE',
    )
  }

  listWindows(): Promise<WindowInfo[]> { this.refuse() }
  shot(): Promise<Screenshot> { this.refuse() }
  tree(): Promise<Tree> { this.refuse() }
  snapshot(): Promise<WindowSnapshot> { this.refuse() }
  click(): Promise<ActionOutcome> { this.refuse() }
  type(): Promise<ActionOutcome> { this.refuse() }
  scroll(): Promise<ActionOutcome> { this.refuse() }
  key(): Promise<ActionOutcome> { this.refuse() }
  apps(): Promise<AppInfo[]> { this.refuse() }
  launch(): Promise<LaunchOutcome> { this.refuse() }
}

/** The reserved-but-unimplemented backends, by platform. */
const RESERVED_BACKENDS: Readonly<Record<string, string>> = {
  darwin: 'macOS backend is reserved but not implemented yet (Windows-first); only Windows can act today',
  linux: 'Linux backend is reserved but not implemented yet (Windows-first); only Windows can act today',
}

/**
 * Select the backend for this deployment. Windows needs `ctx.subprocess` to
 * run the native helper; every other platform is reserved and fails closed.
 *
 * @param ctx - the mounting context.
 * @param config - resolved plugin config (helper limits).
 * @returns the active backend (possibly unavailable).
 */
export function createBackend(ctx: Context, config: ResolvedConfig): DesktopBackend {
  if (process.platform === 'win32') {
    const subprocess = ctx.get('subprocess') as SubprocessRuntime | undefined
    if (subprocess === undefined) {
      return new UnavailableBackend('win32', 'ctx.subprocess is not mounted — required to run the native Windows helper')
    }
    return new HelperBackend(config, subprocess)
  }
  return new UnavailableBackend(process.platform, RESERVED_BACKENDS[process.platform] ?? 'unsupported platform')
}
