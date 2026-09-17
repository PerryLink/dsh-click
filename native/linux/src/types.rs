use serde::{Deserialize, Serialize};
use serde_json::Value;

/// A single command sent from the TS core to this helper.
/// Mirrors the shape the win32 PowerShell helper already accepts:
///   { "action": "click", "params": { ... } }
#[derive(Debug, Deserialize)]
pub struct Command {
    pub action: String,
    #[serde(default)]
    pub params: Value,
}

/// The response shape the TS core expects back on stdout.
/// Kept identical for both platforms so the core never needs an
/// if (platform === 'win32') branch when parsing results.
#[derive(Debug, Serialize)]
pub struct Response {
    pub ok: bool,
    pub action: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl Response {
    pub fn ok(action: &str, data: Value) -> Self {
        Response { ok: true, action: action.to_string(), data: Some(data), error: None }
    }

    pub fn err(action: &str, message: impl Into<String>) -> Self {
        Response { ok: false, action: action.to_string(), data: None, error: Some(message.into()) }
    }
}

// ---- Per-action param shapes -------------------------------------------

#[derive(Debug, Deserialize, Default)]
pub struct ClickParams {
    pub x: i32,
    pub y: i32,
    #[serde(default = "default_button")]
    pub button: String, // "left" | "right" | "middle"
    #[serde(default)]
    pub double: bool,
}

fn default_button() -> String {
    "left".to_string()
}

#[derive(Debug, Deserialize)]
pub struct TypeParams {
    pub text: String,
    /// ms delay between keystrokes, matches ydotool's --key-delay
    #[serde(default = "default_key_delay")]
    pub delay_ms: u32,
}

fn default_key_delay() -> u32 {
    12
}

#[derive(Debug, Deserialize)]
pub struct ScrollParams {
    #[serde(default)]
    pub dx: i32,
    #[serde(default)]
    pub dy: i32,
}

#[derive(Debug, Deserialize)]
pub struct KeyParams {
    /// e.g. "ctrl+c", "alt+Tab", "Return"
    pub keys: String,
}

#[derive(Debug, Deserialize, Default)]
pub struct ScreenReadParams {
    /// Optional window/app name to scope the AT-SPI walk to.
    /// If omitted, the currently focused window is used.
    #[serde(default)]
    pub window: Option<String>,
    /// If true, also request a raster screenshot (grim) alongside the tree.
    #[serde(default)]
    pub include_screenshot: bool,
}

#[derive(Debug, Deserialize)]
pub struct AppLaunchParams {
    pub command: String,
    #[serde(default)]
    pub args: Vec<String>,
}
