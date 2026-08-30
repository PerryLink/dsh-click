/**
 * The eight model tools dsh-click registers: two observers
 * (`screen_shot`, `screen_read`), four window-scoped actions
 * (`click`, `type`, `scroll`, `key`), and two application tools
 * (`app_list`, `app_launch`). Observers are read-only; every action crosses
 * {@link ActionExecutor} — freshness check, approval gate, process-identity
 * check — before anything happens. Tool outputs are canonical JSON plus a
 * pure text renderer; `screen_shot` additionally emits an image content block
 * when the model accepts images (vision routing).
 *
 * @module dsh-click/tools
 */

import type { Context } from '@deepseek-ai/cordis'
import type { AttachmentStore, ImageAttachmentRef } from '@deepseek-ai/dsh-attachment'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolRunContext } from '@deepseek-ai/dsh-tools'
import { ActionExecutor } from './actions.ts'
import type { ResolvedConfig } from './config.ts'
import { appendAuditEvent, OBSERVED_EVENT, type ObservedEvent } from './events.ts'
import { ObservationStore } from './observe.ts'
import { sanitizePath, sanitizeVisible } from './sanitize.ts'
import { sessionAcceptsImages } from './vision.ts'
import { centerOf, screenBoxFor, type OcrProvider, type VisualGroundingProvider } from './vision/index.ts'
import type { DesktopBackend, ElementInfo, PixelHint, Rect, WindowInfo, WindowRef, WindowSnapshot } from './platform/types.ts'

/** Everything one tool needs at runtime; injected by `src/index.ts`. */
export interface ToolServices {
  /** The mounting context. */
  readonly ctx: Context
  /** Resolved plugin config. */
  readonly config: ResolvedConfig
  /** The active desktop backend. */
  readonly backend: DesktopBackend
  /** The observation cache. */
  readonly observations: ObservationStore
  /** The action executor. */
  readonly actions: ActionExecutor
  /** The probed OCR provider (optional). */
  readonly ocr: OcrProvider
  /** The optional visual grounding provider. */
  readonly grounding: VisualGroundingProvider
}

/** The sanitized, model-visible window facts shared by observer outputs. */
export interface ObservedWindowValue {
  windowId: number
  processId: number
  title: string
  className: string
  executablePath: string | null
  rect: Rect
  foreground: boolean
}

/** Sanitize one snapshot into the model-visible window value. */
function observedWindow(snapshot: WindowSnapshot, maxTextLength: number): ObservedWindowValue {
  return {
    windowId: snapshot.windowId,
    processId: snapshot.processId,
    title: sanitizeVisible(snapshot.title, maxTextLength),
    className: sanitizeVisible(snapshot.className, maxTextLength),
    executablePath: snapshot.executablePath === null ? null : sanitizePath(snapshot.executablePath, maxTextLength),
    rect: { ...snapshot.rect },
    foreground: snapshot.foreground,
  }
}

/** Sanitize one accessibility element into the model-visible form. */
function observedElement(element: ElementInfo, maxTextLength: number) {
  return {
    elementId: element.elementId,
    controlType: sanitizeVisible(element.controlType, 64),
    name: sanitizeVisible(element.name, maxTextLength),
    automationId: sanitizeVisible(element.automationId, 64),
    rect: element.rect,
    enabled: element.enabled,
    patterns: element.patterns,
  }
}

/** Sanitize one pixel hint into the model-visible form. */
function observedPixel(pixel: PixelHint, maxTextLength: number) {
  return {
    label: sanitizeVisible(pixel.label, maxTextLength),
    x: pixel.x,
    y: pixel.y,
    color: pixel.color,
  }
}

/** Sanitize one window listing entry. */
function observedWindowInfo(info: WindowInfo, maxTextLength: number) {
  return {
    windowId: info.windowId,
    processId: info.processId,
    title: sanitizeVisible(info.title, maxTextLength),
    className: sanitizeVisible(info.className, maxTextLength),
    rect: info.rect,
    executablePath: info.executablePath === null ? null : sanitizePath(info.executablePath, maxTextLength),
    visible: info.visible,
  }
}

/** Append the `dsh-click/observed` audit event; a failed append is swallowed. */
function auditObservation(exec: ToolRunContext, event: ObservedEvent, auditSessionEvents = true): void {
  if (!auditSessionEvents) return
  const session = exec.agent?.session
  if (session === undefined) return
  try {
    appendAuditEvent(session, OBSERVED_EVENT, event)
  } catch {
    // The tool/result event still logs the model-visible content.
  }
}

