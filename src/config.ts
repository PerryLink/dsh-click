/**
 * Plugin configuration and its explicit resolve step. `resolveConfig` re-judges
 * every default and bound so programmatic construction that bypasses
 * Schemastery normalization still fails loud instead of running with hidden
 * defaults (the explicit-resolve contract).
 *
 * @module dsh-click/config
 */

import z from '@deepseek-ai/schemastery'

/** How `screen_shot` decides between an image block and a text description. */
export type ImageMode = 'auto' | 'text'

/** Whether mutating actions may ever bring the target window to the foreground. */
export type FocusFallback = 'never' | 'allow'

/** Default per-helper-call timeout in milliseconds. */
export const DEFAULT_HELPER_TIMEOUT_MS = 30_000

/** Ceiling for one helper call: a screenshot of a large desktop can take a while. */
export const MAX_HELPER_TIMEOUT_MS = 300_000

/** Default cap on one helper response in bytes (PNG screenshots are base64-heavy). */
export const DEFAULT_MAX_HELPER_OUTPUT_BYTES = 24 * 1024 * 1024

/** Ceiling on one helper response. */
export const MAX_HELPER_OUTPUT_BYTES = 64 * 1024 * 1024

/** Default longest side of a captured screenshot in pixels (larger captures downscale). */
export const DEFAULT_MAX_SCREENSHOT_SIDE = 2560

/** Bounds for the screenshot side: too small reads nothing, too large is unusable. */
export const MIN_SCREENSHOT_SIDE = 320
export const MAX_SCREENSHOT_SIDE = 7680

/** Default maximum age of an observation that an action may still base on. */
export const DEFAULT_MAX_OBSERVATION_AGE_MS = 30_000

/** Bounds for the observation age. */
export const MIN_OBSERVATION_AGE_MS = 1_000
export const MAX_OBSERVATION_AGE_MS = 600_000

/** Default cap on cached observations (LRU; actions address them by id). */
export const DEFAULT_MAX_CACHED_OBSERVATIONS = 8

/** Ceiling on cached observations. */
export const MAX_CACHED_OBSERVATIONS = 64

/** Default cap on elements the accessibility walk returns per observation. */
export const DEFAULT_MAX_ELEMENTS = 500

/** Ceiling on the element cap. */
export const MAX_ELEMENTS = 2_000

/** Default maximum depth of the accessibility tree walk. */
export const DEFAULT_MAX_TREE_DEPTH = 32

/** Ceiling on the tree depth. */
export const MAX_TREE_DEPTH = 64

/** Default truncation length for sanitized model-visible strings. */
export const DEFAULT_MAX_TEXT_LENGTH = 200

/** Ceiling on the sanitization truncation length. */
export const MAX_TEXT_LENGTH = 10_000

/** Default tesseract executable for the optional OCR path. */
export const DEFAULT_OCR_COMMAND = 'tesseract'

/** Default OCR language (tesseract language data). */
export const DEFAULT_OCR_LANGUAGE = 'eng'

/** Optical character recognition (optional; probed at mount). */
export interface OcrConfig {
  /** Enable OCR-based text finding when a window has no UIA tree (default true). */
  enabled?: boolean
  /** tesseract executable name (default "tesseract"). */
  command?: string
  /** tesseract language tag (default "eng"). */
  language?: string
}

