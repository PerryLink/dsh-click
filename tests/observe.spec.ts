/**
 * The staleness boundary: observation caching, id stability, and the
 * freshness verdict — identity drift, tree drift, pixel drift, expiry, and
 * the `staleCheckPixels: false` opt-out.
 *
 * @module dsh-click/test/observe.spec
 */

import { describe, expect, it } from 'vitest'
import { resolveConfig } from '../src/config.ts'
import { ObservationStore, observationIdOf } from '../src/observe.ts'
import type { WindowSnapshot } from '../src/platform/types.ts'
import { makeSnapshot } from './harness.ts'

function snapshot(overrides: Partial<WindowSnapshot> = {}): WindowSnapshot {
  return makeSnapshot(overrides)
}

describe('observationIdOf', () => {
  it('is stable for identical state', () => {
    expect(observationIdOf(snapshot())).toBe(observationIdOf(snapshot()))
  })

  it('changes when the pixels change', () => {
    expect(observationIdOf(snapshot({ shotHash: 'other' }))).not.toBe(observationIdOf(snapshot()))
  })
})

describe('ObservationStore', () => {
  it('records, retrieves, and bounds the cache (LRU)', () => {
    const store = new ObservationStore(resolveConfig({ maxCachedObservations: 2 }))
    const first = store.record(snapshot())
    const second = store.record(snapshot({ windowId: 2, shotHash: 'second' }))
    const third = store.record(snapshot({ windowId: 3, shotHash: 'third' }))
    expect(store.get(first.id)).toBeUndefined()
    expect(store.get(second.id)?.id).toBe(second.id)
    expect(store.get(third.id)?.id).toBe(third.id)
  })

  it('verifies a fresh window as ok', () => {
    const store = new ObservationStore(resolveConfig({}))
    const record = store.record(snapshot())
    expect(store.verify(record, snapshot())).toEqual({ ok: true })
  })

  it('refuses an expired observation', () => {
    const store = new ObservationStore(resolveConfig({ maxObservationAgeMs: 1_000 }))
    const record = store.record(snapshot())
    const verdict = store.verify(record, snapshot(), Date.now() + 2_000)
    expect(verdict).toMatchObject({ ok: false, code: 'EXPIRED' })
  })

  it('refuses identity drift (title/process/rect)', () => {
    const store = new ObservationStore(resolveConfig({}))
    const record = store.record(snapshot())
    expect(store.verify(record, snapshot({ title: 'Changed' }))).toMatchObject({ ok: false, code: 'STALE_IDENTITY' })
    expect(store.verify(record, snapshot({ processId: 999 }))).toMatchObject({ ok: false, code: 'STALE_IDENTITY' })
    expect(store.verify(record, snapshot({ rect: { x: 1, y: 2, width: 3, height: 4 } }))).toMatchObject({ ok: false, code: 'STALE_IDENTITY' })
  })

  it('refuses tree drift', () => {
    const store = new ObservationStore(resolveConfig({}))
    const record = store.record(snapshot())
    expect(store.verify(record, snapshot({ treeHash: 'tree-hash-2' }))).toMatchObject({ ok: false, code: 'STALE_TREE' })
  })

  it('refuses pixel drift, and tolerates it when staleCheckPixels is off', () => {
    const strict = new ObservationStore(resolveConfig({}))
    const record = strict.record(snapshot())
    expect(strict.verify(record, snapshot({ shotHash: 'shot-hash-2' }))).toMatchObject({ ok: false, code: 'STALE_PIXELS' })

    const relaxed = new ObservationStore(resolveConfig({ staleCheckPixels: false }))
    const relaxedRecord = relaxed.record(snapshot())
    expect(relaxed.verify(relaxedRecord, snapshot({ shotHash: 'shot-hash-2' }))).toEqual({ ok: true })
  })
})
