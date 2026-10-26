use std::env;
use std::path::PathBuf;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde_json::{Value, json};
use tokio::io::{AsyncRead, AsyncWrite};
#[cfg(windows)]
use tokio::net::windows::named_pipe::{NamedPipeServer, ServerOptions};
#[cfg(unix)]
use tokio::net::{UnixListener, UnixStream};
use tokio::time::timeout;
use tuget_native_host::config::{DEFAULT_PIPE_NAME, validate_pipe_name};
use tuget_native_host::frame::{read_frame, write_frame};
use tuget_native_host::protocol::{MessageDirection, ProtocolValidator};
use tuget_native_host::{EXTENSION_TO_HOST_MAX_BYTES, HOST_TO_EXTENSION_MAX_BYTES};

const STEP_TIMEOUT: Duration = Duration::from_secs(20);

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let options = Options::parse()?;
    validate_pipe_name(&options.pipe_name)?;
    let validator = ProtocolValidator::new()?;

    let mut first = accept_client(&options.pipe_name).await?;
    let hello = read_event(&mut first, &validator).await?;
    if hello.get("type").and_then(Value::as_str) != Some("HELLO") {
        return Err("first extension message must be HELLO".into());
    }
    let session_id = hello
        .get("sessionId")
        .and_then(Value::as_str)
        .ok_or("HELLO sessionId is missing")?
        .to_string();
    drop(first);

    // Force one disconnect. The Host must reconnect without Chrome relaunching it.
    let mut second = accept_client(&options.pipe_name).await?;
    let reconnect_event = read_until_type(&mut second, &validator, "HEARTBEAT").await?;

    let hello_ack = json!({
        "version": 1,
        "messageId": "native-host-e2e-ack",
        "type": "HELLO_ACK",
        "sessionId": session_id,
        "timestamp": unix_timestamp_ms(),
        "payload": {
            "acceptedProtocolVersion": 1,
            "clientVersion": "native-host-e2e",
            "capabilities": []
        }
    });
    let ack_bytes = serde_json::to_vec(&hello_ack)?;
    validator.validate(&ack_bytes, MessageDirection::ClientToExtension)?;
    write_frame(&mut second, &ack_bytes, HOST_TO_EXTENSION_MAX_BYTES).await?;

    let resolved = read_until_type(&mut second, &validator, "ENGINE_READY").await?;
    #[cfg(unix)]
    let _ = std::fs::remove_file(&options.pipe_name);
    let result = json!({
        "passed": true,
        "pipeName": options.pipe_name,
        "firstType": "HELLO",
        "reconnectType": reconnect_event["type"],
        "responseType": hello_ack["type"],
        "finalType": resolved["type"],
        "protocolVersion": 1,
        "completedAt": unix_timestamp_ms()
    });
    let result_text = format!("{}\n", serde_json::to_string_pretty(&result)?);
    if let Some(parent) = options.result_path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(&options.result_path, result_text)?;
    println!("{}", serde_json::to_string(&result)?);
    Ok(())
}

#[cfg(windows)]
async fn accept_client(pipe_name: &str) -> Result<NamedPipeServer, Box<dyn std::error::Error>> {
    let server = ServerOptions::new()
        .first_pipe_instance(true)
        .create(pipe_name)?;
    timeout(STEP_TIMEOUT, server.connect()).await??;
    Ok(server)
}

#[cfg(unix)]
async fn accept_client(pipe_name: &str) -> Result<UnixStream, Box<dyn std::error::Error>> {
    let _ = std::fs::remove_file(pipe_name);
    let listener = UnixListener::bind(pipe_name)?;
    let (stream, _) = timeout(STEP_TIMEOUT, listener.accept()).await??;
    Ok(stream)
}

async fn read_event<S>(
    server: &mut S,
    validator: &ProtocolValidator,
) -> Result<Value, Box<dyn std::error::Error>>
where
    S: AsyncRead + AsyncWrite + Unpin,
{
    let bytes = timeout(
        STEP_TIMEOUT,
        read_frame(server, EXTENSION_TO_HOST_MAX_BYTES),
    )
    .await??
    .ok_or("Native Host disconnected before sending an event")?;
    validator.validate(&bytes, MessageDirection::ExtensionToClient)?;
    Ok(serde_json::from_slice(&bytes)?)
}

async fn read_until_type<S>(
    server: &mut S,
    validator: &ProtocolValidator,
    expected_type: &str,
) -> Result<Value, Box<dyn std::error::Error>>
where
    S: AsyncRead + AsyncWrite + Unpin,
{
    let deadline = tokio::time::Instant::now() + STEP_TIMEOUT;
    loop {
        let remaining = deadline.saturating_duration_since(tokio::time::Instant::now());
        if remaining.is_zero() {
            return Err(format!("timed out waiting for {expected_type}").into());
        }
        let message = timeout(remaining, read_event(server, validator)).await??;
        if message.get("type").and_then(Value::as_str) == Some(expected_type) {
            return Ok(message);
        }
    }
}

fn unix_timestamp_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}

struct Options {
    pipe_name: String,
    result_path: PathBuf,
}

impl Options {
    fn parse() -> Result<Self, Box<dyn std::error::Error>> {
        let mut pipe_name = DEFAULT_PIPE_NAME.to_string();
        let mut result_path = PathBuf::from(".cache/native-host-e2e-result.json");
        let mut args = env::args().skip(1);
        while let Some(argument) = args.next() {
            match argument.as_str() {
                "--pipe" => pipe_name = args.next().ok_or("--pipe requires a value")?,
                "--result" => {
                    result_path = PathBuf::from(args.next().ok_or("--result requires a value")?)
                }
                _ => return Err(format!("unknown argument: {argument}").into()),
            }
        }
        Ok(Self {
            pipe_name,
            result_path,
        })
    }
}