/** One-line window identity for render text. */
function windowLine(window: ObservedWindowValue): string {
  return `"${window.title}" (windowId ${window.windowId}, pid ${window.processId}, ${window.executablePath ?? 'unknown executable'})`
}

/** Refuse an unusable backend before any backend call. */
function backendGuard(services: ToolServices): void {
  if (!services.backend.available) {
    throw new Error(`dsh-click backend unavailable on ${services.backend.platform}: ${services.backend.unavailableReason ?? 'unknown reason'}`)
  }
}

/** Plain-text fallback description for a captured screenshot. */
function shotDescription(window: ObservedWindowValue, width: number, height: number): string {
  return `${width}x${height} screenshot of ${windowLine(window)}; run screen_read on the same window for the structured element list and pixel positions.`
}

/**
 * `screen_shot` — capture the addressed window (or the primary screen).
 * In `imageMode: 'auto'` the result carries an image attachment when the
 * current model accepts images; otherwise a text description keeps text-only
 * models working.
 *
 * @param services - runtime services.
 * @returns the tool definition.
 */
export function screenShotTool(services: ToolServices) {
  const { ctx, config, backend, observations } = services
  return defineTool({
    name: 'screen_shot',
    description:
      'Capture a screenshot of a desktop window (or the primary screen when no window is given). Returns an observationId that later actions cite in `basedOn`. When the current model accepts images the result includes the image; otherwise it includes a text description. Read-only: never needs approval.',
    parameters: {
      target: {
        type: 'object',
        description: 'Which window to capture (windowId, windowTitle, or processId); omitted = the foreground window.',
        properties: {
          windowId: { type: 'integer', description: 'Native window handle from app_list or screen_read.' },
          windowTitle: { type: 'string', description: 'Visible window title (matched case-insensitively by substring).' },
          processId: { type: 'integer', description: 'Owning process id.' },
        },
        additionalProperties: false,
      },
      maxSide: { type: 'integer', description: 'Longest side in pixels; larger captures are downscaled.' },
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          ok: { type: 'boolean', const: true },
          observationId: { type: 'string' },
          window: {
            type: 'object',
            properties: {
              windowId: { type: 'integer' },
              processId: { type: 'integer' },
              title: { type: 'string' },
              className: { type: 'string' },
              executablePath: { oneOf: [{ type: 'string' }, { type: 'null' }] },
              rect: {
                type: 'object',
                properties: {
                  x: { type: 'integer' },
                  y: { type: 'integer' },
                  width: { type: 'integer' },
                  height: { type: 'integer' },
                },
                additionalProperties: false,
              },
              foreground: { type: 'boolean' },
            },
            additionalProperties: false,
          },
          image: {
            type: 'object',
            properties: {
              attachmentId: { type: 'string' },
              mediaType: { type: 'string' },
              bytes: { type: 'integer' },
              width: { type: 'integer' },
              height: { type: 'integer' },
              name: { type: 'string' },
            },
            additionalProperties: false,
          },
          description: { type: 'string' },
        },
        additionalProperties: false,
      },
      render(_args, value): ContentBlock[] {
        const result = value as unknown as {
          observationId: string
          window: ObservedWindowValue
          image?: ImageAttachmentRef
          description: string
        }
        const blocks: ContentBlock[] = [{
          type: 'text',
          text: `Screenshot of ${windowLine(result.window)} captured.\nobservationId: ${result.observationId}\n${result.image === undefined ? result.description : 'Image attached; cite this observationId in later actions.'}`,
        }]
        if (result.image !== undefined) blocks.push({ type: 'image', attachment: result.image })
        return blocks
      },
    },
    timeoutMs: config.helperTimeoutMs + 15_000,
    async execute(args, exec) {
      backendGuard(services)
      const target = (args as { target?: WindowRef }).target ?? {}
      const requestedSide = (args as { maxSide?: number }).maxSide
      const maxSide = requestedSide === undefined ? config.maxScreenshotSide : Math.min(requestedSide, config.maxScreenshotSide)
      const shot = await backend.shot(target, maxSide, exec.signal)
      const sanitized = observedWindow(shot.snapshot, config.maxTextLength)
      const record = observations.record(shot.snapshot)
      const description = shotDescription(sanitized, shot.width, shot.height)

      let image: ImageAttachmentRef | undefined
      const attachments = ctx.get('attachments') as AttachmentStore | undefined
      if (config.imageMode !== 'text' && attachments !== undefined
        && await sessionAcceptsImages(exec.agent, ctx, exec.signal)) {
        try {
          image = await attachments.saveImage({
            data: Buffer.from(shot.pngBase64, 'base64'),
            mediaType: 'image/png',
            name: `dsh-click-${record.id.slice(0, 12)}.png`,
          })
        } catch {
          // Vision routing fails closed: the text description still ships.
          image = undefined
        }
      }

      auditObservation(exec, {
        observationId: record.id,
        windowId: shot.snapshot.windowId,
        processId: shot.snapshot.processId,
        executablePath: sanitized.executablePath,
        windowTitle: sanitized.title,
        elementCount: shot.snapshot.elementCount,
        ...image !== undefined ? {
          image: {
            attachmentId: image.attachmentId,
            mediaType: image.mediaType,
            bytes: image.bytes,
            width: image.width,
            height: image.height,
          },
        } : {},
      }, config.auditSessionEvents)

      return {
        ok: true,
        observationId: record.id,
        window: sanitized,
        ...image !== undefined ? { image } : {},
        description,
      }
    },
  })
}

