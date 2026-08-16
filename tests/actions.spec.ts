/**
 * The action safety boundary, exercised through the REAL tool pipeline
 * (real Context/ToolRuntime/Session/ApprovalService, scripted desktop
 * backend): approval grant/deny/allowlist/absent, unknown and stale
 * observations, process-identity changes, and the type rollback passthrough.
 *
 * @module dsh-click/test/actions.spec
 */

import { CallId } from '@deepseek-ai/dsh-llm'
import type { ToolExecutionResult } from '@deepseek-ai/dsh-tools'
import { describe, expect, it } from 'vitest'
import { makeOutcome, makeSnapshot, mountHarness, type Harness } from './harness.ts'
import type { Tree } from '../src/platform/types.ts'

let callCounter = 0

/** Dispatch one real tool call through the mounted harness. */
async function callTool(harness: Harness, name: string, args: unknown): Promise<ToolExecutionResult> {
  callCounter += 1
  return harness.ctx.tools.execute({
    callId: CallId(`actions-spec-${callCounter}`),
    name,
    arguments: args,
    agent: harness.agent,
    signal: new AbortController().signal,
  })
}

/** Seed one observation by running screen_read against the scripted tree. */
function seedTree(snapshot = makeSnapshot()): Tree {
  return {
    snapshot,
    elements: [{
      elementId: '42.100',
      controlType: 'Button',
      name: 'Save',
      automationId: 'saveBtn',
      rect: { x: 60, y: 60, width: 80, height: 24 },
      enabled: true,
      patterns: ['invoke'],
    }],
    pixels: [],
  }
}

/** Read the last action audit event of a kind from the session. */
function lastActionEvent(harness: Harness) {
  return harness.session.events.filter(event => event.type === 'dsh-click/action').at(-1)
}

describe('action approval gate', () => {
  it('grants through approval and audits the outcome', async () => {
    const harness = await mountHarness({ approval: 'grant' })
    const backend = harness.backend as import('./harness.ts').FakeDesktopBackend
    backend.treeResult = seedTree()
    backend.clickResult = makeOutcome()
    const observed = await callTool(harness, 'screen_read', {})
    expect(observed.isError).toBe(false)
    const observationId = (observed as { value: { observationId: string } }).value.observationId

    const clicked = await callTool(harness, 'click', {
      basedOn: { observationId, windowId: makeSnapshot().windowId },
      target: { elementId: '42.100' },
    })
    expect(clicked.isError).toBe(false)
    expect(backend.calls).toContain('click')
    const audit = lastActionEvent(harness)
    expect(audit?.data).toMatchObject({ tool: 'click', approved: 'approval', outcome: 'ok' })
  })

  it('denies when the answerer rejects and never reaches the backend', async () => {
    const harness = await mountHarness({ approval: 'deny' })
    const backend = harness.backend as import('./harness.ts').FakeDesktopBackend
    backend.treeResult = seedTree()
    const observed = await callTool(harness, 'screen_read', {})
    const observationId = (observed as { value: { observationId: string } }).value.observationId

    const clicked = await callTool(harness, 'click', {
      basedOn: { observationId, windowId: makeSnapshot().windowId },
      target: { elementId: '42.100' },
    })
    expect(clicked.isError).toBe(true)
    if (clicked.isError) expect(clicked.error.message).toContain('denied by approval')
    expect(backend.calls).not.toContain('click')
    expect(lastActionEvent(harness)?.data).toMatchObject({ tool: 'click', outcome: 'error' })
  })

  it('fails closed when no approval service is mounted', async () => {
    const harness = await mountHarness({ approval: 'absent' })
    const backend = harness.backend as import('./harness.ts').FakeDesktopBackend
    backend.treeResult = seedTree()
    const observed = await callTool(harness, 'screen_read', {})
    const observationId = (observed as { value: { observationId: string } }).value.observationId

    const clicked = await callTool(harness, 'click', {
      basedOn: { observationId, windowId: makeSnapshot().windowId },
      target: { elementId: '42.100' },
    })
    expect(clicked.isError).toBe(true)
    if (clicked.isError) expect(clicked.error.message).toContain('approval service is not mounted')
    expect(backend.calls).not.toContain('click')
  })

  it('skips the ask for an allowlisted window and audits allowlist', async () => {
    const harness = await mountHarness({ approval: 'unavailable', config: { autoApproveWindows: ['^Demo App$'] } })
    const backend = harness.backend as import('./harness.ts').FakeDesktopBackend
    backend.treeResult = seedTree()
    const observed = await callTool(harness, 'screen_read', {})
    const observationId = (observed as { value: { observationId: string } }).value.observationId

    const clicked = await callTool(harness, 'click', {
      basedOn: { observationId, windowId: makeSnapshot().windowId },
      target: { x: 100, y: 100 },
    })
    expect(clicked.isError).toBe(false)
    expect(backend.calls).toContain('click')
    expect(lastActionEvent(harness)?.data).toMatchObject({ approved: 'allowlist', outcome: 'ok' })
  })

  it('skips the gate entirely when requireApproval is false', async () => {
    const harness = await mountHarness({ approval: 'absent', config: { requireApproval: false } })
    const backend = harness.backend as import('./harness.ts').FakeDesktopBackend
    backend.treeResult = seedTree()
    const observed = await callTool(harness, 'screen_read', {})
    const observationId = (observed as { value: { observationId: string } }).value.observationId

    const clicked = await callTool(harness, 'click', {
      basedOn: { observationId, windowId: makeSnapshot().windowId },
      target: { x: 10, y: 10 },
    })
    expect(clicked.isError).toBe(false)
    expect(lastActionEvent(harness)?.data).toMatchObject({ approved: 'none', outcome: 'ok' })
  })
})