/** Configuration for the dsh-click desktop-control tools. */
export interface Config {
  /** Gate every mutating action (click/type/scroll/key/app_launch) behind approval (default true). */
  requireApproval?: boolean
  /** Window title or executable-path regexes that skip the approval ask (still audited; default []). */
  autoApproveWindows?: string[]
  /**
   * Whether dsh-click session audit events (`dsh-click/observed`/`dsh-click/action`)
   * are appended to the session log (default true). Set false when the harness
   * session reader does not recognize these event types (e.g. DeepSeek Harness
   * rc.6/rc.7 static event whitelist without a plugin registration surface):
   * a log containing them then refuses resume with
   * "event type ... unknown to this harness and not marked ignorable".
   */
  auditSessionEvents?: boolean
  /** Whether mutating actions may bring the target window to the foreground as a fallback (default 'never'). */
  focusFallback?: FocusFallback
  /** How `screen_shot` renders: image block for vision models, text otherwise (default 'auto'). */
  imageMode?: ImageMode
  /** Per-helper-call timeout in milliseconds (default 30000). */
  helperTimeoutMs?: number
  /** Cap on one helper response in bytes (default 25165824). */
  maxHelperOutputBytes?: number
  /** Longest side of a captured screenshot in pixels (default 2560). */
  maxScreenshotSide?: number
  /** Compare a fresh pixel hash before every action (default true; the stale-state boundary). */
  staleCheckPixels?: boolean
  /** Maximum age in ms of an observation that an action may still base on (default 30000). */
  maxObservationAgeMs?: number
  /** Cap on cached observations (default 8). */
  maxCachedObservations?: number
  /** Cap on elements the accessibility walk returns (default 500). */
  maxElements?: number
  /** Maximum depth of the accessibility tree walk (default 32). */
  maxTreeDepth?: number
  /** Truncation length for sanitized model-visible strings (default 200). */
  maxTextLength?: number
  /** Back up and restore control text when `type` fails (default true). */
  rollbackEnabled?: boolean
  /** Optical character recognition (optional; probed at mount). */
  ocr?: OcrConfig
}

/** Fully resolved configuration captured at plugin load. */
export interface ResolvedConfig {
  /** Whether mutating actions require approval. */
  requireApproval: boolean
  /** Compiled allowlist matchers (window title or executable path). */
  autoApproveMatchers: ReadonlyArray<RegExp>
  /** Whether session audit events are appended to the session log. */
  auditSessionEvents: boolean
  /** Whether focus fallback is permitted. */
  focusFallback: FocusFallback
  /** Screenshot render mode. */
  imageMode: ImageMode
  /** Per-helper-call timeout in milliseconds. */
  helperTimeoutMs: number
  /** Cap on one helper response in bytes. */
  maxHelperOutputBytes: number
  /** Longest screenshot side in pixels. */
  maxScreenshotSide: number
  /** Whether the pixel-level stale check runs. */
  staleCheckPixels: boolean
  /** Maximum observation age in milliseconds. */
  maxObservationAgeMs: number
  /** Cap on cached observations. */
  maxCachedObservations: number
  /** Cap on elements per observation. */
  maxElements: number
  /** Maximum tree-walk depth. */
  maxTreeDepth: number
  /** Truncation length for sanitized strings. */
  maxTextLength: number
  /** Whether `type` backs up and restores control text on failure. */
  rollbackEnabled: boolean
  /** OCR configuration (probed at mount). */
  ocr: { enabled: boolean; command: string; language: string }
}

