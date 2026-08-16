/**
 * Session audit events for dsh-click (declaration merging into the harness's
 * `SessionEventMap`). Both events are log-only; on harness builds that support
 * the append envelope they should be marked `ignorable` (the pinned peer
 * 0.1.0-rc.6 has no envelope option, so the append stays two-argument and
 * remains compatible with both). Tool arguments and rendered results are
 * already logged by the tool runtime as `tool/call` + `tool/result`; these
 * events carry the observation and action facts that exist outside them:
 * window identity, process identity, and the approval/outcome audit trail.
 *
 * @module dsh-click/events
 */

import type { ImageMediaType } from '@deepseek-ai/dsh-attachment'

/** Process identity facts captured immediately before and after an action. */
export interface ProcessFacts {
  /** Process id owning the target window. */
  pid: number
  /** Executable path, or null when the helper could not read it (permissions). */
  executablePath: string | null
}

/** One image saved into the attachment store by `screen_shot`. */
export interface ObservedImage {
  /** Content-addressed attachment id. */
  attachmentId: string
  /** Verified media type of the stored bytes. */
  mediaType: ImageMediaType
  /** Encoded byte length. */
  bytes: number
  /** Intrinsic width in pixels. */
  width: number
  /** Intrinsic height in pixels. */
  height: number
}

declare module '@deepseek-ai/dsh-session/types' {
  interface SessionEventMap {
    /**
     * A screen observation was produced by `screen_shot` or `screen_read` —
     * log-only audit. `observationId` is the id later actions cite in
     * `basedOn`; window and process identity are the facts the action-time
     * freshness check compares against.
     */
    'dsh-click/observed': {
      /** Observation id (hash of the observed state). */
      observationId: string
      /** Observed window handle. */
      windowId: number
      /** Process id owning the window. */
      processId: number
      /** Sanitized executable path, or null when unreadable. */
      executablePath: string | null
      /** Sanitized window title. */
      windowTitle: string
      /** Number of accessibility elements captured. */
      elementCount: number
      /** The attached screenshot, when `screen_shot` stored one. */
      image?: ObservedImage
    }
    /**
     * A mutating action was gated and executed (or refused) — log-only audit.
     * `approved` records which gate allowed it; process facts prove the target
     * process identity before and after the action.
     */
    'dsh-click/action': {
      /** Tool that ran the action. */
      tool: string
      /** Which gate allowed the action: approval ask, allowlist match, or none required. */
      approved: 'approval' | 'allowlist' | 'none'
      /** Final outcome: the action ran, or it was refused/failed. */
      outcome: 'ok' | 'error'
      /** Observation the action based on, when one was required. */
      observationId?: string
      /** Target window handle, when the action addressed a window. */
      windowId?: number
      /** Process identity captured before the action. */
      processBefore?: ProcessFacts
      /** Process identity captured after the action. */
      processAfter?: ProcessFacts
      /** True when a failed `type` restored the original control text. */
      restored?: boolean
      /** Short sanitized detail (denial reason, stale-check detail). */
      detail?: string
    }
  }
}

/** The observation audit event type. */
export const OBSERVED_EVENT = 'dsh-click/observed' as const

/** The action audit event type. */
export const ACTION_EVENT = 'dsh-click/action' as const

/** Type of the observation audit payload. */
export type ObservedEvent = {
  observationId: string
  windowId: number
  processId: number
  executablePath: string | null
  windowTitle: string
  elementCount: number
  image?: ObservedImage
}

/** Type of the action audit payload. */
export type ActionEvent = {
  tool: string
  approved: 'approval' | 'allowlist' | 'none'
  outcome: 'ok' | 'error'
  observationId?: string
  windowId?: number
  processBefore?: ProcessFacts
  processAfter?: ProcessFacts
  restored?: boolean
  detail?: string
}
