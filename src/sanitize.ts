/**
 * Pure display/audit redaction for everything dsh-click shows to the model or
 * writes to a session log: window titles, executable paths, and free text that
 * may contain credentials. Every function is pure and total on string input;
 * extreme cases are covered by `tests/sanitize.spec.ts`.
 *
 * @module dsh-click/sanitize
 */

/** Control characters replaced by a space (tab) or removed entirely (the rest). */
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/gu

/** Truncation marker appended when a string is cut to `maxLength`. */
const TRUNCATION_MARKER = '…'

/** Credential-shaped `name=value` / `name: value` pairs; values stop at control characters too. */
const SECRET_ASSIGNMENT = /((?:api[_-]?key|token|secret|password|passwd)\s*[=:])\s*[^\s"'<>\u0000-\u001F\u007F]+/giu

/** JSON Web Tokens (three base64url segments separated by dots). */
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\b/gu

/** `Bearer` credentials. */
const BEARER_PATTERN = /(\bbearer\s+)[A-Za-z0-9._~+/=-]{8,}/giu

/**
 * Strip control characters and truncate to `maxLength`.
 *
 * @param text - the raw string.
 * @param maxLength - maximum returned length (including the truncation marker).
 * @returns the sanitized string.
 */
export function sanitizeText(text: string, maxLength: number): string {
  const cleaned = text.replace(CONTROL_CHARACTERS, '').replace(/\t+/gu, ' ')
  if (cleaned.length <= maxLength) return cleaned
  return cleaned.slice(0, Math.max(0, maxLength - TRUNCATION_MARKER.length)) + TRUNCATION_MARKER
}

/**
 * Sanitize a filesystem path for display: control characters removed, and the
 * TAIL (filename side) preserved when truncating, since the head is the part
 * that usually repeats.
 *
 * @param path - the raw path.
 * @param maxLength - maximum returned length (including the truncation marker).
 * @returns the sanitized path.
 */
export function sanitizePath(path: string, maxLength: number): string {
  const cleaned = path.replace(CONTROL_CHARACTERS, '').replace(/\t+/gu, ' ')
  if (cleaned.length <= maxLength) return cleaned
  return TRUNCATION_MARKER + cleaned.slice(cleaned.length - (maxLength - TRUNCATION_MARKER.length))
}

/**
 * Redact credential-shaped fragments from free text before it reaches a log or
 * display surface: `key=`/`key:` assignments, JWTs, and bearer tokens.
 *
 * @param text - the raw text.
 * @returns the redacted text.
 */
export function redactSensitive(text: string): string {
  return text
    .replace(SECRET_ASSIGNMENT, '$1[redacted]')
    .replace(JWT_PATTERN, '[redacted]')
    .replace(BEARER_PATTERN, '$1[redacted]')
}

/**
 * The one entry point for model-visible strings: redact first (secret values
 * stop at control characters), then sanitize (control characters removed,
 * tabs collapsed, length capped).
 *
 * @param text - the raw string.
 * @param maxLength - truncation length.
 * @returns the sanitized, redacted string.
 */
export function sanitizeVisible(text: string, maxLength: number): string {
  return sanitizeText(redactSensitive(text), maxLength)
}
