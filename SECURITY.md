# Security policy

## Reporting a vulnerability

Please **do not** open a public issue for security vulnerabilities.

Report privately through GitHub's private vulnerability reporting:

**https://github.com/PerryLink/dsh-click/security/advisories/new**

That flow keeps the report confidential while we triage, and it is the channel we watch first.

## Before you report

- **Redact sensitive data** from any logs, screenshots, window titles, or session excerpts you attach: tokens, API keys, secrets, Authorization/request headers, personal paths, and account identifiers. Trimmed accessibility trees and stack traces are usually enough.
- Include, when possible: the plugin version, the harness (`dsh`) version, Node and OS versions, and the minimal steps to reproduce.

## What to expect

- **Acknowledgment**: within 5 business days.
- **Triage**: within 10 business days we confirm the issue and assess severity, or ask for more details.
- **Fix**: security fixes are prepared in a private fork, released as a patch version, and announced in the release notes.

## Disclosure and credit

- We follow coordinated disclosure: a public advisory (and CVE request where appropriate) is published once a fix ships.
- Reporters are credited in the advisory unless they ask to remain anonymous. There is no bug bounty program at this time.

## Scope

This plugin controls native desktop windows from inside the harness: it observes windows (screenshot, accessibility tree) and performs window-scoped actions (click/type/scroll/key/launch) gated by approval. Its own guarantees are:

- Mutating actions require a fresh observation and approval (or an explicit window allowlist), and verify the target process identity before and after acting.
- Actions never bring a window to the foreground by default (`focusFallback: 'never'`).
- Everything shown to the model or written to the session log is sanitized (secrets redacted, control characters stripped, length-capped).
- The plugin makes no network requests and stores no credentials; API keys or tokens only ever appear if the model itself passes them through a tool argument, and the audit trail redacts credential-shaped values.

Vulnerabilities in the harness itself should be reported to the official harness maintainers instead.
