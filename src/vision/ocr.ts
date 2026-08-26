/**
 * Optical character recognition seam for windows without a UIA tree. OCR is
 * optional and probed at mount: the `tesseract` provider is used only when the
 * binary resolves through the subprocess service, otherwise an unavailable
 * provider fails closed with a model-readable reason. Recognized words carry
 * their pixel boxes, which `screen_find` maps to screen coordinates for the
 * coordinate-based `click` path.
 *
 * @module dsh-click/vision/ocr
 */

import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { SubprocessRuntime } from '@deepseek-ai/dsh-subprocess'
import { DshClickError } from '../platform/types.ts'
import { sanitizeText } from '../sanitize.ts'

/** One OCR word box, in screenshot pixel coordinates. */
export interface OcrBox {
  x: number
  y: number
  width: number
  height: number
}

/** One recognized word plus its box and confidence. */
export interface OcrWord {
  text: string
  box: OcrBox
  /** 0..100 tesseract confidence, or 0 when unknown. */
  confidence: number
}

/** One OCR provider (probed at mount). */
export interface OcrProvider {
  /** Stable provider id. */
  readonly id: string
  /** Whether the provider can run. */
  readonly available: boolean
  /** Why the provider is unavailable, when it is. */
  readonly unavailableReason?: string
  /** Recognize text in one PNG screenshot. */
  recognize(pngBase64: string, signal?: AbortSignal): Promise<OcrWord[]>
}

/** Bytes cap for one tesseract TSV stdout. */
const OCR_STDOUT_BYTES = 16 * 1024 * 1024

/**
 * Build the tesseract command line: write words as TSV to stdout.
 * @param command - tesseract executable.
 * @param imagePath - absolute PNG path.
 * @param language - tesseract language tag.
 * @returns the argv (argv[0] is the executable).
 */
export function tesseractArgv(command: string, imagePath: string, language: string): readonly string[] {
  return [command, imagePath, 'stdout', '-l', language, 'tsv']
}

/**
 * Parse tesseract TSV output into word boxes. Non-word rows, empty text, and
 * malformed numeric fields are skipped; a hostile or truncated stdout cannot
 * produce bogus coordinates.
 * @param tsv - tesseract TSV text from stdout.
 * @returns the recognized words.
 */
export function parseTesseractTsv(tsv: string): OcrWord[] {
  const words: OcrWord[] = []
  for (const line of tsv.split(/\r?\n/u)) {
    if (line === '' || line.startsWith('level')) continue
    const columns = line.split('\t')
    if (columns.length < 12 || columns[0] !== '5') continue
    const left = Number(columns[6])
    const top = Number(columns[7])
    const width = Number(columns[8])
    const height = Number(columns[9])
    const confidence = Number(columns[10])
    const text = columns[11] ?? ''
    if (text.trim() === '') continue
    if (!Number.isFinite(left) || !Number.isFinite(top) || !Number.isFinite(width) || !Number.isFinite(height)) continue
    words.push({
      text: text.trim(),
      box: { x: left, y: top, width, height },
      confidence: Number.isFinite(confidence) ? confidence : 0,
    })
  }
  return words
}

/** A provider that cannot run: `recognize` fails closed with the given reason. */
export class UnavailableOcrProvider implements OcrProvider {
  readonly available = false

  /** @param id - provider id. @param reason - model-readable unavailability reason. */
  constructor(readonly id: string, readonly reason: string) {}

  get unavailableReason(): string {
    return this.reason
  }

  recognize(_pngBase64: string, _signal?: AbortSignal): Promise<OcrWord[]> {
    return Promise.reject(new DshClickError(`OCR unavailable: ${this.reason}`, 'OCR_UNAVAILABLE'))
  }
}

/** The tesseract OCR provider over `ctx.subprocess`. */
export class TesseractOcrProvider implements OcrProvider {
  readonly id = 'tesseract'
  readonly available = true

  /**
   * @param subprocess - the subprocess service that runs tesseract.
   * @param command - tesseract executable name.
   * @param language - tesseract language tag.
   */
  constructor(
    private readonly subprocess: SubprocessRuntime,
    private readonly command: string,
    private readonly language: string,
  ) {}

  async recognize(pngBase64: string, signal?: AbortSignal): Promise<OcrWord[]> {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-click-ocr-'))
    const imagePath = join(dir, 'shot.png')
    try {
      await writeFile(imagePath, Buffer.from(pngBase64, 'base64'))
      const handle = this.subprocess.spawn({
        argv: tesseractArgv(this.command, imagePath, this.language),
        cwd: tmpdir(),
        stdio: {
          stdin: 'ignore',
          stdout: { maxBytes: OCR_STDOUT_BYTES },
          stderr: { maxBytes: 64 * 1024 },
        },
        graceMs: 5_000,
        ...(signal === undefined ? {} : { signal }),
      })
      const outcome = await handle.done
      const stdout = handle.collected.stdout?.readFrom(0).text ?? ''
      const stderr = handle.collected.stderr?.readFrom(0).text ?? ''
      if (outcome.exitCode !== 0) {
        throw new DshClickError(`tesseract exited ${String(outcome.exitCode)}: ${sanitizeText(stderr, 500)}`, 'OCR_FAILED')
      }
      return parseTesseractTsv(stdout)
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {})
    }
  }
}

/**
 * Probe tesseract through the subprocess service and return a provider.
 * A missing binary degrades to an unavailable provider (fail closed), never a
 * crash, so the zero-dependency desktop path keeps working.
 *
 * @param subprocess - the subprocess service.
 * @param command - tesseract executable name.
 * @param language - tesseract language tag.
 * @returns the probed OCR provider.
 */
export async function probeTesseract(subprocess: SubprocessRuntime, command: string, language: string): Promise<OcrProvider> {
  try {
    await subprocess.resolveExecutable(command)
    return new TesseractOcrProvider(subprocess, command, language)
  } catch {
    return new UnavailableOcrProvider('tesseract', `tesseract (${command}) is not installed`)
  }
}