describe('staleness boundary', () => {
  it('refuses an unknown observation', async () => {
    const harness = await mountHarness({ approval: 'grant' })
    const clicked = await callTool(harness, 'click', {
      basedOn: { observationId: 'no-such-observation', windowId: 1 },
      target: { x: 1, y: 1 },
    })
    expect(clicked.isError).toBe(true)
    if (clicked.isError) expect(clicked.error.message).toContain('unknown observation')
  })

  it('refuses a stale window and demands re-observation', async () => {
    const harness = await mountHarness({ approval: 'grant' })
    const backend = harness.backend as import('./harness.ts').FakeDesktopBackend
    backend.treeResult = seedTree()
    const observed = await callTool(harness, 'screen_read', {})
    const observationId = (observed as { value: { observationId: string } }).value.observationId

    backend.snapshotResult = makeSnapshot({ treeHash: 'tree-hash-CHANGED' })
    const clicked = await callTool(harness, 'click', {
      basedOn: { observationId, windowId: makeSnapshot().windowId },
      target: { x: 10, y: 10 },
    })
    expect(clicked.isError).toBe(true)
    if (clicked.isError) expect(clicked.error.message).toContain('changed since observation')
    expect(backend.calls).toContain('snapshot')
    expect(backend.calls).not.toContain('click')
  })
})

describe('process identity and rollback', () => {
  it('refuses when the process identity changed during the action', async () => {
    const harness = await mountHarness({ approval: 'grant' })
    const backend = harness.backend as import('./harness.ts').FakeDesktopBackend
    backend.treeResult = seedTree()
    const observed = await callTool(harness, 'screen_read', {})
    const observationId = (observed as { value: { observationId: string } }).value.observationId

    backend.clickResult = makeOutcome({ processAfter: { pid: 9999, executablePath: 'C:\\Evil\\other.exe' } })
    const clicked = await callTool(harness, 'click', {
      basedOn: { observationId, windowId: makeSnapshot().windowId },
      target: { x: 10, y: 10 },
    })
    expect(clicked.isError).toBe(true)
    if (clicked.isError) expect(clicked.error.message).toContain('different process identity')
  })

  it('passes the type rollback flag through and audits it', async () => {
    const harness = await mountHarness({ approval: 'grant' })
    const backend = harness.backend as import('./harness.ts').FakeDesktopBackend
    backend.treeResult = seedTree()
    const observed = await callTool(harness, 'screen_read', {})
    const observationId = (observed as { value: { observationId: string } }).value.observationId

    backend.typeResult = makeOutcome({ action: 'type', restored: true })
    const typed = await callTool(harness, 'type', {
      basedOn: { observationId, windowId: makeSnapshot().windowId },
      elementId: '42.100',
      text: 'hello',
    })
    expect(typed.isError).toBe(false)
    expect((typed as { value: { restored: boolean } }).value.restored).toBe(true)
    expect(lastActionEvent(harness)?.data).toMatchObject({ tool: 'type', restored: true, outcome: 'ok' })
  })

  it('gates and launches applications through approval', async () => {
    const harness = await mountHarness({ approval: 'grant' })
    const launched = await callTool(harness, 'app_launch', { name: 'notepad' })
    expect(launched.isError).toBe(false)
    expect((launched as { value: { processId: number } }).value.processId).toBe(9001)
    expect(lastActionEvent(harness)?.data).toMatchObject({ tool: 'app_launch', approved: 'approval', outcome: 'ok' })
  })
})
