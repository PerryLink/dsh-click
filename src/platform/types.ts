/**
 * Wire vocabulary shared by the harness-side backends and the native helper
 * process (the platform seam). Every `DesktopBackend` implementation — the
 * Windows helper runner today, reserved macOS/Linux backends later — speaks
 * these types; helper JSON responses are validated against them at the wire
 * boundary because they cross a process trust line.
 *
 * @module dsh-click/platform/types
 */

import type { ProcessFacts } from '../events.ts'

/** Error with a stable machine-routing code, model-readable message included. */
export class DshClickError extends Error {
  /** @param message - human- and model-readable failure text. */
  /** @param code - stable code for policy and diagnostics. */
  constructor(message: string, readonly code: string) {
    super(message)
    this.name = 'DshClickError'
  }
}

/** How a window may be addressed in an observation request. */
export interface WindowRef {
  /** Native window handle (HWND on Windows). */
  windowId?: number
  /** Window title; the helper matches the first visible window containing it. */
  windowTitle?: string
  /** Owning process id. */
  processId?: number
}

/** Screen-space rectangle, integer pixel coordinates. */
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** One top-level application window. */
export interface WindowInfo {
  windowId: number
  processId: number | null
  title: string
  className: string
  rect: Rect
  executablePath: string | null
  visible: boolean
}

/** One accessibility element inside the observed window. */
export interface ElementInfo {
  /** Stable per-instance element id (UIA runtime id on Windows). */
  elementId: string
  /** Control type, e.g. "Button" or "Edit". */
  controlType: string
  /** Accessibility name; empty when unnamed. */
  name: string
  /** Automation id; empty when unset. */
  automationId: string
  /** Bounding rectangle in screen coordinates. */
  rect: Rect
  /** Whether the element is enabled. */
  enabled: boolean
  /** Patterns the element supports (value/invoke/scroll), so the model can pick the right action. */
  patterns: string[]
}

/** One pixel-location hint: a labeled point and its observed color. */
export interface PixelHint {
  /** Element or region label the hint describes. */
  label: string
  /** Screen x coordinate. */
  x: number
  /** Screen y coordinate. */
  y: number
  /** RGB color at the point, like "rgb(12, 34, 56)". */
  color: string
}

/** Fresh identity + content hashes for one window, captured at observation time. */
export interface WindowSnapshot {
  windowId: number
  processId: number
  executablePath: string | null
  title: string
  className: string
  rect: Rect
  /** True when the window currently owns the foreground. */
  foreground: boolean
  /** Hash of the accessibility subtree (element ids, rects, names, types). */
  treeHash: string
  /** Hash of the window's current pixels. */
  shotHash: string
  /** Number of elements the tree walk captured. */
  elementCount: number
}

/** A captured screenshot plus the snapshot facts it was taken with. */
export interface Screenshot {
  /** PNG bytes, base64-encoded. */
  pngBase64: string
  width: number
  height: number
  snapshot: WindowSnapshot
}

/** An accessibility tree read plus pixel hints. */
export interface Tree {
  snapshot: WindowSnapshot
  elements: ElementInfo[]
  pixels: PixelHint[]
}

/** One running desktop application. */
export interface AppInfo {
  processId: number
  name: string
  executablePath: string | null
  windows: WindowInfo[]
}

/** A click request: exactly one of element id or coordinates. */
export interface ClickRequest {
  windowId: number
  elementId?: string
  x?: number
  y?: number
  button: 'left' | 'right'
}

/** A type request addressed to a value-pattern element. */
export interface TypeRequest {
  windowId: number
  elementId: string
  text: string
  /** Whether the helper backs up and restores the control text on failure. */
  rollback: boolean
}

/** A scroll request. */
export interface ScrollRequest {
  windowId: number
  elementId?: string
  direction: 'up' | 'down' | 'page-up' | 'page-down'
  /** Number of increments; positive only. */
  amount: number
}

/** A key-combination request (e.g. "Ctrl+S", "Enter"). */
export interface KeyRequest {
  windowId: number
  keys: string
}

/** The settled outcome of one mutating action, as reported by the helper. */
export interface ActionOutcome {
  windowId: number
  /** Which action ran, for the audit trail. */
  action: string
  /** Delivery mechanism actually used. */
  delivered: 'uia' | 'posted' | 'none'
  processBefore: ProcessFacts
  processAfter: ProcessFacts
  /** Present on `type`: whether failed typing restored the original text. */
  restored?: boolean
  /** Short helper-side detail. */
  detail?: string
}

