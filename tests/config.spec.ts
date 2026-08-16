/**
 * Config contract: the Schemastery schema fails loud on invalid values, and
 * `resolveConfig` re-judges every default and bound for programmatic
 * construction that bypasses the Loader.
 *
 * @module dsh-click/test/config.spec
 */

import { describe, expect, it } from 'vitest'
import { Config, resolveConfig } from '../src/config.ts'

describe('Config schema', () => {
  it('applies every default on an empty input', () => {
    const resolved = Config({})
    expect(resolved.requireApproval).toBe(true)
    expect(resolved.autoApproveWindows).toEqual([])
    expect(resolved.focusFallback).toBe('never')
    expect(resolved.imageMode).toBe('auto')
    expect(resolved.helperTimeoutMs).toBe(30_000)
    expect(resolved.maxHelperOutputBytes).toBe(24 * 1024 * 1024)
    expect(resolved.maxScreenshotSide).toBe(2560)
    expect(resolved.staleCheckPixels).toBe(true)
    expect(resolved.maxObservationAgeMs).toBe(30_000)
    expect(resolved.maxCachedObservations).toBe(8)
    expect(resolved.maxElements).toBe(500)
    expect(resolved.maxTreeDepth).toBe(32)
    expect(resolved.maxTextLength).toBe(200)
    expect(resolved.rollbackEnabled).toBe(true)
  })

  it('rejects a helper timeout above the ceiling', () => {
    expect(() => Config({ helperTimeoutMs: 999_999_999 })).toThrow()
  })

  it('rejects an unknown enum member', () => {
    expect(() => Config({ focusFallback: 'sometimes' as 'never' })).toThrow()
  })
})

describe('resolveConfig', () => {
  it('compiles allowlist regexes', () => {
    const resolved = resolveConfig({ autoApproveWindows: ['^Notepad'] })
    expect(resolved.autoApproveMatchers).toHaveLength(1)
    expect(resolved.autoApproveMatchers[0]?.test('Notepad — notes.txt')).toBe(true)
  })

  it('fails loud on an invalid allowlist regex', () => {
    expect(() => resolveConfig({ autoApproveWindows: ['[unclosed'] })).toThrow(/autoApproveWindows/u)
  })

  it('rejects out-of-bounds values instead of silently clamping', () => {
    expect(() => resolveConfig({ maxObservationAgeMs: 10 })).toThrow()
    expect(() => resolveConfig({ maxElements: 99_999 })).toThrow()
    expect(() => resolveConfig({ maxTextLength: 3 })).toThrow()
    expect(() => resolveConfig({ maxScreenshotSide: 100 })).toThrow()
  })

  it('rejects non-boolean flags', () => {
    expect(() => resolveConfig({ requireApproval: 'yes' as unknown as boolean })).toThrow()
    expect(() => resolveConfig({ staleCheckPixels: 1 as unknown as boolean })).toThrow()
  })

  it('freezes the resolved config', () => {
    const resolved = resolveConfig({})
    expect(Object.isFrozen(resolved)).toBe(true)
    expect(Object.isFrozen(resolved.autoApproveMatchers)).toBe(true)
  })
})