/** Schemastery schema for loader-validated configuration. */
export const Config: z<Config> = z.object({
  requireApproval: z.boolean().default(true),
  autoApproveWindows: z.array(z.string()).default([]),
  auditSessionEvents: z.boolean().default(true),
  focusFallback: z.union(['never', 'allow'] as const).default('never'),
  imageMode: z.union(['auto', 'text'] as const).default('auto'),
  helperTimeoutMs: z.number().min(1).max(MAX_HELPER_TIMEOUT_MS).default(DEFAULT_HELPER_TIMEOUT_MS),
  maxHelperOutputBytes: z.number().min(1_024).max(MAX_HELPER_OUTPUT_BYTES).default(DEFAULT_MAX_HELPER_OUTPUT_BYTES),
  maxScreenshotSide: z.number().min(MIN_SCREENSHOT_SIDE).max(MAX_SCREENSHOT_SIDE).default(DEFAULT_MAX_SCREENSHOT_SIDE),
  staleCheckPixels: z.boolean().default(true),
  maxObservationAgeMs: z.number().min(MIN_OBSERVATION_AGE_MS).max(MAX_OBSERVATION_AGE_MS).default(DEFAULT_MAX_OBSERVATION_AGE_MS),
  maxCachedObservations: z.number().min(1).max(MAX_CACHED_OBSERVATIONS).default(DEFAULT_MAX_CACHED_OBSERVATIONS),
  maxElements: z.number().min(1).max(MAX_ELEMENTS).default(DEFAULT_MAX_ELEMENTS),
  maxTreeDepth: z.number().min(1).max(MAX_TREE_DEPTH).default(DEFAULT_MAX_TREE_DEPTH),
  maxTextLength: z.number().min(16).max(MAX_TEXT_LENGTH).default(DEFAULT_MAX_TEXT_LENGTH),
  rollbackEnabled: z.boolean().default(true),
  ocr: z.object({
    enabled: z.boolean().default(true),
    command: z.string().min(1).max(256).default(DEFAULT_OCR_COMMAND),
    language: z.string().min(1).max(32).default(DEFAULT_OCR_LANGUAGE),
  }),
})

/** Throw the standard fail-loud config error for one invalid field. */
function invalid(field: string, detail: string): never {
  throw new Error(`dsh-click: config.${field} ${detail}`)
}

/** Compile one allowlist pattern; an invalid regex fails at load, not at match time. */
function compileMatcher(source: string, index: number): RegExp {
  try {
    return new RegExp(source, 'iu')
  } catch {
    invalid('autoApproveWindows', `entry ${index} (${JSON.stringify(source)}) is not a valid regular expression`)
  }
}

/**
 * Resolve raw config to the runtime policy, re-validating defaults and bounds.
 *
 * @param config - raw loader config; `undefined` for a bare row.
 * @returns the frozen resolved config.
 */
