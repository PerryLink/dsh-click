# Windows helper smoke checklist (0.3.24+)

Run on Windows 10/11 with Windows PowerShell 5.1 and a real desktop session.

## Setup

1. Install `dsh-click@0.3.24` in a disposable DSH profile.
2. Open Notepad and a second window (e.g. Explorer) so focus changes are testable.
3. Keep the DSH session visible; do not use a headless/RDP-disconnected session.

## Cases

| # | Action | Expected |
|---|---|---|
| 1 | `type` `补丁测试 patch OK：中文与 English 123 混排` into Notepad | Text appears, including CJK and full-width punctuation; the title shows unsaved. |
| 2 | `key` `ctrl+s` in Notepad | Save dialog opens; no `op_Addition` / key-map error. |
| 3 | `click` an element by `elementId` in a UIA-capable app | The element is invoked; no `Int32[]` conversion error. |
| 4 | Focus Explorer, then `type` into a background Notepad window | Notepad is brought to the foreground and receives the text. |
| 5 | `key` an accelerator in a background window | The target window is focused first; the shortcut applies to it. |
| 6 | Type into an app that ignores posted `WM_CHAR` (classic Notepad, some Electron shells) | Text still appears through `SendInput`; it does not report success with no text. |

## Evidence to attach to a bug report

- dsh-click version and DSH host version.
- Windows build, PowerShell version, target app/version.
- The exact tool call and JSON result (redact personal data).
- Whether the helper reported `uia`, `posted`, or `none`; the real mechanism is in the detail string.
