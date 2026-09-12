/**
 * Version-consistency tripwire: the plugin version rides the helper-process
 * protocol handshake, so it must track the package version or released
 * helpers report a stale plugin. Bumping `package.json` without touching
 * `src/version.ts` fails this test (and `scripts/release.mjs` bumps both).
 *
 * @module dsh-click/test/version.spec
 */

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { VERSION } from '../src/version.ts'

/** Read the package manifest next to this source tree. */
function packageVersion(): string {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }
  return pkg.version
}

describe('helper protocol version', () => {
  it('matches the package version', () => {
    expect(VERSION).toBe(packageVersion())
  })

  it('is a semver x.y.z', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/u)
  })
})
