/**
 * Display/audit redaction: extreme cases for window titles, paths, and
 * credential-shaped text. The sanitizers must stay total — never throw, never
 * return more than the declared length.
 *
 * @module dsh-click/test/sanitize.spec
 */

import { describe, expect, it } from 'vitest'
import { redactSensitive, sanitizePath, sanitizeText, sanitizeVisible } from '../src/sanitize.ts'

describe('sanitizeText', () => {
  it('strips control characters and collapses tabs', () => {
    expect(sanitizeText('a\u0000b\u0007c\td\u001Be\u007Ff', 100)).toBe('abc def')
  })

  it('truncates long titles with a marker and respects the cap exactly', () => {
    const result = sanitizeText('x'.repeat(5_000), 200)
    expect(result).toHaveLength(200)
    expect(result.endsWith('…')).toBe(true)
  })

  it('leaves short text untouched', () => {
    expect(sanitizeText('Untitled - Notepad', 200)).toBe('Untitled - Notepad')
  })
})

describe('sanitizePath', () => {
  it('keeps the tail (filename side) when truncating', () => {
    const path = `C:\\Users\\${'very-long-segment\\'.repeat(50)}notes.txt`
    const result = sanitizePath(path, 60)
    expect(result).toHaveLength(60)
    expect(result.startsWith('…')).toBe(true)
    expect(result.endsWith('notes.txt')).toBe(true)
  })

  it('strips control characters from paths', () => {
    expect(sanitizePath('C:\\Apps\u0001\\demo.exe', 100)).toBe('C:\\Apps\\demo.exe')
  })
})

describe('redactSensitive', () => {
  it('redacts key=value and key: value assignments', () => {
    expect(redactSensitive('api_key=sk-live-12345 and token: abc.def.ghi')).toBe('api_key=[redacted] and token:[redacted]')
  })

  it('redacts JWTs', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.somesignaturevalue'
    expect(redactSensitive(`auth ${jwt} done`)).toBe('auth [redacted] done')
  })

  it('redacts bearer tokens', () => {
    expect(redactSensitive('Authorization: Bearer AbCdEf1234567890')).toBe('Authorization: Bearer [redacted]')
  })

  it('leaves ordinary text alone', () => {
    expect(redactSensitive('The window title is Fine.')).toBe('The window title is Fine.')
  })
})

describe('sanitizeVisible', () => {
  it('sanitizes then redacts', () => {
    expect(sanitizeVisible('api_key=abc\u0000def', 200)).toBe('api_key=[redacted]def')
  })
})
