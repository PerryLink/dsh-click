/**
 * The plugin version, hardcoded on purpose: it rides the helper-process
 * protocol handshake, so it must track `package.json` or released helpers
 * report a stale plugin. Bumping `package.json` without touching this file
 * fails `tests/version.spec.ts`, and `scripts/release.mjs` bumps both.
 *
 * @module dsh-click/version
 */

/** Plugin version advertised in the helper-protocol handshake. */
export const VERSION = '0.3.3'

/** The helper protocol revision; bump only on incompatible wire changes. */
export const HELPER_PROTOCOL_VERSION = 1