/**
 * `screen_read` — the structured observation for text-only models: the
 * window's accessibility tree plus pixel-location hints. The returned
 * elementIds are what click/type/scroll address.
 *
 * @param services - runtime services.
 * @returns the tool definition.
 */
export function screenReadTool(services: ToolServices) {
  const { config, backend, observations } = services
  return defineTool({
    name: 'screen_read',
    description:
      'Read a desktop window as structured text: its accessibility tree (element ids, types, names, rectangles, supported patterns) plus pixel-location hints with colors. Returns an observationId that later actions cite in `basedOn`; elements are addressed by their elementId. Read-only: never needs approval.',
    parameters: {
      target: {
        type: 'object',
        description: 'Which window to read (windowId, windowTitle, or processId); omitted = the foreground window.',
        properties: {
          windowId: { type: 'integer', description: 'Native window handle from app_list or screen_read.' },
          windowTitle: { type: 'string', description: 'Visible window title (matched case-insensitively by substring).' },
          processId: { type: 'integer', description: 'Owning process id.' },
        },
        additionalProperties: false,
      },
      includePixels: { type: 'boolean', description: 'Include pixel-location hints (default true).' },
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          ok: { type: 'boolean', const: true },
          observationId: { type: 'string' },
          window: {
            type: 'object',
            properties: {
              windowId: { type: 'integer' },
              processId: { type: 'integer' },
              title: { type: 'string' },
              className: { type: 'string' },
              executablePath: { oneOf: [{ type: 'string' }, { type: 'null' }] },
              rect: {
                type: 'object',
                properties: {
                  x: { type: 'integer' },
                  y: { type: 'integer' },
                  width: { type: 'integer' },
                  height: { type: 'integer' },
                },
                additionalProperties: false,
              },
              foreground: { type: 'boolean' },
            },
            additionalProperties: false,
          },
          elements: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                elementId: { type: 'string' },
                controlType: { type: 'string' },
                name: { type: 'string' },
                automationId: { type: 'string' },
                rect: {
                  type: 'object',
                  properties: {
                    x: { type: 'integer' },
                    y: { type: 'integer' },
                    width: { type: 'integer' },
                    height: { type: 'integer' },
                  },
                  additionalProperties: false,
                },
                enabled: { type: 'boolean' },
                patterns: { type: 'array', items: { type: 'string' } },
              },
              additionalProperties: false,
            },
          },
          pixels: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string' },
                x: { type: 'integer' },
                y: { type: 'integer' },
                color: { type: 'string' },
              },
              additionalProperties: false,
            },
          },
        },
        additionalProperties: false,
      },
      render(_args, value): ContentBlock[] {
        const result = value as unknown as {
          observationId: string
          window: ObservedWindowValue
          elements: ElementInfo[]
          pixels: PixelHint[]
        }
        const lines = [
          `Window read: ${windowLine(result.window)}`,
          `observationId: ${result.observationId}`,
          `${result.elements.length} element(s):`,
        ]
        for (const element of result.elements) {
          lines.push(`- [${element.elementId}] ${element.controlType} ${JSON.stringify(element.name)} at (${element.rect.x}, ${element.rect.y}) ${element.rect.width}x${element.rect.height}${element.enabled ? '' : ' (disabled)'}${element.patterns.length > 0 ? ` patterns: ${element.patterns.join(',')}` : ''}`)
        }
        if (result.pixels.length > 0) {
          lines.push(`${result.pixels.length} pixel hint(s):`)
          for (const pixel of result.pixels) {
            lines.push(`- ${pixel.label} at (${pixel.x}, ${pixel.y}) ${pixel.color}`)
          }
        }
        lines.push('Actions (click/type/scroll/key) must cite this observationId in `basedOn` and address elements by elementId.')
        return [{ type: 'text', text: lines.join('\n') }]
      },
    },
    timeoutMs: config.helperTimeoutMs + 15_000,
    async execute(args, exec) {
      backendGuard(services)
      const parsed = args as { target?: WindowRef; includePixels?: boolean }
      const tree = await backend.tree(
        parsed.target ?? {},
        config.maxElements,
        config.maxTreeDepth,
        parsed.includePixels ?? true,
        exec.signal,
      )
      const sanitized = observedWindow(tree.snapshot, config.maxTextLength)
      const record = observations.record(tree.snapshot)
      auditObservation(exec, {
        observationId: record.id,
        windowId: tree.snapshot.windowId,
        processId: tree.snapshot.processId,
        executablePath: sanitized.executablePath,
        windowTitle: sanitized.title,
        elementCount: tree.elements.length,
      }, config.auditSessionEvents)
      return {
        ok: true,
        observationId: record.id,
        window: sanitized,
        elements: tree.elements.map(element => observedElement(element, config.maxTextLength)),
        pixels: tree.pixels.map(pixel => observedPixel(pixel, config.maxTextLength)),
      }
    },
  })
}

