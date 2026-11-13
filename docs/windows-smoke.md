# Windows helper smoke checklist (0.3.29+)

Run on Windows 10/11 with Windows PowerShell 5.1 and a real desktop session.

## Setup

1. Install `dsh-click@0.3.29` in a disposable DSH profile.
2. Open Notepad and a second window (e.g. Explorer) so focus and occlusion are testable.
3. Keep the DSH session visible; do not use a headless/RDP-disconnected session.
4. On a HiDPI display, confirm the scaling (e.g. 200%) before comparing pixel values.

## Input cases

| # | Action | Expected |
|---|---|---|
| 1 | `type` `补丁测试 patch OK：中文与 English 123 混排` into Notepad | Text appears, including CJK and full-width punctuation; the title shows unsaved. |
| 2 | `key` `ctrl+s` in Notepad | Save dialog opens; no `op_Addition` / key-map error. |
| 3 | `click` an element by `elementId` in a UIA-capable app | The element is invoked; no `Int32[]` conversion error. |
| 4 | Focus Explorer, then `type` into a background Notepad window | Notepad is brought to the foreground and receives the text. |
| 5 | `key` an accelerator in a background window | The target window is focused first; the shortcut applies to it. |
| 6 | Type into an app that ignores posted `WM_CHAR` (classic Notepad, some Electron shells) | Text still appears through `SendInput`; it does not report success with no text. |

## Screen cases

| # | Action | Expected |
|---|---|---|
| 7 | `screen_shot` with no target | `snapshot.windowId` is `0`, title is `"primary screen"`, `scope` is `"primary"` — the foreground window is never substituted. |
| 8 | `screen_shot` with `scope: "virtual"` on a multi-monitor desk | `scope` is `"virtual"` and `snapshot.rect` is the virtual-screen rectangle (may have a negative origin). Experimental: record the values rather than assuming they are correct. |
| 9 | `screen_shot` a maximized window on a 200% display | `width`/`height` match the requested longest side (downsampled), while `snapshot.rect` matches `GetWindowRect` physical pixels (e.g. `3866x2090`). `captureMethod` is `"printwindow-fullcontent"`. |
| 10 | Cover the target window with another maximized window, then `screen_shot` it | The image shows the target, not the occluder. `captureMethod` stays `"printwindow-fullcontent"`; repeated captures of a static window are byte-identical. |
| 11 | Repeat #10 without maximizing the occluder (partial overlap) | Same: the target content is captured, occlusion changes nothing. |
| 12 | `screen_read` the target from #10 | `snapshot.rect` and every element rectangle are in the same physical-pixel space as `app_list`; OCR/`screen_find` targets convert through `snapshot.rect`/bitmap size and click the right place. |
| 13 | Minimize a window, then `app_list` | The window is listed with `minimized: true` and no `rect` (never `-32000,-32000`). |
| 14 | Minimize a window, then `screen_shot` / `screen_read` it | Both fail with `WINDOW_MINIMIZED`; restore the window and the same call succeeds. |
| 15 | Compare `screen_shot` with `captureMethod: "copyfromscreen"` | This is the last-resort path (the window refused PrintWindow or returned a blank frame twice); it is only trustworthy while the window is unobscured. |

## Helper diagnostics

The read-only `metrics` op reports the DPI awareness, screen and virtual-screen metrics, and the monitor count:

```powershell
'{"op":"metrics"}' | & powershell.exe -NoProfile -ExecutionPolicy Bypass -File native/win32/dsh-click-helper.ps1
```

`awareness` should be `2` (Per-Monitor V2) or `1` (system-aware); `0` means every rectangle is still logical pixels.

## Evidence to attach to a bug report

- dsh-click version and DSH host version.
- Windows build, PowerShell version, display scaling, target app/version.
- The exact tool call and JSON result (redact personal data), including `captureMethod` and `scope`.
- Whether the result came from `printwindow-fullcontent`, `printwindow`, or `copyfromscreen`; a `copyfromscreen` image that shows another window means the target was occluded and PrintWindow was refused.
- The `metrics` output when the report is about sizes or units.
