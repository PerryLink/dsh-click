//! Injects mouse/keyboard input via `ydotool`, which talks to /dev/uinput.
//! This bypasses Wayland's compositor-level input restrictions because,
//! as far as the kernel is concerned, ydotoold *is* a physical HID device.
//!
//! Prerequisite on the target machine:
//!   - `ydotoold` daemon running (usually as a systemd --user service, or
//!     root-owned socket at /run/ydotoold/socket depending on install)
//!   - the calling user has permission to talk to that socket
//!
//! We shell out to the `ydotool` CLI rather than binding to libydotool
//! directly, matching the win32 helper's pattern of driving a CLI/tool
//! (PowerShell) instead of linking a native SDK.

use crate::types::{ClickParams, KeyParams, ScrollParams, TypeParams};
use serde_json::{json, Value};
use std::process::Command as Proc;

fn run_ydotool(args: &[&str]) -> Result<(), String> {
    let output = Proc::new("ydotool")
        .args(args)
        .output()
        .map_err(|e| format!("failed to spawn ydotool (is it installed and on PATH?): {e}"))?;

    if !output.status.success() {
        return Err(format!(
            "ydotool {} exited with {}: {}",
            args.join(" "),
            output.status,
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }
    Ok(())
}

fn button_code(button: &str) -> Result<&'static str, String> {
    // ydotool click takes a bitmask: 0x40 left down, 0x41 left up, etc.
    // Using the documented combined codes for a full press+release click.
    match button {
        "left" => Ok("0xC0"),
        "right" => Ok("0xC1"),
        "middle" => Ok("0xC2"),
        other => Err(format!("unsupported mouse button: {other}")),
    }
}

pub fn click(p: ClickParams) -> Result<Value, String> {
    // Move first, then click at the cursor position — ydotool's `click`
    // command doesn't take coordinates directly.
    run_ydotool(&["mousemove", "--absolute", "-x", &p.x.to_string(), "-y", &p.y.to_string()])?;
    let code = button_code(&p.button)?;

    run_ydotool(&["click", code])?;
    if p.double {
        run_ydotool(&["click", code])?;
    }

    Ok(json!({ "x": p.x, "y": p.y, "button": p.button, "double": p.double }))
}

pub fn type_text(p: TypeParams) -> Result<Value, String> {
    run_ydotool(&["type", "--key-delay", &p.delay_ms.to_string(), &p.text])?;
    Ok(json!({ "typed_chars": p.text.chars().count() }))
}

pub fn scroll(p: ScrollParams) -> Result<Value, String> {
    // ydotool's `scroll` wheel units: positive dy = up, positive dx = right.
    run_ydotool(&["scroll", "--", &p.dx.to_string(), &p.dy.to_string()])?;
    Ok(json!({ "dx": p.dx, "dy": p.dy }))
}

pub fn key(p: KeyParams) -> Result<Value, String> {
    // Translate "ctrl+c" / "alt+Tab" style combos into ydotool's
    // `key` keycode list (e.g. "ctrl+c" -> "29:1 46:1 46:0 29:0" is overkill
    // to hand-roll here; ydotool also accepts symbolic names joined by '+'
    // for the `key` subcommand directly, e.g. `ydotool key ctrl+c`.
    run_ydotool(&["key", &p.keys])?;
    Ok(json!({ "keys": p.keys }))
}
