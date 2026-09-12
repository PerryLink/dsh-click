// Verify the built artifacts after `pnpm run build`: syntax-check the host
// bundle, import it under plain Node, and assert the shipped files that a
// Windows action path needs. Guards against TypeScript-only syntax leaking
// into shipped output and against a tarball missing the native helper.
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

const required = [
  'lib/index.js',
  'lib/types/index.d.ts',
  'native/win32/dsh-click-helper.ps1',
  'cordis.patch.yml',
]
for (const rel of required) {
  if (!existsSync(path.join(root, rel))) throw new Error(`missing artifact: ${rel}`)
}

// 1. Syntax-check the host bundle (plain Node parse; no execution).
execFileSync(process.execPath, ['--check', path.join(root, 'lib/index.js')], { stdio: 'inherit' })

// 2. The ESM host face must import under plain Node (no tsx, no checkout paths).
const index = await import(pathToFileURL(path.join(root, 'lib/index.js')).href)
if (typeof index.apply !== 'function' || index.name !== 'dsh-click') {
  throw new Error('lib/index.js exports an unexpected plugin face')
}

// 3. The native helper must be the checked-in source the runner addresses
// (the `Write-DshResponse` envelope function is unique to this helper).
const helper = (await import('node:fs')).readFileSync(path.join(root, 'native/win32/dsh-click-helper.ps1'), 'utf8')
if (!helper.includes('Write-DshResponse')) {
  throw new Error('native/win32/dsh-click-helper.ps1 is not the dsh-click helper')
}

console.log('artifacts OK: syntax + ESM import + native helper present')
