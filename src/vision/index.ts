/**
 * Vision seam index: re-exports the OCR and visual-grounding providers and the
 * shared pixel→screen coordinate mapping the `screen_find` tool uses to turn
 * screenshot boxes into clickable screen coordinates.
 *
 * @module dsh-click/vision
 */

import type { Rect } from '../platform/types.ts'

export {
  TesseractOcrProvider,
  UnavailableOcrProvider,
  parseTesseractTsv,
  probeTesseract,
  tesseractArgv,
  type OcrBox,
  type OcrProvider,
  type OcrWord,
} from './ocr.ts'
export {
  UnavailableGroundingProvider,
  type GroundingBox,
  type GroundingTarget,
  type VisualGroundingProvider,
} from './grounding.ts'

/**
 * Map one screenshot box (possibly downscaled by `maxScreenshotSide`) to its
 * screen-space box, centering on the window's screen rect origin.
 * @param rect - the window's screen rectangle.
 * @param imageWidth - screenshot width in pixels.
 * @param imageHeight - screenshot height in pixels.
 * @param box - the screenshot-space box.
 * @returns the screen-space box.
 */
export function screenBoxFor(
  rect: Rect,
  imageWidth: number,
  imageHeight: number,
  box: { x: number; y: number; width: number; height: number },
): { x: number; y: number; width: number; height: number } {
  const scaleX = rect.width > 0 && imageWidth > 0 ? rect.width / imageWidth : 1
  const scaleY = rect.height > 0 && imageHeight > 0 ? rect.height / imageHeight : 1
  return {
    x: rect.x + box.x * scaleX,
    y: rect.y + box.y * scaleY,
    width: box.width * scaleX,
    height: box.height * scaleY,
  }
}

/** Center point of a screen-space box (the coordinate `click` addresses). */
export function centerOf(box: { x: number; y: number; width: number; height: number }): { x: number; y: number } {
  return { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) }
}
