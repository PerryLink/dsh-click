/**
 * Vision routing: whether the calling agent's model accepts image input.
 * `screen_shot` uses this in `imageMode: 'auto'` to decide between an image
 * block (vision model) and a text description (text-only model). Every
 * failure — no agent, no llm service, no provider/model on the agent, adapter
 * errors — resolves to `false`, so the text fallback is the fail-closed
 * default.
 *
 * @module dsh-click/vision
 */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { LlmRuntime } from '@deepseek-ai/dsh-llm'

/**
 * Resolve whether the calling agent's current model declares image input.
 *
 * @param agent - the calling agent (may be undefined).
 * @param ctx - the mounting context.
 * @param signal - cancellation for the model-info lookup.
 * @returns true only when the resolved model declares the `image` modality.
 */
export async function sessionAcceptsImages(agent: Agent | undefined, ctx: Context, signal?: AbortSignal): Promise<boolean> {
  if (agent === undefined) return false
  const provider = agent.options.provider
  const model = agent.options.model
  if (provider === undefined || model === undefined) return false
  const llm = ctx.get('llm') as LlmRuntime | undefined
  if (llm === undefined) return false
  try {
    const info = await llm.resolveModelInfo(provider, model, signal)
    return info.inputModalities?.includes('image') ?? false
  } catch {
    return false
  }
}
