use std::env;
use std::process::ExitCode;

use tuget_native_host::config::{HostConfig, validate_chromium_origin};
use tuget_native_host::pipe::run_native_host;

fn main() -> ExitCode {
    let runtime = match tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
    {
        Ok(runtime) => runtime,
        Err(error) => {
            eprintln!("[TuGet Native Host] cannot start runtime: {error}");
            return ExitCode::FAILURE;
        }
    };
    let code = match runtime.block_on(run()) {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            // Native Messaging reserves stdout for framed JSON. Diagnostics must use stderr.
            eprintln!("[TuGet Native Host] {error}");
            tuget_native_host::diagnostics::record(&error.to_string());
            ExitCode::FAILURE
        }
    };
    // Tokio stdin can remain in a blocking OS read while Chromium holds its
    // pipe open. Do not let runtime teardown keep a disconnected Host alive.
    // Protocol output has already been flushed before run returns.
    runtime.shutdown_timeout(std::time::Duration::from_millis(200));
    code
}

async fn run() -> Result<(), String> {
    let arguments: Vec<_> = env::args_os().skip(1).collect();
    if arguments
        .first()
        .is_some_and(|arg| arg == "--register-native-host")
    {
        if arguments.len() != 2 {
            return Err("registration requires one manifest path".into());
        }
        return tuget_native_host::registration::register(std::path::Path::new(&arguments[1]));
    }
    tuget_native_host::diagnostics::record(&format!(
        "host_started: version={} pipe_env_present={} validating origin and configuration",
        env!("CARGO_PKG_VERSION"),
        env::var_os("TUGET_NATIVE_PIPE").is_some()
    ));
    validate_chromium_origin(env::args().skip(1)).map_err(|error| error.to_string())?;
    let config = HostConfig::from_env().map_err(|error| error.to_string())?;
    eprintln!(
        "[TuGet Native Host] starting protocol v1 bridge for {}",
        config.pipe_name
    );
    tuget_native_host::diagnostics::record(&format!("pipe_connect_start: {}", config.pipe_name));
    run_native_host(config)
        .await
        .map_err(|error| error.to_string())
}
