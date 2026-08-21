# Third-party notices

`dsh-click` bundles no third-party source code. The native helper
(`native/win32/dsh-click-helper.ps1`) and all TypeScript/JavaScript sources in
this repository are original works by the dsh-click contributors, licensed
under Apache-2.0 (see `LICENSE`).

The package depends on the following software. None of it is bundled into the
published tarball; these are install-time dependencies:

| Package | Version range | License | Purpose |
|---|---|---|---|
| [tsdown](https://github.com/rolldown/tsdown) | `^0.22.14` | MIT | Build-time bundling of `lib/` (a regular dependency so the git-install channel's `prepare` script can build) |
| [typescript](https://github.com/microsoft/TypeScript) | `^5.9.0` | Apache-2.0 | Build-time declaration emission (`lib/types/`) |
| [@deepseek-ai/cordis](https://www.npmjs.com/package/@deepseek-ai/cordis) | `^4.0.1` (peer) | See package | The plugin runtime |
| [@deepseek-ai/schemastery](https://www.npmjs.com/package/@deepseek-ai/schemastery) | `^3.18.0` (peer) | See package | Configuration schema |
| `@deepseek-ai/dsh-*` peers | `0.1.0-rc.8` (peer) | See packages | Official harness seams (`dsh-tools`, `dsh-session`, `dsh-subprocess`, `dsh-llm`, `dsh-attachment`, `dsh-agent`, `dsh-user-approval`) |

At runtime the plugin only talks to the harness services listed as
peerDependencies; it performs no network requests of its own.
