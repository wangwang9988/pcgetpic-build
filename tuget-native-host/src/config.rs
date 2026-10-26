use std::env;
use std::time::Duration;

use thiserror::Error;

use crate::DESKTOP_EXTENSION_ORIGIN;

// The LOCAL namespace is required for named pipes used by packaged Windows
// applications and remains valid for unpackaged development/NSIS builds.
#[cfg(windows)]
pub const DEFAULT_PIPE_NAME: &str = r"\\.\pipe\LOCAL\tuget.desktop.v1";
// Base Unix socket filename template; runtime callers should prefer
// `default_pipe_name()` which isolates the socket under `/tmp/tuget-<uid>/`.
#[cfg(unix)]
pub const DEFAULT_PIPE_NAME: &str = "/tmp/tuget.desktop.v1.sock";
pub const PIPE_NAMESPACE_PREFIX: &str = r"\\.\pipe\LOCAL\tuget.desktop.";
pub const DEFAULT_WRITE_TIMEOUT_MS: u64 = 30_000;

pub fn default_pipe_name() -> String {
    #[cfg(windows)]
    {
        DEFAULT_PIPE_NAME.to_string()
    }
    #[cfg(unix)]
    {
        let uid = unsafe { libc::geteuid() };
        format!("/tmp/tuget-{uid}/tuget.desktop.v1.sock")
    }
}

#[derive(Debug, Clone)]
pub struct HostConfig {
    pub pipe_name: String,
    pub connect_timeout: Duration,
    pub retry_delay: Duration,
    pub write_timeout: Duration,
}

impl HostConfig {
    pub fn from_env() -> Result<Self, ConfigError> {
        let pipe_name = env::var("TUGET_NATIVE_PIPE").unwrap_or_else(|_| default_pipe_name());
        validate_pipe_name(&pipe_name)?;

        Ok(Self {
            pipe_name,
            connect_timeout: duration_from_env("TUGET_PIPE_CONNECT_TIMEOUT_MS", 15_000)?,
            retry_delay: duration_from_env("TUGET_PIPE_RETRY_DELAY_MS", 100)?,
            // Chromium can stop draining Native Messaging stdout briefly while
            // its GPU or Network Service process is being rebuilt. Five seconds
            // was short enough to kill an otherwise healthy host and surface
            // native_message_process_host.cc -101 in the browser.
            write_timeout: duration_from_env(
                "TUGET_PIPE_WRITE_TIMEOUT_MS",
                DEFAULT_WRITE_TIMEOUT_MS,
            )?,
        })
    }
}

#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("Native Messaging origin is missing; expected {DESKTOP_EXTENSION_ORIGIN}")]
    MissingOrigin,
    #[error(
        "Native Messaging origin is not allowed: {actual}; expected {DESKTOP_EXTENSION_ORIGIN}"
    )]
    InvalidOrigin { actual: String },
    #[cfg(windows)]
    #[error("Named Pipe must stay in the TuGet namespace {PIPE_NAMESPACE_PREFIX}*: {0}")]
    InvalidPipeName(String),
    #[cfg(unix)]
    #[error("Unix socket path must be an absolute .sock path in the tuget namespace (<=103 bytes): {0}")]
    InvalidPipeName(String),
    #[error("environment variable {name} must be an integer between 1 and 300000 milliseconds")]
    InvalidDuration { name: &'static str },
}

pub fn validate_chromium_origin<I, S>(args: I) -> Result<(), ConfigError>
where
    I: IntoIterator<Item = S>,
    S: AsRef<str>,
{
    let origin = args
        .into_iter()
        .map(|value| value.as_ref().to_string())
        .find(|value| value.starts_with("chrome-extension://"))
        .ok_or(ConfigError::MissingOrigin)?;

    if origin == DESKTOP_EXTENSION_ORIGIN {
        Ok(())
    } else {
        Err(ConfigError::InvalidOrigin { actual: origin })
    }
}