/**
 * `screen_find` — find clickable text/visual targets in a window whose
 * accessibility tree is empty (no UIA elements). It captures the window,
 * runs OCR (when the probed provider is available) and, when a grounding
 * provider is mounted and a query is given, visual grounding, then returns
 * screen-coordinate targets plus an observationId for the coordinate-based
 * `click` path. Read-only: never needs approval.
 *
 * @param services - runtime services.
 * @returns the tool definition.
 */
export function screenFindTool(services: ToolServices) {
  const { config, backend, observations, ocr, grounding } = services
  return defineTool({
    name: 'screen_find',
    description:
      'Find clickable text (or a described visual target) in a desktop window that exposes no accessibility tree, via OCR and optional visual grounding. Returns screen-coordinate targets plus an observationId; later `click` calls address a target by its (x, y) coordinates and cite this observationId in `basedOn`. Read-only: never needs approval.',
    parameters: {
      target: {
        type: 'object',
        description: 'Which window to search (windowId, windowTitle, or processId); omitted = the foreground window.',
        properties: {
          windowId: { type: 'integer', description: 'Native window handle from app_list.' },
          windowTitle: { type: 'string', description: 'Visible window title (matched case-insensitively by substring).' },
          processId: { type: 'integer', description: 'Owning process id.' },
        },
        additionalProperties: false,
      },
      query: { type: 'string', description: 'Optional substring to filter OCR text by, or the visual target description for grounding.' },
      maxSide: { type: 'integer', description: 'Longest side in pixels; larger captures are downscaled.' },
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          ok: { type: 'boolean', const: true },
          observationId: { type: 'string' },
          window: {
            type: 'object',
            properties: {
              windowId: { type: 'integer' },
              processId: { type: 'integer' },
              title: { type: 'string' },
              className: { type: 'string' },
              executablePath: { oneOf: [{ type: 'string' }, { type: 'null' }] },
              rect: {
                type: 'object',
                properties: {
                  x: { type: 'integer' },
                  y: { type: 'integer' },
                  width: { type: 'integer' },
                  height: { type: 'integer' },
                },
                additionalProperties: false,
              },
              foreground: { type: 'boolean' },
            },
            additionalProperties: false,
          },
          ocrAvailable: { type: 'boolean' },
          targets: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                text: { type: 'string' },
                x: { type: 'integer' },
                y: { type: 'integer' },
                width: { type: 'integer' },
                height: { type: 'integer' },
                confidence: { type: 'number' },
                source: { type: 'string', enum: ['ocr', 'grounding'] },
              },
              additionalProperties: false,
            },
          },
        },
        additionalProperties: false,
      },
      render(_args, value): ContentBlock[] {
        const result = value as unknown as {
          observationId: string
          window: ObservedWindowValue
          ocrAvailable: boolean
          targets: Array<{ text: string; x: number; y: number; width: number; height: number; confidence: number; source: string }>
        }
        const lines = [
          `Text/visual targets in ${windowLine(result.window)}:`,
          `observationId: ${result.observationId}`,
          `OCR available: ${result.ocrAvailable}`,
          `${result.targets.length} target(s):`,
        ]
        for (const target of result.targets) {
          lines.push(`- ${JSON.stringify(target.text)} at (${target.x}, ${target.y}) ${target.width}x${target.height} [${target.source}]`)
        }
        lines.push('cite this observationId in click `basedOn` and address a target by its (x, y) coordinates.')
        return [{ type: 'text', text: lines.join('\n') }]
      },
    },
    timeoutMs: config.helperTimeoutMs + 30_000,
    async execute(args, exec) {
      backendGuard(services)
      const parsed = args as { target?: WindowRef; query?: string; maxSide?: number }
      const requestedSide = parsed.maxSide
      const maxSide = requestedSide === undefined ? config.maxScreenshotSide : Math.min(requestedSide, config.maxScreenshotSide)
      const shot = await backend.shot(parsed.target ?? {}, maxSide, exec.signal)
      const sanitized = observedWindow(shot.snapshot, config.maxTextLength)
      const record = observations.record(shot.snapshot)

      const targets: Array<{ text: string; x: number; y: number; width: number; height: number; confidence: number; source: 'ocr' | 'grounding' }> = []
      if (ocr.available) {
        for (const word of await ocr.recognize(shot.pngBase64, exec.signal)) {
          const box = screenBoxFor(shot.snapshot.rect, shot.width, shot.height, word.box)
          const center = centerOf(box)
          targets.push({
            text: sanitizeVisible(word.text, config.maxTextLength),
            x: center.x,
            y: center.y,
            width: Math.round(box.width),
            height: Math.round(box.height),
            confidence: word.confidence / 100,
            source: 'ocr',
          })
        }
      }
      const query = parsed.query?.trim() ?? ''
      if (grounding.available && query !== '') {
        for (const target of await grounding.ground(shot.pngBase64, shot.width, shot.height, query, exec.signal)) {
          const box = screenBoxFor(shot.snapshot.rect, shot.width, shot.height, target.box)
          const center = centerOf(box)
          targets.push({
            text: sanitizeVisible(target.label, config.maxTextLength),
            x: center.x,
            y: center.y,
            width: Math.round(box.width),
            height: Math.round(box.height),
            confidence: target.confidence,
            source: 'grounding',
          })
        }
      }
      const filtered = query === '' ? targets : targets.filter(target => target.text.toLowerCase().includes(query.toLowerCase()))

      auditObservation(exec, {
        observationId: record.id,
        windowId: shot.snapshot.windowId,
        processId: shot.snapshot.processId,
        executablePath: sanitized.executablePath,
        windowTitle: sanitized.title,
        elementCount: 0,
      }, config.auditSessionEvents)

      return {
        ok: true,
        observationId: record.id,
        window: sanitized,
        ocrAvailable: ocr.available,
        targets: filtered,
      }
    },
  })
}

