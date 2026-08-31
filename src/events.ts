/**
 * Session audit events for dsh-click (declaration merging into the harness's
 * `SessionEventMap`) and the adaptive append gate. Both events are log-only;
 * tool arguments and rendered results are already logged by the tool runtime
 * as `tool/call` + `tool/result`, and these events carry the observation and
 * action facts that exist outside them: window identity, process identity,
 * and the approval/outcome audit trail.
 *
 * The gate appends only when the host can carry the events safely:
 * - hosts whose known-type set covers the vocabulary append plainly;
 * - hosts with an `ignorable` append option (pre-0.1.2 master builds) append
 *   with the marker, so builds that do not know the type skip it on restore;
 * - envelope-less hosts (0.1.0-rc.6/rc.8, 0.1.1-rc.2, and 0.1.2-alpha.1,
 *   which removed the envelope and fails closed on unknown types at read)
 *   get no append — the tool results remain the reconstructable audit trail. On 0.1.2-alpha.2 the envelope field is restored for stored-log read compatibility only - its Session.append still cannot stamp the marker, so the gate behavior is unchanged.
 *
 * @module dsh-click/events
 */

import type { ImageMediaType } from '@deepseek-ai/dsh-attachment'
import { KNOWN_SESSION_EVENT_TYPES, type Session } from '@deepseek-ai/dsh-session'

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

/** Loose append shape probed at runtime (envelope-less hosts take no options; pre-0.1.2 master builds took `ignorable`). */
type AppendProbe = (type: string, data: unknown, options?: { ignorable: true }) => unknown

/**
 * Append one dsh-click audit event when the host can carry it safely; skip
 * silently otherwise (the tool/call + tool/result events remain the
 * model-visible log, so nothing model-visible is lost). See the module doc
 * for the three host classes.
 * @param session - the calling session.
 * @param type - the audit event type.
 * @param data - the audit payload.
 */
export function appendAuditEvent(
  session: Session,
  type: typeof OBSERVED_EVENT | typeof ACTION_EVENT,
  data: ObservedEvent | ActionEvent,
): void {
  if (KNOWN_SESSION_EVENT_TYPES.has(type)) {
    if (type === OBSERVED_EVENT) session.append(type, data as ObservedEvent)
    else session.append(type, data as ActionEvent)
    return
  }
  const append = session.append as AppendProbe
  if (Function.prototype.toString.call(append).includes('ignorable')) {
    append.call(session, type, data, { ignorable: true })
  }
}
