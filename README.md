# dsh-click-linux

Native Linux helper for `dsh-click`, mirroring the win32 PowerShell
helper's JSON contract so the TS core needs zero platform branches.

## Contract

Call the binary with a single JSON command as `argv[1]` (or piped on
stdin), get a single JSON line back on stdout, always exit `0`:

```
$ dsh-click-linux '{"action":"click","params":{"x":100,"y":200,"button":"left"}}'
{"ok":true,"action":"click","data":{"x":100,"y":200,"button":"left","double":false}}
```

Failure is carried in the `ok` field, not the exit code:

```
$ dsh-click-linux '{"action":"click"}'
{"ok":false,"action":"click","error":"invalid params: invalid type: null, expected struct ClickParams"}
```

### Actions

| action        | backend           | params                                             |
|---------------|--------------------|-----------------------------------------------------|
| `click`       | ydotool            | `x, y, button ("left"\|"right"\|"middle"), double`  |
| `type`        | ydotool            | `text, delay_ms`                                    |
| `scroll`      | ydotool            | `dx, dy`                                             |
| `key`         | ydotool            | `keys` (e.g. `"ctrl+c"`, `"alt+Tab"`)               |
| `screen_read` | AT-SPI2 / grim      | `window?, include_screenshot?`                       |
| `app_list`    | hyprctl            | *(none)*                                             |
| `app_launch`  | hyprctl            | `command, args?`                                     |

## Host prerequisites

- **`ydotoold`** running, with this process able to reach its socket
  (see `ydotool` upstream docs for the systemd --user unit and
  permissions setup — usually udev rule + user group).
- **`hyprctl`** on PATH (i.e. running under Hyprland).
- **`at-spi2-core`** running for `screen_read`'s accessible-tree lookup.
- **`grim`** installed if you want `include_screenshot: true`.

## Known scaffold gap

`screen_read`'s AT-SPI walk is currently a thin `gdbus`-shelled probe
that confirms the a11y bus is reachable and returns the raw registry
response — it does **not** yet recursively walk roles/states/bounding
boxes for every widget. That's the next milestone: swap the body of
`read_accessible_tree` in `src/commands/screen_read.rs` for a proper
`zbus`/`atspi`-crate based recursive walk. The JSON shape returned is
stable, so that swap won't require any change in the TS core.

## Build

```
cargo build --release
# binary at target/release/dsh-click-linux
```