/** The shared window-action output schema (click/scroll/key). */
function actionOutputSchema(withRestored: boolean) {
  return {
    type: 'object' as const,
    properties: {
      ok: { type: 'boolean' as const, const: true },
      windowId: { type: 'integer' as const },
      delivered: { type: 'string' as const, enum: ['uia', 'posted', 'none'] as const },
      process: {
        type: 'object' as const,
        properties: {
          before: {
            type: 'object' as const,
            properties: {
              pid: { type: 'integer' as const },
              executablePath: { oneOf: [{ type: 'string' as const }, { type: 'null' as const }] as const },
            },
            additionalProperties: false,
          },
          after: {
            type: 'object' as const,
            properties: {
              pid: { type: 'integer' as const },
              executablePath: { oneOf: [{ type: 'string' as const }, { type: 'null' as const }] as const },
            },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
      detail: { type: 'string' as const },
      ...withRestored ? { restored: { type: 'boolean' as const } } : {},
    },
    additionalProperties: false,
  }
}

/** The cited-observation parameters shared by the four action tools. */
const basedOnParameters = {
  basedOn: {
    type: 'object' as const,
    description: 'The observation this action is based on; the action fails if the screen changed since that observation.',
    properties: {
      observationId: { type: 'string' as const, description: 'observationId returned by screen_shot or screen_read.', required: true as const },
      windowId: { type: 'integer' as const, description: 'windowId of the observed window.', required: true as const },
    },
    additionalProperties: false,
    required: true as const,
  },
}

/** One-line action summary for render text. */
function actionLine(toolName: string, value: {
  windowId: number
  delivered: string
  process: { before: { pid: number; executablePath: string | null }; after: { pid: number; executablePath: string | null } }
  restored?: boolean
}): string {
  const before = value.process.before
  const after = value.process.after
  return `${toolName} delivered via ${value.delivered} to window ${value.windowId}; process pid ${before.pid} → ${after.pid}${value.restored === undefined ? '' : value.restored ? ' (original text restored)' : ' (text restore unavailable)'}.`
}

/**
 * `click` — click an element (by elementId) or a coordinate inside the
 * observed window. Never steals foreground focus; delivery is UIA invoke
 * where possible, posted window messages otherwise.
 *
 * @param services - runtime services.
 * @returns the tool definition.
 */
export function clickTool(services: ToolServices) {
  const { config, backend, actions } = services
  return defineTool({
    name: 'click',
    description:
      'Click an element or a coordinate inside an observed desktop window. Requires `basedOn` (a fresh observationId from screen_shot/screen_read); the call fails if the screen changed since that observation. Never steals foreground focus. Requires approval unless the window is allowlisted.',
    parameters: {
      ...basedOnParameters,
      target: {
        type: 'object',
        description: 'Exactly one of elementId or (x, y) — screen coordinates.',
        properties: {
          elementId: { type: 'string', description: 'Element id from screen_read.' },
          x: { type: 'integer', description: 'Screen x coordinate.' },
          y: { type: 'integer', description: 'Screen y coordinate.' },
        },
        additionalProperties: false,
        required: true as const,
      },
      button: { type: 'string', enum: ['left', 'right'] as const, description: 'Mouse button (default left).' },
    },
    output: {
      schema: actionOutputSchema(false),
      render(_args, value): ContentBlock[] {
        return [{ type: 'text', text: actionLine('click', value as unknown as Parameters<typeof actionLine>[1]) }]
      },
    },
    timeoutMs: config.helperTimeoutMs + 15_000,
    async execute(args, exec) {
      backendGuard(services)
      const parsed = args as { basedOn: { observationId: string; windowId: number }; target: { elementId?: string; x?: number; y?: number }; button?: 'left' | 'right' }
      const target = parsed.target
      const byElement = target.elementId !== undefined
      const byPoint = target.x !== undefined && target.y !== undefined
      if (byElement === byPoint) {
        throw new Error('click target must name exactly one of elementId or (x, y)')
      }
      const outcome = await actions.perform('click', exec, parsed.basedOn.observationId, parsed.basedOn.windowId, focusFallback =>
        backend.click({
          windowId: parsed.basedOn.windowId,
          ...byElement ? { elementId: target.elementId as string } : { x: target.x as number, y: target.y as number },
          button: parsed.button ?? 'left',
        }, focusFallback, exec.signal))
      return {
        ok: true,
        windowId: outcome.windowId,
        delivered: outcome.delivered,
        process: { before: outcome.processBefore, after: outcome.processAfter },
        ...outcome.detail !== undefined ? { detail: outcome.detail } : {},
      }
    },
  })
}

/**
 * `type` — type text into a value-pattern element. The helper backs up the
 * control text first and restores it when the action fails (config
 * `rollbackEnabled`).
 *
 * @param services - runtime services.
 * @returns the tool definition.
 */
export function typeTool(services: ToolServices) {
  const { config, backend, actions } = services
  return defineTool({
    name: 'type',
    description:
      'Type text into an editable element of an observed desktop window (addressed by elementId from screen_read; the element must expose a value pattern). Requires `basedOn`; fails if the screen changed since that observation. Never steals foreground focus. Requires approval unless the window is allowlisted. On failure the previous control text is restored when rollback is enabled.',
    parameters: {
      ...basedOnParameters,
      elementId: { type: 'string', description: 'Editable element id from screen_read.', required: true as const },
      text: { type: 'string', description: 'The exact text to type (up to 10000 characters).', required: true as const },
    },
    output: {
      schema: actionOutputSchema(true),
      render(_args, value): ContentBlock[] {
        return [{ type: 'text', text: actionLine('type', value as unknown as Parameters<typeof actionLine>[1]) }]
      },
    },
    timeoutMs: config.helperTimeoutMs + 15_000,
    async execute(args, exec) {
      backendGuard(services)
      const parsed = args as { basedOn: { observationId: string; windowId: number }; elementId: string; text: string }
      if (parsed.text.length > 10_000) {
        throw new Error('type text must be at most 10000 characters')
      }
      const outcome = await actions.perform('type', exec, parsed.basedOn.observationId, parsed.basedOn.windowId, focusFallback =>
        backend.type({
          windowId: parsed.basedOn.windowId,
          elementId: parsed.elementId,
          text: parsed.text,
          rollback: config.rollbackEnabled,
        }, focusFallback, exec.signal))
      return {
        ok: true,
        windowId: outcome.windowId,
        delivered: outcome.delivered,
        process: { before: outcome.processBefore, after: outcome.processAfter },
        restored: outcome.restored ?? false,
        ...outcome.detail !== undefined ? { detail: outcome.detail } : {},
      }
    },
  })
}

/**
 * `scroll` — scroll an element (scroll pattern) or the observed window
 * (posted wheel messages). Never steals foreground focus.
 *
 * @param services - runtime services.
 * @returns the tool definition.
 */
export function scrollTool(services: ToolServices) {
  const { config, backend, actions } = services
  return defineTool({
    name: 'scroll',
    description:
      'Scroll an element (by elementId) or the observed window. Requires `basedOn`; fails if the screen changed since that observation. Never steals foreground focus. Requires approval unless the window is allowlisted.',
    parameters: {
      ...basedOnParameters,
      elementId: { type: 'string', description: 'Optional scrollable element id from screen_read; omitted = scroll the window itself.' },
      direction: { type: 'string', enum: ['up', 'down', 'page-up', 'page-down'] as const, description: 'Scroll direction.', required: true as const },
      amount: { type: 'integer', description: 'Number of increments (default 3).' },
    },
    output: {
      schema: actionOutputSchema(false),
      render(_args, value): ContentBlock[] {
        return [{ type: 'text', text: actionLine('scroll', value as unknown as Parameters<typeof actionLine>[1]) }]
      },
    },
    timeoutMs: config.helperTimeoutMs + 15_000,
    async execute(args, exec) {
      backendGuard(services)
      const parsed = args as { basedOn: { observationId: string; windowId: number }; elementId?: string; direction: 'up' | 'down' | 'page-up' | 'page-down'; amount?: number }
      const amount = parsed.amount ?? 3
      if (!Number.isInteger(amount) || amount < 1) {
        throw new Error('scroll amount must be a positive integer')
      }
      const outcome = await actions.perform('scroll', exec, parsed.basedOn.observationId, parsed.basedOn.windowId, focusFallback =>
        backend.scroll({
          windowId: parsed.basedOn.windowId,
          ...parsed.elementId !== undefined ? { elementId: parsed.elementId } : {},
          direction: parsed.direction,
          amount,
        }, focusFallback, exec.signal))
      return {
        ok: true,
        windowId: outcome.windowId,
        delivered: outcome.delivered,
        process: { before: outcome.processBefore, after: outcome.processAfter },
        ...outcome.detail !== undefined ? { detail: outcome.detail } : {},
      }
    },
  })
}

/**
 * `key` — send a key combination to the observed window as posted window
 * messages. Never steals foreground focus; apps that ignore posted input
 * fail with a clear error.
 *
 * @param services - runtime services.
 * @returns the tool definition.
 */
export function keyTool(services: ToolServices) {
  const { config, backend, actions } = services
  return defineTool({
    name: 'key',
    description:
      'Send a key combination (e.g. "Ctrl+S", "Enter", "Alt+F4") to an observed desktop window via posted window messages. Requires `basedOn`; fails if the screen changed since that observation. Never steals foreground focus — applications that ignore posted input will not react; prefer click/type for those. Requires approval unless the window is allowlisted.',
    parameters: {
      ...basedOnParameters,
      keys: { type: 'string', description: 'Key combination, e.g. "Ctrl+S" or "Enter".', required: true as const },
    },
    output: {
      schema: actionOutputSchema(false),
      render(_args, value): ContentBlock[] {
        return [{ type: 'text', text: actionLine('key', value as unknown as Parameters<typeof actionLine>[1]) }]
      },
    },
    timeoutMs: config.helperTimeoutMs + 15_000,
    async execute(args, exec) {
      backendGuard(services)
      const parsed = args as { basedOn: { observationId: string; windowId: number }; keys: string }
      if (parsed.keys.trim() === '') {
        throw new Error('keys must not be empty')
      }
      const outcome = await actions.perform('key', exec, parsed.basedOn.observationId, parsed.basedOn.windowId, focusFallback =>
        backend.key({ windowId: parsed.basedOn.windowId, keys: parsed.keys.trim() }, focusFallback, exec.signal))
      return {
        ok: true,
        windowId: outcome.windowId,
        delivered: outcome.delivered,
        process: { before: outcome.processBefore, after: outcome.processAfter },
        ...outcome.detail !== undefined ? { detail: outcome.detail } : {},
      }
    },
  })
}

/**
 * `app_list` — enumerate running desktop applications and their windows.
 * Read-only: never needs approval.
 *
 * @param services - runtime services.
 * @returns the tool definition.
 */
export function appListTool(services: ToolServices) {
  const { config, backend } = services
  return defineTool({
    name: 'app_list',
    description:
      'List running desktop applications and their visible windows (windowId, title, process id, executable path). Read-only: never needs approval. Use the returned windowIds as screen_shot/screen_read targets.',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        properties: {
          ok: { type: 'boolean', const: true },
          apps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                processId: { type: 'integer' },
                name: { type: 'string' },
                executablePath: { oneOf: [{ type: 'string' }, { type: 'null' }] },
                windows: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      windowId: { type: 'integer' },
                      processId: { oneOf: [{ type: 'integer' }, { type: 'null' }] },
                      title: { type: 'string' },
                      className: { type: 'string' },
                      rect: {
                        type: 'object',
                        properties: {
                          x: { type: 'integer' },
                          y: { type: 'integer' },
                          width: { type: 'integer' },
                          height: { type: 'integer' },
                        },
                        additionalProperties: false,
                      },
                      executablePath: { oneOf: [{ type: 'string' }, { type: 'null' }] },
                      visible: { type: 'boolean' },
                    },
                    additionalProperties: false,
                  },
                },
              },
              additionalProperties: false,
            },
          },
        },
        additionalProperties: false,
      },
      render(_args, value): ContentBlock[] {
        const result = value as unknown as { apps: Array<{ processId: number; name: string; executablePath: string | null; windows: WindowInfo[] }> }
        const lines = [`${result.apps.length} running application(s) with windows:`]
        for (const app of result.apps) {
          lines.push(`- ${app.name} (pid ${app.processId}, ${app.executablePath ?? 'unknown executable'})`)
          for (const window of app.windows) {
            lines.push(`  - [windowId ${window.windowId}] ${JSON.stringify(window.title)} at (${window.rect.x}, ${window.rect.y}) ${window.rect.width}x${window.rect.height}`)
          }
        }
        return [{ type: 'text', text: lines.join('\n') }]
      },
    },
    timeoutMs: config.helperTimeoutMs + 15_000,
    async execute(_args, exec) {
      backendGuard(services)
      const apps = await backend.apps(exec.signal)
      return {
        ok: true,
        apps: apps.map(app => ({
          processId: app.processId,
          name: sanitizeVisible(app.name, config.maxTextLength),
          executablePath: app.executablePath === null ? null : sanitizePath(app.executablePath, config.maxTextLength),
          windows: app.windows.map(window => observedWindowInfo(window, config.maxTextLength)),
        })),
      }
    },
  })
}

