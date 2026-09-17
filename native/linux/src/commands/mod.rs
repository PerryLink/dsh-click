pub mod input;
pub mod screen_read;
pub mod windows;

use crate::types::{Command, Response};
use serde_json::Value;

pub fn dispatch(cmd: Command) -> Response {
    let action = cmd.action.as_str();
    let result = match action {
        "click" => parse_and_run(&cmd.params, input::click),
        "type" => parse_and_run(&cmd.params, input::type_text),
        "scroll" => parse_and_run(&cmd.params, input::scroll),
        "key" => parse_and_run(&cmd.params, input::key),
        "screen_read" => parse_and_run_default(&cmd.params, screen_read::screen_read),
        "app_list" => Ok(windows::app_list()).and_then(|r| r),
        "app_launch" => parse_and_run(&cmd.params, windows::app_launch),
        other => Err(format!("unknown action: {other}")),
    };

    match result {
        Ok(data) => Response::ok(action, data),
        Err(e) => Response::err(action, e),
    }
}

/// Deserialize `params` into `P`, then run `f(P) -> Result<Value, String>`.
fn parse_and_run<P, F>(params: &Value, f: F) -> Result<Value, String>
where
    P: serde::de::DeserializeOwned,
    F: FnOnce(P) -> Result<Value, String>,
{
    let parsed: P = serde_json::from_value(params.clone())
        .map_err(|e| format!("invalid params: {e}"))?;
    f(parsed)
}

/// Same as `parse_and_run` but tolerates missing/null `params` via `Default`.
fn parse_and_run_default<P, F>(params: &Value, f: F) -> Result<Value, String>
where
    P: serde::de::DeserializeOwned + Default,
    F: FnOnce(P) -> Result<Value, String>,
{
    let parsed: P = if params.is_null() {
        P::default()
    } else {
        serde_json::from_value(params.clone()).map_err(|e| format!("invalid params: {e}"))?
    };
    f(parsed)
}
