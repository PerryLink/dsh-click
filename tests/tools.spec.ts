/**
 * The tool surface through the REAL tool pipeline: registration, schema
 * validation, canonical output values, render content, vision routing for
 * `screen_shot`, and the observation audit events.
 *
 * @module dsh-click/test/tools.spec
 */

import { CallId } from '@deepseek-ai/dsh-llm'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import type { ToolExecutionResult } from '@deepseek-ai/dsh-tools'
import { describe, expect, it } from 'vitest'
import { FakeDesktopBackend, makeSnapshot, mountHarness, type Harness } from './harness.ts'
import { UnavailableBackend } from '../src/platform/selection.ts'
import type { Screenshot, Tree } from '../src/platform/types.ts'

let callCounter = 0

async function callTool(harness: Harness, name: string, args: unknown): Promise<ToolExecutionResult> {
  callCounter += 1
  return harness.ctx.tools.execute({
    callId: CallId(`tools-spec-${callCounter}`),
    name,
    arguments: args,
    agent: harness.agent,
    signal: new AbortController().signal,
  })
}

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

function shotFixture(): Screenshot {
  return {
    pngBase64: Buffer.from('fake-png-bytes').toString('base64'),
    width: 800,
    height: 600,
    snapshot: makeSnapshot(),
  }
}

const TOOL_NAMES = ['screen_shot', 'screen_read', 'click', 'type', 'scroll', 'key', 'app_list', 'app_launch']

describe('registration', () => {
  it('registers all eight tools', async () => {
    const harness = await mountHarness()
    for (const name of TOOL_NAMES) {
      expect(harness.ctx.tools.get(name)).toBeDefined()
    }
  })
})

describe('schema validation through the real registry', () => {
  it('rejects click without basedOn', async () => {
    const harness = await mountHarness({ approval: 'grant' })
    const result = await callTool(harness, 'click', { target: { x: 1, y: 1 } })
    expect(result.isError).toBe(true)
  })

  it('rejects click addressing both an element and coordinates', async () => {
    const harness = await mountHarness({ approval: 'grant', config: { requireApproval: false } })
    const result = await callTool(harness, 'click', {
      basedOn: { observationId: 'x', windowId: 1 },
      target: { elementId: '42.100', x: 1, y: 1 },
    })
    expect(result.isError).toBe(true)
    if (result.isError) expect(result.error.message).toContain('exactly one')
  })

  it('rejects oversize type text', async () => {
    const harness = await mountHarness({ approval: 'grant' })
    const result = await callTool(harness, 'type', {
      basedOn: { observationId: 'x', windowId: 1 },
      elementId: '42.100',
      text: 'a'.repeat(10_001),
    })
    expect(result.isError).toBe(true)
    if (result.isError) expect(result.error.message).toContain('10000')
  })
})

describe('screen_read', () => {
  it('returns sanitized structured output and audits the observation', async () => {
    const harness = await mountHarness()
    const backend = harness.backend as FakeDesktopBackend
    backend.treeResult = treeFixture()

    const result = await callTool(harness, 'screen_read', {})
    expect(result.isError).toBe(false)
    if (result.isError) return
    const value = result.value as { ok: boolean; observationId: string; elements: Array<{ name: string }>; pixels: Array<{ color: string }> }
    expect(value.ok).toBe(true)
    expect(value.observationId).toMatch(/^[0-9a-f]{32}$/u)
    expect(value.elements[0]?.name).toBe('SaveDirty')
    expect(value.pixels[0]?.color).toBe('rgb(1, 2, 3)')

    const observed = harness.session.events.filter(event => event.type === 'dsh-click/observed').at(-1)
    expect(observed?.data).toMatchObject({ observationId: value.observationId, windowTitle: 'Demo App', elementCount: 1 })

    const text = result.content.filter((block: ContentBlock) => block.type === 'text').map(block => (block as { text: string }).text).join('\n')
    expect(text).toContain('42.100')
    expect(text).toContain('observationId')
  })
})

describe('screen_shot vision routing', () => {
  it('attaches an image when the model accepts images and renders an image block', async () => {
    const harness = await mountHarness({ attachments: true, vision: true })
    const backend = harness.backend as FakeDesktopBackend
    backend.shotResult = shotFixture()

    const result = await callTool(harness, 'screen_shot', {})
    expect(result.isError).toBe(false)
    if (result.isError) return
    const value = result.value as { image?: { attachmentId: string }; description: string }
    expect(value.image?.attachmentId).toMatch(/^att-/u)
    expect(result.content.some((block: ContentBlock) => block.type === 'image')).toBe(true)
  })

  it('falls back to a text description without vision support', async () => {
    const harness = await mountHarness({ attachments: true })
    const backend = harness.backend as FakeDesktopBackend
    backend.shotResult = shotFixture()

    const result = await callTool(harness, 'screen_shot', {})
    expect(result.isError).toBe(false)
    if (result.isError) return
    const value = result.value as { image?: unknown; description: string }
    expect(value.image).toBeUndefined()
    expect(value.description).toContain('screen_read')
    expect(result.content.some((block: ContentBlock) => block.type === 'image')).toBe(false)
  })

  it('forces text mode when imageMode is "text"', async () => {
    const harness = await mountHarness({ attachments: true, vision: true, config: { imageMode: 'text' } })
    const backend = harness.backend as FakeDesktopBackend
    backend.shotResult = shotFixture()

    const result = await callTool(harness, 'screen_shot', {})
    expect(result.isError).toBe(false)
    if (result.isError) return
    expect((result.value as { image?: unknown }).image).toBeUndefined()
  })
})

describe('app_list', () => {
  it('returns the app inventory and renders it', async () => {
    const harness = await mountHarness()
    const backend = harness.backend as FakeDesktopBackend
    backend.appsResult = [{
      processId: 4242,
      name: 'Demo',
      executablePath: 'C:\\Apps\\demo.exe',
      windows: [{
        windowId: 0x00112233,
        processId: 4242,
        title: 'Demo App',
        className: 'DemoClass',
        rect: { x: 10, y: 20, width: 800, height: 600 },
        executablePath: 'C:\\Apps\\demo.exe',
        visible: true,
      }],
    }]

    const result = await callTool(harness, 'app_list', {})
    expect(result.isError).toBe(false)
    if (result.isError) return
    expect((result.value as { apps: unknown[] }).apps).toHaveLength(1)
    expect(result.content.filter((block: ContentBlock) => block.type === 'text').map(block => (block as { text: string }).text).join('\n')).toContain('windowId')
  })
})

describe('unavailable backend', () => {
  it('fails closed with a model-readable reason on every tool', async () => {
    const harness = await mountHarness({ backend: new UnavailableBackend('linux', 'reserved but not implemented') })
    const MINIMAL_ARGS: Record<string, unknown> = {
      screen_shot: {},
      screen_read: {},
      click: { basedOn: { observationId: 'x', windowId: 1 }, target: { x: 0, y: 0 } },
      type: { basedOn: { observationId: 'x', windowId: 1 }, elementId: 'e', text: 't' },
      scroll: { basedOn: { observationId: 'x', windowId: 1 }, direction: 'down' },
      key: { basedOn: { observationId: 'x', windowId: 1 }, keys: 'Enter' },
      app_list: {},
      app_launch: { name: 'notepad' },
    }
    for (const name of TOOL_NAMES) {
      const result = await callTool(harness, name, MINIMAL_ARGS[name])
      expect(result.isError).toBe(true)
      if (result.isError) expect(result.error.message).toContain('reserved but not implemented')
    }
  })
})