#[cfg(windows)]
pub fn validate_pipe_name(pipe_name: &str) -> Result<(), ConfigError> {
    let suffix = pipe_name
        .strip_prefix(PIPE_NAMESPACE_PREFIX)
        .ok_or_else(|| ConfigError::InvalidPipeName(pipe_name.to_string()))?;
    let valid_suffix = !suffix.is_empty()
        && suffix.len() <= 128
        && suffix.chars().all(|character| {
            character.is_ascii_alphanumeric() || matches!(character, '.' | '-' | '_')
        });

    if valid_suffix {
        Ok(())
    } else {
        Err(ConfigError::InvalidPipeName(pipe_name.to_string()))
    }
}

#[cfg(unix)]
pub fn validate_pipe_name(pipe_name: &str) -> Result<(), ConfigError> {
    let path = std::path::Path::new(pipe_name);
    let file_name = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or_default();
    let has_tuget_namespace = file_name.contains("tuget")
        || path.ancestors().any(|ancestor| {
            ancestor
                .file_name()
                .and_then(|value| value.to_str())
                .is_some_and(|name| name.contains("tuget"))
        });
    let valid = pipe_name.starts_with('/')
        && pipe_name.ends_with(".sock")
        && pipe_name.len() <= 103
        && !pipe_name.contains("..")
        && !file_name.is_empty()
        && has_tuget_namespace;
    if valid {
        Ok(())
    } else {
        Err(ConfigError::InvalidPipeName(pipe_name.to_string()))
    }
}

fn duration_from_env(name: &'static str, default_ms: u64) -> Result<Duration, ConfigError> {
    let milliseconds = match env::var(name) {
        Ok(value) => value
            .parse::<u64>()
            .ok()
            .filter(|value| (1..=300_000).contains(value))
            .ok_or(ConfigError::InvalidDuration { name })?,
        Err(env::VarError::NotPresent) => default_ms,
        Err(env::VarError::NotUnicode(_)) => return Err(ConfigError::InvalidDuration { name }),
    };
    Ok(Duration::from_millis(milliseconds))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_only_the_registered_desktop_origin() {
        assert!(validate_chromium_origin([DESKTOP_EXTENSION_ORIGIN]).is_ok());
        assert!(validate_chromium_origin(["--parent-window=42", DESKTOP_EXTENSION_ORIGIN]).is_ok());
        assert!(
            validate_chromium_origin(["chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/"])
                .is_err()
        );
        assert!(validate_chromium_origin(["--parent-window=42"]).is_err());
    }

    #[test]
    #[cfg(windows)]
    fn restricts_named_pipe_to_the_tuget_namespace() {
        assert!(validate_pipe_name(DEFAULT_PIPE_NAME).is_ok());
        assert!(validate_pipe_name(r"\\.\pipe\LOCAL\tuget.desktop.session-123").is_ok());
        assert!(validate_pipe_name(r"\\.\pipe\tuget.desktop.session-123").is_err());
        assert!(validate_pipe_name(r"\\.\pipe\other-product").is_err());
        assert!(validate_pipe_name(r"C:\temp\pipe").is_err());
        assert!(validate_pipe_name(r"\\.\pipe\LOCAL\tuget.desktop.bad\child").is_err());
    }

    #[test]
    #[cfg(unix)]
    fn restricts_unix_socket_to_the_tuget_namespace() {
        assert!(validate_pipe_name(DEFAULT_PIPE_NAME).is_ok());
        assert!(validate_pipe_name("/tmp/tuget-1000/c-123456789abc.sock").is_ok());
        assert!(validate_pipe_name("/run/user/1000/tuget/c-123456789abc.sock").is_ok());
        assert!(validate_pipe_name("relative/tuget.sock").is_err());
        assert!(validate_pipe_name("/tmp/other-product.sock").is_err());
        assert!(validate_pipe_name("/tmp/tuget/../other.sock").is_err());
        assert!(validate_pipe_name(&format!("/tmp/tuget/{}.sock", "a".repeat(100))).is_err());
    }
}
