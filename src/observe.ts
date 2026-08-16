/**
 * Observation cache and the staleness boundary. Every observation stores the
 * window's identity facts plus content hashes; before any action the executor
 * re-observes the window and this store compares. Identity, tree, or pixel
 * drift — or an expired observation — refuses the action, so the model must
 * re-observe instead of acting on a screen that changed.
 *
 * @module dsh-click/observe
 */

import { createHash } from 'node:crypto'
import type { ResolvedConfig } from './config.ts'
import type { Rect, WindowSnapshot } from './platform/types.ts'

/** One cached observation, immutable after construction. */
export interface ObservationRecord {
  /** Observation id (content hash). */
  id: string
  windowId: number
  processId: number
  executablePath: string | null
  title: string
  className: string
  rect: Rect
  treeHash: string
  shotHash: string
  elementCount: number
  /** Wall-clock capture time in milliseconds. */
  observedAt: number
}

/** The staleness verdict: ok, or a stable refusal code plus a model-readable detail. */
export type FreshnessVerdict =
  | { ok: true }
  | { ok: false; code: 'UNKNOWN_OBSERVATION' | 'EXPIRED' | 'STALE_IDENTITY' | 'STALE_TREE' | 'STALE_PIXELS'; detail: string }

/**
 * Hash the observable state of one window into a stable observation id.
 *
 * @param snapshot - the snapshot facts.
 * @returns a hex observation id.
 */
export function observationIdOf(snapshot: WindowSnapshot): string {
  const material = JSON.stringify([
    snapshot.windowId,
    snapshot.processId,
    snapshot.executablePath,
    snapshot.title,
    snapshot.className,
    snapshot.rect,
    snapshot.treeHash,
    snapshot.shotHash,
  ])
  return createHash('sha256').update(material).digest('hex').slice(0, 32)
}

/** Bounded LRU cache of observations, plus the staleness verdict logic. */
export class ObservationStore {
  private readonly entries = new Map<string, ObservationRecord>()

  /** @param config - resolved caps (cache size, max age, pixel check). */
  constructor(private readonly config: ResolvedConfig) {}

  /**
   * Cache one observation and return it.
   *
   * @param snapshot - the snapshot facts it came from.
   * @returns the stored record (id = hash of the state).
   */
  record(snapshot: WindowSnapshot): ObservationRecord {
    const record: ObservationRecord = {
      id: observationIdOf(snapshot),
      windowId: snapshot.windowId,
      processId: snapshot.processId,
      executablePath: snapshot.executablePath,
      title: snapshot.title,
      className: snapshot.className,
      rect: { ...snapshot.rect },
      treeHash: snapshot.treeHash,
      shotHash: snapshot.shotHash,
      elementCount: snapshot.elementCount,
      observedAt: Date.now(),
    }
    this.entries.delete(record.id)
    this.entries.set(record.id, record)
    while (this.entries.size > this.config.maxCachedObservations) {
      const oldest = this.entries.keys().next().value
      if (oldest === undefined) break
      this.entries.delete(oldest)
    }
    return record
  }

  /**
   * Look one observation up by id.
   *
   * @param id - the observation id an action cites.
   * @returns the record, or undefined when unknown or evicted.
   */
  get(id: string): ObservationRecord | undefined {
    return this.entries.get(id)
  }

  /**
   * Compare a fresh re-observation against the cited record. The verdict is
   * `ok` only when identity (window/pid/exe/title/class/rect), the tree hash,
   * and — when `staleCheckPixels` is on — the pixel hash all still match, and
   * the record is not older than `maxObservationAgeMs`.
   *
   * @param record - the observation the action cites.
   * @param fresh - the re-observation captured immediately before the action.
   * @param now - wall-clock now (injectable for tests).
   * @returns the verdict.
   */
  verify(record: ObservationRecord, fresh: WindowSnapshot, now: number = Date.now()): FreshnessVerdict {
    if (now - record.observedAt > this.config.maxObservationAgeMs) {
      return {
        ok: false,
        code: 'EXPIRED',
        detail: `observation ${record.id} is older than ${this.config.maxObservationAgeMs} ms`,
      }
    }
    const identityChanged = fresh.windowId !== record.windowId
      || fresh.processId !== record.processId
      || fresh.executablePath !== record.executablePath
      || fresh.title !== record.title
      || fresh.className !== record.className
      || fresh.rect.x !== record.rect.x || fresh.rect.y !== record.rect.y
      || fresh.rect.width !== record.rect.width || fresh.rect.height !== record.rect.height
    if (identityChanged) {
      return {
        ok: false,
        code: 'STALE_IDENTITY',
        detail: `window ${record.windowId} no longer matches observation ${record.id} (title/class/process or rect changed)`,
      }
    }
    if (fresh.treeHash !== record.treeHash) {
      return {
        ok: false,
        code: 'STALE_TREE',
        detail: `the accessibility tree of window ${record.windowId} changed since observation ${record.id}`,
      }
    }
    if (this.config.staleCheckPixels && fresh.shotHash !== record.shotHash) {
      return {
        ok: false,
        code: 'STALE_PIXELS',
        detail: `the pixels of window ${record.windowId} changed since observation ${record.id}`,
      }
    }
    return { ok: true }
  }
}
