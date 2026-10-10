mod commands;
mod types;

use std::io::{self, Read};
use types::{Command, Response};

/// Contract: same as the win32 PowerShell helper.
///   - a single JSON command as argv[1], OR piped on stdin if no arg given
///   - a single JSON response written to stdout, always exit 0
///     (success/failure is carried in the `ok` field, not the exit code,
///     so the TS core has one parsing path regardless of platform)
fn main() {
    let input = match std::env::args().nth(1) {
        Some(arg) => arg,
        None => {
            let mut buf = String::new();
            if let Err(e) = io::stdin().read_to_string(&mut buf) {
                print_and_exit(Response::err("unknown", format!("failed to read stdin: {e}")));
            }
            buf
        }
    };

    let cmd: Command = match serde_json::from_str(&input) {
        Ok(c) => c,
        Err(e) => {
            print_and_exit(Response::err("unknown", format!("invalid command JSON: {e}")));
        }
    };

    let response = commands::dispatch(cmd);
    print_and_exit(response);
}

fn print_and_exit(response: Response) -> ! {
    let body = serde_json::to_string(&response).unwrap_or_else(|_| {
        r#"{"ok":false,"action":"unknown","error":"failed to serialize response"}"#.to_string()
    });
    println!("{body}");
    // Always exit 0: the JSON `ok` field is the source of truth for
    // success/failure, matching how the existing win32 helper behaves.
    std::process::exit(0);
}
