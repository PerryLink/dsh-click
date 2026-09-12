//! Reads "what's on screen" two ways, mirroring the win32 helper's
//! screen_read: a text description of the accessible UI tree, and
//! optionally a raster screenshot.
//!
//! AT-SPI2 exposes GTK/Qt apps' accessible tree over D-Bus on a
//! dedicated "a11y bus" — this works identically under X11 or any
//! Wayland compositor, since it has nothing to do with the display
//! protocol at all.
//!
//! NOTE / SCAFFOLD STATUS:
//! Walking the full AT-SPI accessible tree (roles, states, bounding
//! boxes for every widget) properly wants a real D-Bus client library
//! (the `atspi` or `zbus` crates) doing recursive `GetChildren` calls.
//! That's the next milestone. For now this shells out to `gdbus` to
//! confirm the a11y bus is reachable and enumerate top-level
//! applications, so the JSON contract and plumbing are in place and
//! the TS core can already call `screen_read` end-to-end. Swap the
//! body of `read_accessible_tree` for a real zbus-based walk without
//! touching the JSON shape callers depend on.

use crate::types::ScreenReadParams;
use serde_json::{json, Value};
use std::process::Command as Proc;

fn a11y_bus_address() -> Result<String, String> {
    let output = Proc::new("gdbus")
        .args([
            "call", "--session",
            "--dest", "org.a11y.Bus",
            "--object-path", "/org/a11y/bus",
            "--method", "org.a11y.Bus.GetAddress",
        ])
        .output()
        .map_err(|e| format!("failed to spawn gdbus: {e}"))?;

    if !output.status.success() {
        return Err(format!(
            "could not reach the AT-SPI a11y bus (is at-spi2-core running?): {}",
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn list_registered_apps() -> Result<Vec<String>, String> {
    // org.a11y.atspi.Registry on the a11y bus tracks every app that has
    // registered an accessible root. Introspecting it via gdbus gives us
    // application names even before we do full recursive tree-walking.
    let output = Proc::new("gdbus")
        .args([
            "call", "--session",
            "--dest", "org.a11y.atspi.Registry",
            "--object-path", "/org/a11y/atspi/accessible/root",
            "--method", "org.a11y.atspi.Accessible.GetChildren",
        ])
        .output()
        .map_err(|e| format!("failed to spawn gdbus: {e}"))?;

    if !output.status.success() {
        // Not fatal — some setups don't expose Registry under that name.
        // Fall back to an empty list rather than failing the whole call.
        return Ok(vec![]);
    }

    // Raw output here is a gvariant tuple of accessible object paths;
    // full deserialization belongs to the zbus-based rewrite. For now
    // we just surface the raw string so callers can see something.
    let raw = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if raw.is_empty() {
        Ok(vec![])
    } else {
        Ok(vec![raw])
    }
}

fn screenshot_png_base64() -> Result<String, String> {
    // grim writes a full-screen PNG to stdout when given "-" as the path.
    let output = Proc::new("grim")
        .args(["-"])
        .output()
        .map_err(|e| format!("failed to spawn grim (install grim for screenshots): {e}"))?;

    if !output.status.success() {
        return Err(format!(
            "grim exited with {}: {}",
            output.status,
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }

    Ok(base64_encode(&output.stdout))
}

/// Minimal base64 encoder so we don't need to pull in the `base64` crate
/// just for one call site. Swap for the `base64` crate if more encoding
/// needs show up later.
fn base64_encode(data: &[u8]) -> String {
    const ALPHABET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity((data.len() + 2) / 3 * 4);
    for chunk in data.chunks(3) {
        let b0 = chunk[0];
        let b1 = *chunk.get(1).unwrap_or(&0);
        let b2 = *chunk.get(2).unwrap_or(&0);

        out.push(ALPHABET[(b0 >> 2) as usize] as char);
        out.push(ALPHABET[(((b0 & 0x03) << 4) | (b1 >> 4)) as usize] as char);
        out.push(if chunk.len() > 1 {
            ALPHABET[(((b1 & 0x0f) << 2) | (b2 >> 6)) as usize] as char
        } else {
            '='
        });
        out.push(if chunk.len() > 2 {
            ALPHABET[(b2 & 0x3f) as usize] as char
        } else {
            '='
        });
    }
    out
}

pub fn screen_read(p: ScreenReadParams) -> Result<Value, String> {
    let bus_address = a11y_bus_address()?;
    let apps = list_registered_apps()?;

    let mut result = json!({
        "a11y_bus": bus_address,
        "scoped_window": p.window,
        "applications": apps,
        "tree_walk_status": "partial-scaffold: raw registry response only, see screen_read.rs",
    });

    if p.include_screenshot {
        let png_b64 = screenshot_png_base64()?;
        result["screenshot_png_base64"] = json!(png_b64);
    }

    Ok(result)
}