/**
 * `app_launch` — launch one application by name or path. Gated by approval
 * (allowlist matching applies against the requested name/path).
 *
 * @param services - runtime services.
 * @returns the tool definition.
 */
export function appLaunchTool(services: ToolServices) {
  const { config, actions } = services
  return defineTool({
    name: 'app_launch',
    description:
      'Launch a desktop application by name (e.g. "notepad") or executable path, with optional arguments. Requires approval unless requireApproval is off or the name/path is allowlisted. Returns the new process identity.',
    parameters: {
      name: { type: 'string', description: 'Application name (resolved through the executable search path) or full path.', required: true as const },
      args: { type: 'array', items: { type: 'string' }, description: 'Optional command-line arguments.' },
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          ok: { type: 'boolean', const: true },
          processId: { type: 'integer' },
          executablePath: { oneOf: [{ type: 'string' }, { type: 'null' }] },
        },
        additionalProperties: false,
      },
      render(_args, value): ContentBlock[] {
        const result = value as unknown as { processId: number; executablePath: string | null }
        return [{ type: 'text', text: `Launched: pid ${result.processId} (${result.executablePath ?? 'unknown executable'}).` }]
      },
    },
    timeoutMs: config.helperTimeoutMs + 15_000,
    async execute(args, exec) {
      backendGuard(services)
      const parsed = args as { name: string; args?: string[] }
      if (parsed.name.trim() === '') {
        throw new Error('app_launch name must not be empty')
      }
      const outcome = await actions.launch(exec, parsed.name.trim(), parsed.args ?? [])
      return {
        ok: true,
        processId: outcome.processId,
        executablePath: outcome.executablePath === null ? null : sanitizePath(outcome.executablePath, config.maxTextLength),
      }
    },
  })
}

/** Every tool definition, in registration order. */
export function allTools(services: ToolServices) {
  return [
    screenShotTool(services),
    screenReadTool(services),
    screenFindTool(services),
    clickTool(services),
    typeTool(services),
    scrollTool(services),
    keyTool(services),
    appListTool(services),
    appLaunchTool(services),
  ]
}
