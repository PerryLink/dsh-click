/**
 * Visual grounding seam: turning a screenshot plus a natural-language prompt
 * into labeled bounding boxes. Kept as an independent provider so a vision
 * model (or an external grounding service) can plug in later without touching
 * the desktop backend or the tool surface. The default is unavailable — the
 * OCR path (`screen_find`) already yields text targets, and a grounding
 * provider is optional and probed through the `dsh-click/grounding` seam.
 *
 * @module dsh-click/vision/grounding
 */

import { DshClickError } from '../platform/types.ts'

/** One grounded box in screenshot pixel coordinates. */
export interface GroundingBox {
  x: number
  y: number
  width: number
  height: number
}

/** One grounded target: a label plus its box and confidence. */
export interface GroundingTarget {
  label: string
  box: GroundingBox
  /** 0..1 confidence. */
  confidence: number
}

/** One visual grounding provider. */
export interface VisualGroundingProvider {
  /** Stable provider id. */
  readonly id: string
  /** Whether the provider can run. */
  readonly available: boolean
  /** Why the provider is unavailable, when it is. */
  readonly unavailableReason?: string
  /** Ground one screenshot for the given prompt. */
  ground(pngBase64: string, width: number, height: number, prompt: string, signal?: AbortSignal): Promise<GroundingTarget[]>
}

/** A provider that cannot run: `ground` fails closed with the given reason. */
export class UnavailableGroundingProvider implements VisualGroundingProvider {
  readonly available = false

  /** @param id - provider id. @param reason - model-readable unavailability reason. */
  constructor(readonly id = 'unavailable', readonly reason = 'no visual grounding provider configured') {}

  get unavailableReason(): string {
    return this.reason
  }

  ground(_pngBase64: string, _width: number, _height: number, _prompt: string, _signal?: AbortSignal): Promise<GroundingTarget[]> {
    return Promise.reject(new DshClickError(`visual grounding unavailable: ${this.reason}`, 'GROUNDING_UNAVAILABLE'))
  }
}
