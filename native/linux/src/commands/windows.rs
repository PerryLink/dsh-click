//! Window/app enumeration and launching for Hyprland, via `hyprctl`.
//! Named `windows.rs` (not `hyprland.rs`) to line up with the win32
//! helper's module that also owns app_list/app_launch.
//!
//! `hyprctl clients -j` already gives us window class, title, geometry
//! and workspace in one shot, so there's no need to reach for generic
//! wlr-foreign-toplevel or similar Wayland protocols here.

use crate::types::AppLaunchParams;
use serde_json::{json, Value};
use std::process::Command as Proc;

fn run_hyprctl_json(args: &[&str]) -> Result<Value, String> {
    let output = Proc::new("hyprctl")
        .args(args)
        .output()
        .map_err(|e| format!("failed to spawn hyprctl (are we running under Hyprland?): {e}"))?;

    if !output.status.success() {
        return Err(format!(
            "hyprctl {} exited with {}: {}",
            args.join(" "),
            output.status,
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }

    serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("hyprctl returned non-JSON output: {e}"))
}

pub fn app_list() -> Result<Value, String> {
    let clients = run_hyprctl_json(&["clients", "-j"])?;
    let active = run_hyprctl_json(&["activewindow", "-j"]).ok();

    let apps: Vec<Value> = clients
        .as_array()
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .map(|c| {
            json!({
                "address": c.get("address"),
                "title": c.get("title"),
                "class": c.get("class"),
                "workspace": c.get("workspace").and_then(|w| w.get("name")),
                "pid": c.get("pid"),
                "at": c.get("at"),
                "size": c.get("size"),
                "focused": c.get("focusHistoryID").and_then(|v| v.as_i64()) == Some(0),
            })
        })
        .collect();

    Ok(json!({
        "apps": apps,
        "active_window": active,
    }))
}

pub fn app_launch(p: AppLaunchParams) -> Result<Value, String> {
    // `hyprctl dispatch exec` launches detached, respecting window rules,
    // rather than us forking a child that dies with this helper process.
    let mut exec_str = p.command.clone();
    for a in &p.args {
        exec_str.push(' ');
        exec_str.push_str(a);
    }

    let output = Proc::new("hyprctl")
        .args(["dispatch", "exec", "--", &exec_str])
        .output()
        .map_err(|e| format!("failed to spawn hyprctl: {e}"))?;

    if !output.status.success() {
        return Err(format!(
            "hyprctl dispatch exec exited with {}: {}",
            output.status,
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }

    Ok(json!({ "launched": p.command, "args": p.args }))
}
