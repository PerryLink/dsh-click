/**
 * `dsh-click` — cross-platform native desktop control for DeepSeek Harness
 * (Windows first, macOS/Linux backends reserved).
 *
 * Host-only function plugin — no default export (the Loader unwraps
 * `exports.default ?? exports`). It registers eight tools behind one shared
 * safety boundary: observations are structured text (accessibility tree +
 * pixel hints) so text-only models work, mutating actions must cite a fresh
 * observation and pass approval (or the configured window allowlist), the
 * native helper never steals foreground focus, and every action verifies the
 * target process identity before and after.
 *
 * @module dsh-click
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-user-approval'
import { ActionExecutor } from './actions.ts'
import { Config, resolveConfig } from './config.ts'
import { ObservationStore } from './observe.ts'
import { createBackend } from './platform/selection.ts'
import type { DesktopBackend } from './platform/types.ts'
import { allTools, type ToolServices } from './tools.ts'

export const name = 'dsh-click'

/** Hard services: the tool registry every contribution lands in. */
export const inject = ['tools']

export { Config, resolveConfig } from './config.ts'
export { VERSION, HELPER_PROTOCOL_VERSION } from './version.ts'
export { DshClickError } from './platform/types.ts'
export { ObservationStore, observationIdOf, type ObservationRecord, type FreshnessVerdict } from './observe.ts'
export { ActionExecutor, type ActionExecutorDeps, type ApprovalKind } from './actions.ts'
export { createBackend, UnavailableBackend } from './platform/selection.ts'
export { HelperBackend } from './platform/runner.ts'
export { allTools, type ToolServices } from './tools.ts'
export { OBSERVED_EVENT, ACTION_EVENT, type ObservedEvent, type ActionEvent, type ProcessFacts } from './events.ts'
export { sanitizeText, sanitizePath, redactSensitive, sanitizeVisible } from './sanitize.ts'

/**
 * Mount the plugin: resolve config, select the platform backend, and register
 * every tool through `ctx.tools.register` (each registration is an effect
 * whose disposer removes exactly that tool on stop/HMR).
 *
 * @param ctx - context carrying the tools registry.
 * @param config - raw loader config; defaults applied through {@link resolveConfig}.
 */
export function apply(ctx: Context, config: Config): void {
  const resolved = resolveConfig(config)
  // Optional test seam: an embedding context may pre-select the backend under
  // 'dsh-click/backend'; real deployments fall through to platform selection.
  const backend = (ctx.get('dsh-click/backend') as DesktopBackend | undefined) ?? createBackend(ctx, resolved)
  const observations = new ObservationStore(resolved)
  const actions = new ActionExecutor({ ctx, config: resolved, backend, observations })
  const services: ToolServices = { ctx, config: resolved, backend, observations, actions }

  for (const tool of allTools(services)) {
    ctx.effect(() => ctx.tools.register(tool), `dsh-click: ${tool.name} tool`)
  }
}
