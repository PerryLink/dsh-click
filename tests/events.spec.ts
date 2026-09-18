/**
 * The adaptive audit gate: plain append on known-type hosts, marked append on
 * `ignorable`-envelope hosts, and a silent skip on envelope-less hosts
 * (0.1.0-rc.6/rc.8, 0.1.1-rc.2, 0.1.2-alpha.1).
 * @module dsh-click/test/events.spec
 */

import { describe, expect, it } from 'vitest'
import { KNOWN_SESSION_EVENT_TYPES, type Session } from '@deepseek-ai/dsh-session'
import { appendAuditEvent, OBSERVED_EVENT, type ObservedEvent } from '../src/events.ts'

const payload: ObservedEvent = {
  observationId: 'obs-1',
  windowId: 1,
  processId: 100,
  executablePath: 'C:\\App\\app.exe',
  windowTitle: 'Demo',
  elementCount: 1,
}

describe('appendAuditEvent', () => {
  it('appends plainly when the host knows the vocabulary', () => {
    ;(KNOWN_SESSION_EVENT_TYPES as Set<string>).add(OBSERVED_EVENT)
    try {
      const calls: unknown[][] = []
      const append = function (type: string, data: unknown) {
        calls.push([type, data])
        return {}
      }
      appendAuditEvent({ append } as unknown as Session, OBSERVED_EVENT, payload)
      expect(calls).toEqual([[OBSERVED_EVENT, payload]])
    } finally {
      ;(KNOWN_SESSION_EVENT_TYPES as Set<string>).delete(OBSERVED_EVENT)
    }
  })

  it('never appends on an unknown-type host, even with an ignorable-shaped body, and reports the skip', () => {
    // The source-text probe was removed (P0-4): `Session.append` cannot stamp
    // an `ignorable` marker on a non-surface type, and an unmarked unknown
    // event breaks 0.1.5+ readers, so the gate only ever appends when the
    // host's vocabulary covers the type.
    const calls: unknown[][] = []
    const append = function (type: string, data: unknown, options?: unknown) {
      const ignorable = (options as { ignorable?: boolean } | undefined)?.ignorable
      void ignorable
      calls.push(options === undefined ? [type, data] : [type, data, options])
      return { ignorable: ignorable === true }
    }
    const outcome = appendAuditEvent({ append } as unknown as Session, OBSERVED_EVENT, payload)
    expect(outcome).toBe('skipped-unknown-host')
    expect(calls).toHaveLength(0)
  })

  it('reports the append on a host whose vocabulary covers the type', () => {
    ;(KNOWN_SESSION_EVENT_TYPES as Set<string>).add(OBSERVED_EVENT)
    try {
      const calls: unknown[][] = []
      const append = function (type: string, data: unknown) { calls.push([type, data]) }
      const outcome = appendAuditEvent({ append } as unknown as Session, OBSERVED_EVENT, payload)
      expect(outcome).toBe('appended')
      expect(calls).toEqual([[OBSERVED_EVENT, payload]])
    } finally {
      ;(KNOWN_SESSION_EVENT_TYPES as Set<string>).delete(OBSERVED_EVENT)
    }
  })

  it('skips the append on envelope-less hosts', () => {
    const calls: unknown[][] = []
    const append = function (type: string, data: unknown, surface?: unknown) {
      calls.push(surface === undefined ? [type, data] : [type, data, surface])
      return { surface }
    }
    const outcome = appendAuditEvent({ append } as unknown as Session, OBSERVED_EVENT, payload)
    expect(outcome).toBe('skipped-unknown-host')
    expect(calls).toHaveLength(0)
  })
})