export function resolveConfig(config: Config | undefined): ResolvedConfig {
  const requireApproval = config?.requireApproval ?? true
  if (typeof requireApproval !== 'boolean') invalid('requireApproval', 'must be a boolean')

  const autoApproveMatchers = (config?.autoApproveWindows ?? []).map(compileMatcher)
  const auditSessionEvents = config?.auditSessionEvents ?? true
  if (typeof auditSessionEvents !== 'boolean') invalid('auditSessionEvents', 'must be a boolean')

  const focusFallback = config?.focusFallback ?? 'never'
  if (focusFallback !== 'never' && focusFallback !== 'allow') invalid('focusFallback', 'must be "never" or "allow"')

  const imageMode = config?.imageMode ?? 'auto'
  if (imageMode !== 'auto' && imageMode !== 'text') invalid('imageMode', 'must be "auto" or "text"')

  const helperTimeoutMs = config?.helperTimeoutMs ?? DEFAULT_HELPER_TIMEOUT_MS
  if (!Number.isFinite(helperTimeoutMs) || helperTimeoutMs < 1 || helperTimeoutMs > MAX_HELPER_TIMEOUT_MS) {
    invalid('helperTimeoutMs', `must be a finite number between 1 and ${MAX_HELPER_TIMEOUT_MS}`)
  }

  const maxHelperOutputBytes = config?.maxHelperOutputBytes ?? DEFAULT_MAX_HELPER_OUTPUT_BYTES
  if (!Number.isInteger(maxHelperOutputBytes) || maxHelperOutputBytes < 1_024 || maxHelperOutputBytes > MAX_HELPER_OUTPUT_BYTES) {
    invalid('maxHelperOutputBytes', `must be an integer between 1024 and ${MAX_HELPER_OUTPUT_BYTES}`)
  }

  const maxScreenshotSide = config?.maxScreenshotSide ?? DEFAULT_MAX_SCREENSHOT_SIDE
  if (!Number.isInteger(maxScreenshotSide) || maxScreenshotSide < MIN_SCREENSHOT_SIDE || maxScreenshotSide > MAX_SCREENSHOT_SIDE) {
    invalid('maxScreenshotSide', `must be an integer between ${MIN_SCREENSHOT_SIDE} and ${MAX_SCREENSHOT_SIDE}`)
  }

  const staleCheckPixels = config?.staleCheckPixels ?? true
  if (typeof staleCheckPixels !== 'boolean') invalid('staleCheckPixels', 'must be a boolean')

  const maxObservationAgeMs = config?.maxObservationAgeMs ?? DEFAULT_MAX_OBSERVATION_AGE_MS
  if (!Number.isFinite(maxObservationAgeMs) || maxObservationAgeMs < MIN_OBSERVATION_AGE_MS || maxObservationAgeMs > MAX_OBSERVATION_AGE_MS) {
    invalid('maxObservationAgeMs', `must be a finite number between ${MIN_OBSERVATION_AGE_MS} and ${MAX_OBSERVATION_AGE_MS}`)
  }

  const maxCachedObservations = config?.maxCachedObservations ?? DEFAULT_MAX_CACHED_OBSERVATIONS
  if (!Number.isInteger(maxCachedObservations) || maxCachedObservations < 1 || maxCachedObservations > MAX_CACHED_OBSERVATIONS) {
    invalid('maxCachedObservations', `must be an integer between 1 and ${MAX_CACHED_OBSERVATIONS}`)
  }

  const maxElements = config?.maxElements ?? DEFAULT_MAX_ELEMENTS
  if (!Number.isInteger(maxElements) || maxElements < 1 || maxElements > MAX_ELEMENTS) {
    invalid('maxElements', `must be an integer between 1 and ${MAX_ELEMENTS}`)
  }

  const maxTreeDepth = config?.maxTreeDepth ?? DEFAULT_MAX_TREE_DEPTH
  if (!Number.isInteger(maxTreeDepth) || maxTreeDepth < 1 || maxTreeDepth > MAX_TREE_DEPTH) {
    invalid('maxTreeDepth', `must be an integer between 1 and ${MAX_TREE_DEPTH}`)
  }

  const maxTextLength = config?.maxTextLength ?? DEFAULT_MAX_TEXT_LENGTH
  if (!Number.isInteger(maxTextLength) || maxTextLength < 16 || maxTextLength > MAX_TEXT_LENGTH) {
    invalid('maxTextLength', `must be an integer between 16 and ${MAX_TEXT_LENGTH}`)
  }

  const rollbackEnabled = config?.rollbackEnabled ?? true
  if (typeof rollbackEnabled !== 'boolean') invalid('rollbackEnabled', 'must be a boolean')

  const ocrEnabled = config?.ocr?.enabled ?? true
  if (typeof ocrEnabled !== 'boolean') invalid('ocr.enabled', 'must be a boolean')
  const ocrCommand = config?.ocr?.command ?? DEFAULT_OCR_COMMAND
  if (typeof ocrCommand !== 'string' || ocrCommand.length === 0 || ocrCommand.length > 256) invalid('ocr.command', 'must be a non-empty string of at most 256 characters')
  const ocrLanguage = config?.ocr?.language ?? DEFAULT_OCR_LANGUAGE
  if (typeof ocrLanguage !== 'string' || ocrLanguage.length === 0 || ocrLanguage.length > 32) invalid('ocr.language', 'must be a non-empty string of at most 32 characters')

  return Object.freeze({
    requireApproval,
    autoApproveMatchers: Object.freeze(autoApproveMatchers),
    auditSessionEvents,
    focusFallback,
    imageMode,
    helperTimeoutMs,
    maxHelperOutputBytes,
    maxScreenshotSide,
    staleCheckPixels,
    maxObservationAgeMs,
    maxCachedObservations,
    maxElements,
    maxTreeDepth,
    maxTextLength,
    rollbackEnabled,
    ocr: Object.freeze({ enabled: ocrEnabled, command: ocrCommand, language: ocrLanguage }),
  })
}
