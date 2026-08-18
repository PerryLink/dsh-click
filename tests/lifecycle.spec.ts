/**
 * Lifecycle and export-contract suite: the HMR-safety test (dispose the
 * contributing fiber, re-query the authoritative tool registry), the
 * default-export guard (module namespace + Loader unwrap round-trip), and the
 * tool three-interface assertion (model schema + canonical value + content
 * blocks) through the real ToolRuntime.
 * @module dsh-click/test/lifecycle.spec
 */

import Loader from '@deepseek-ai/cordis-plugin-loader'
import { CallId } from '@deepseek-ai/dsh-llm'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import { describe, expect, it } from 'vitest'
import * as plugin from '../src/index.ts'
import { FakeDesktopBackend, makeSnapshot, mountHarness } from './harness.ts'
import type { Tree } from '../src/platform/types.ts'

const TOOL_NAMES = ['screen_shot', 'screen_read', 'click', 'type', 'scroll', 'key', 'app_list', 'app_launch']

function treeFixture(): Tree {
  return {
    snapshot: makeSnapshot(),
    elements: [{
      elementId: '42.100',
      controlType: 'Button',
      name: 'Save\u0000Dirty',
      automationId: 'saveBtn',
      rect: { x: 60, y: 60, width: 80, height: 24 },
      enabled: true,
      patterns: ['invoke'],
    }],
    pixels: [{ label: 'Save', x: 100, y: 72, color: 'rgb(1, 2, 3)' }],
  }
}

// ---------------------------------------------------------------------------
// C2: the function-plugin namespace must survive Loader unwrapping
// ---------------------------------------------------------------------------

describe('export contract', () => {
  it('carries no default export and Loader unwrap round-trips the namespace', () => {
    expect('default' in plugin).toBe(false)
    const loader = Object.create(Loader.prototype)
    const unwrapped = loader.unwrapExports(plugin)
    expect(unwrapped).toBe(plugin)
    expect(unwrapped.name).toBe('dsh-click')
    expect(unwrapped.inject).toEqual(['tools'])
    expect(unwrapped.Config).not.toBeUndefined()
    expect(typeof unwrapped.apply).toBe('function')
  })
})

// ---------------------------------------------------------------------------
// C1: disposing the contributing fiber removes every registry contribution
// ---------------------------------------------------------------------------

describe('fiber disposal', () => {
  it('removes all eight tools when the contributing fiber is disposed', async () => {
    const harness = await mountHarness()
    try {
      for (const name of TOOL_NAMES) {
        expect(harness.ctx.tools.get(name)).toBeDefined()
      }
      await harness.pluginFiber.dispose()
      for (const name of TOOL_NAMES) {
        expect(harness.ctx.tools.get(name)).toBeUndefined()
      }
    } finally {
      await harness.ctx.fiber.dispose()
    }
  })
})

// ---------------------------------------------------------------------------
// U2: the tool three interfaces in one assertion through the real runtime
// ---------------------------------------------------------------------------

describe('tool three interfaces', () => {
  it('keeps the screen_read schema, canonical value, and content blocks stable', async () => {
    const harness = await mountHarness()
    try {
      const backend = harness.backend as FakeDesktopBackend
      backend.treeResult = treeFixture()

      // Model-visible schema.
      const schema = harness.ctx.tools.schemas().find(entry => entry.name === 'screen_read')
      expect(schema).toBeDefined()
      expect(schema?.parameters).toEqual(expect.objectContaining({
        type: 'object',
        properties: expect.objectContaining({
          target: expect.objectContaining({ type: 'object' }),
          includePixels: expect.objectContaining({ type: 'boolean' }),
        }),
      }))

      const result = await harness.ctx.tools.execute({
        callId: CallId('dsh-click-three-interfaces'),
        name: 'screen_read',
        arguments: {},
        agent: harness.agent,
        signal: new AbortController().signal,
      })
      expect(result.isError).toBe(false)
      if (result.isError) return

      // Canonical value.
      const value = result.value as {
        ok: boolean
        observationId: string
        window: { windowId: number; title: string }
        elements: Array<{ elementId: string; controlType: string; name: string }>
        pixels: Array<{ label: string; x: number; y: number; color: string }>
      }
      expect(value.ok).toBe(true)
      expect(value.observationId).toMatch(/^[0-9a-f]{32}$/u)
      expect(value.window.windowId).toBe(0x00112233)
      expect(value.window.title).toBe('Demo App')
      expect(value.elements[0]).toMatchObject({ elementId: '42.100', controlType: 'Button', name: 'SaveDirty' })
      expect(value.pixels[0]).toMatchObject({ label: 'Save', x: 100, y: 72, color: 'rgb(1, 2, 3)' })

      // Model-facing content blocks.
      expect(Array.isArray(result.content)).toBe(true)
      const text = result.content
        .filter((block: ContentBlock) => block.type === 'text')
        .map(block => (block as { text: string }).text)
        .join('\n')
      expect(text).toContain('42.100')
      expect(text).toContain('observationId')
    } finally {
      await harness.ctx.fiber.dispose()
    }
  })
})