/** The settled outcome of an app launch. */
export interface LaunchOutcome {
  processId: number
  executablePath: string | null
}

/**
 * The platform abstraction every desktop backend implements. Backends must
 * never move input focus themselves; the `focusFallback` flag is the ONLY
 * sanctioned escape hatch and stays `false` by default.
 */
export interface DesktopBackend {
  /** Platform id this backend serves (`win32`, reserved `darwin`/`linux`). */
  readonly platform: string
  /** Whether the backend can run at all (services mounted, platform supported). */
  readonly available: boolean
  /** Why the backend is unavailable, when it is. */
  readonly unavailableReason?: string

  /** List every visible top-level window across running applications. */
  listWindows(signal?: AbortSignal): Promise<WindowInfo[]>
  /** Capture a screenshot of the addressed window (or the primary screen). */
  shot(ref: WindowRef, maxSide: number, signal?: AbortSignal): Promise<Screenshot>
  /** Read the accessibility tree plus pixel hints of the addressed window. */
  tree(ref: WindowRef, maxElements: number, maxDepth: number, includePixels: boolean, signal?: AbortSignal): Promise<Tree>
  /** Re-capture fresh identity + hashes for one window (the stale check). */
  snapshot(windowId: number, signal?: AbortSignal): Promise<WindowSnapshot>
  /** Perform a click inside the target window. */
  click(request: ClickRequest, focusFallback: boolean, signal?: AbortSignal): Promise<ActionOutcome>
  /** Type text into the target element. */
  type(request: TypeRequest, focusFallback: boolean, signal?: AbortSignal): Promise<ActionOutcome>
  /** Scroll the target element or window. */
  scroll(request: ScrollRequest, focusFallback: boolean, signal?: AbortSignal): Promise<ActionOutcome>
  /** Send a key combination to the target window. */
  key(request: KeyRequest, focusFallback: boolean, signal?: AbortSignal): Promise<ActionOutcome>
  /** List running desktop applications. */
  apps(signal?: AbortSignal): Promise<AppInfo[]>
  /** Launch one application by name or path. */
  launch(name: string, args: readonly string[], signal?: AbortSignal): Promise<LaunchOutcome>
}

/** The JSON request the harness writes to the helper's stdin. */
export interface HelperRequest {
  protocol: number
  pluginVersion: string
  requestId: string
  op: string
  args: Record<string, unknown>
}

/** The JSON response the helper writes to stdout: either a result or an error. */
export type HelperResponse =
  | { ok: true; result: unknown }
  | { ok: false; error: { code: string; message: string } }

/** Assert one helper response field is a finite number; throws on violation. */
export function expectNumber(record: Record<string, unknown>, field: string, op: string): number {
  const value = record[field]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new DshClickError(`helper "${op}" returned a non-numeric "${field}" field`, 'BAD_HELPER_RESPONSE')
  }
  return value
}

/** Assert one helper response field is a string; throws on violation. */
export function expectString(record: Record<string, unknown>, field: string, op: string): string {
  const value = record[field]
  if (typeof value !== 'string') {
    throw new DshClickError(`helper "${op}" returned a non-string "${field}" field`, 'BAD_HELPER_RESPONSE')
  }
  return value
}

/** Assert one helper response field is a plain record; throws on violation. */
export function expectRecord(record: Record<string, unknown>, field: string, op: string): Record<string, unknown> {
  const value = record[field]
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new DshClickError(`helper "${op}" returned a non-object "${field}" field`, 'BAD_HELPER_RESPONSE')
  }
  return value as Record<string, unknown>
}

/** Assert an entire helper payload is a plain record; throws on violation. */
export function expectRecordValue(value: unknown, op: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new DshClickError(`helper "${op}" returned a non-object payload`, 'BAD_HELPER_RESPONSE')
  }
  return value as Record<string, unknown>
}

/** Parse the helper's `processBefore`/`processAfter` facts at the wire boundary. */
export function expectProcessFacts(value: unknown, op: string): ProcessFacts {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new DshClickError(`helper "${op}" returned malformed process facts`, 'BAD_HELPER_RESPONSE')
  }
  const record = value as Record<string, unknown>
  const pid = expectNumber(record, 'pid', op)
  const executablePath = record['executablePath']
  if (executablePath !== null && typeof executablePath !== 'string') {
    throw new DshClickError(`helper "${op}" returned malformed process facts`, 'BAD_HELPER_RESPONSE')
  }
  return { pid, executablePath }
}
