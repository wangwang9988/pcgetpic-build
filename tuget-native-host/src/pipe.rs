use std::collections::VecDeque;
use std::io;
use std::sync::Arc;
#[cfg(test)]
use std::time::Duration;

use thiserror::Error;
use tokio::io::{AsyncRead, AsyncWrite, AsyncWriteExt};
#[cfg(windows)]
use tokio::net::windows::named_pipe::{ClientOptions, NamedPipeClient};
#[cfg(unix)]
use tokio::net::UnixStream;
use tokio::sync::mpsc;
use tokio::time::{Instant, sleep, timeout};
#[cfg(windows)]
use windows_sys::Win32::Foundation::ERROR_PIPE_BUSY;

#[cfg(windows)]
type PipeStream = NamedPipeClient;
#[cfg(unix)]
type PipeStream = UnixStream;

use crate::config::HostConfig;
use crate::frame::{FrameError, read_frame, write_frame};
use crate::protocol::{MessageDirection, ProtocolValidator};
use crate::{EXTENSION_TO_HOST_MAX_BYTES, HOST_TO_EXTENSION_MAX_BYTES};

const INPUT_CHANNEL_CAPACITY: usize = 16;
const MAX_PENDING_MESSAGES: usize = 32;
const MAX_PENDING_BYTES: usize = 16 * 1024 * 1024;

enum InputEvent {
    Message(Vec<u8>),
    End,
    Fatal(String),
}

#[derive(Debug, Error)]
pub enum BridgeError {
    #[error("Native Messaging input failed: {0}")]
    NativeInput(String),
    #[error("Named Pipe message failed validation: {0}")]
    PipeProtocol(String),
    #[error("Named Pipe connection failed: {0}")]
    PipeConnect(String),
    #[error(
        "timed out connecting to Named Pipe {pipe_name} after {timeout_ms} ms; attempts={attempts}; last_error={last_error}"
    )]
    PipeConnectTimeout {
        pipe_name: String,
        timeout_ms: u128,
        attempts: u32,
        last_error: String,
    },
    #[error("timed out writing a message to {target} after {timeout_ms} ms")]
    WriteTimeout {
        target: &'static str,
        timeout_ms: u128,
    },
    #[error("failed to write Native Messaging output: {0}")]
    NativeOutput(FrameError),
    #[error(
        "Native Messaging backlog exceeded {MAX_PENDING_MESSAGES} messages or {MAX_PENDING_BYTES} bytes while the client was offline"
    )]
    BacklogExceeded,
    #[error(
        "Named Pipe session ended; closing Native Messaging so the extension can handshake again"
    )]
    SessionEnded,
}

struct AbortReader(tokio::task::JoinHandle<()>);
impl Drop for AbortReader {
    fn drop(&mut self) {
        self.0.abort();
    }
}

pub async fn run_native_host(config: HostConfig) -> Result<(), BridgeError> {
    let validator = Arc::new(
        ProtocolValidator::new().map_err(|error| BridgeError::NativeInput(error.to_string()))?,
    );
    let (input_sender, input_receiver) = mpsc::channel(INPUT_CHANNEL_CAPACITY);
    let reader_validator = Arc::clone(&validator);

    let input_task = tokio::spawn(async move {
        native_input_loop(input_sender, reader_validator).await;
    });
    let result = pipe_bridge_loop(input_receiver, tokio::io::stdout(), config, validator).await;

    if result.is_err() {
        input_task.abort();
    } else {
        let _ = input_task.await;
    }
    result
}

async fn native_input_loop(sender: mpsc::Sender<InputEvent>, validator: Arc<ProtocolValidator>) {
    let mut input = tokio::io::stdin();
    loop {
        match read_frame(&mut input, EXTENSION_TO_HOST_MAX_BYTES).await {
            Ok(Some(bytes)) => {
                let validated =
                    match validator.validate(&bytes, MessageDirection::ExtensionToClient) {
                        Ok(validated) => validated,
                        Err(error) => {
                            let _ = sender.send(InputEvent::Fatal(error.to_string())).await;
                            return;
                        }
                    };
                append_optional_trace("extension-to-client", &validated.message_type);
                if sender.send(InputEvent::Message(bytes)).await.is_err() {
                    return;
                }
            }
            Ok(None) => {
                let _ = sender.send(InputEvent::End).await;
                return;
            }
            Err(error) => {
                let _ = sender.send(InputEvent::Fatal(error.to_string())).await;
                return;
            }
        }
    }
}

async fn pipe_bridge_loop<W>(
    mut input: mpsc::Receiver<InputEvent>,
    mut native_output: W,
    config: HostConfig,
    validator: Arc<ProtocolValidator>,
) -> Result<(), BridgeError>
where
    W: AsyncWrite + Unpin,
{
    let mut pending = VecDeque::<Vec<u8>>::new();
    let mut pending_bytes = 0_usize;

    {
        let Some(pipe) =
            connect_with_input(&mut input, &mut pending, &mut pending_bytes, &config).await?
        else {
            return Ok(());
        };
        eprintln!("[TuGet Native Host] connected to {}", config.pipe_name);
        crate::diagnostics::record(&format!("pipe_connected: {}", config.pipe_name));
        let (pipe_reader, mut pipe_writer) = tokio::io::split(pipe);
        let (pipe_input_sender, mut pipe_input) = mpsc::channel(INPUT_CHANNEL_CAPACITY);
        let _pipe_reader_task =
            AbortReader(tokio::spawn(pipe_read_loop(pipe_reader, pipe_input_sender)));

        loop {
            if let Some(message) = pending.front() {
                let write_result = timeout(
                    config.write_timeout,
                    write_frame(&mut pipe_writer, message, EXTENSION_TO_HOST_MAX_BYTES),
                )
                .await;
                match write_result {
                    Ok(Ok(())) => {
                        pending_bytes -= message.len();
                        pending.pop_front();
                        continue;
                    }
                    Ok(Err(error)) if is_disconnect_frame_error(&error) => {
                        eprintln!(
                            "[TuGet Native Host] Named Pipe disconnected while writing; ending Native Messaging session"
                        );
                        crate::diagnostics::record("pipe_write_disconnected; ending_session");
                        break;
                    }
                    Ok(Err(error)) => {
                        return Err(BridgeError::PipeConnect(error.to_string()));
                    }
                    Err(_) => {
                        eprintln!(
                            "[TuGet Native Host] Named Pipe write timed out; ending Native Messaging session"
                        );
                        crate::diagnostics::record("pipe_write_timeout; ending_session");
                        break;
                    }
                }
            }

            tokio::select! {
                event = input.recv() => {
                    match event {
                        Some(InputEvent::Message(message)) => {
                            enqueue(&mut pending, &mut pending_bytes, message)?;
                        }
                        Some(InputEvent::End) | None => return Ok(()),
                        Some(InputEvent::Fatal(error)) => return Err(BridgeError::NativeInput(error)),
                    }
                }
                // read_frame performs multiple reads and is not cancellation-safe. A
                // dedicated task owns that state so an extension input event cannot
                // consume the Pipe length prefix and cancel before the JSON payload.
                pipe_message = pipe_input.recv() => {
                    match pipe_message {
                        Some(Ok(Some(bytes))) => {
                            let validated = validator
                                .validate(&bytes, MessageDirection::ClientToExtension)
                                .map_err(|error| BridgeError::PipeProtocol(error.to_string()))?;
                            append_optional_trace("client-to-extension", &validated.message_type);
                            timeout(
                                config.write_timeout,
                                write_frame(&mut native_output, &bytes, HOST_TO_EXTENSION_MAX_BYTES),
                            )
                            .await
                            .map_err(|_| BridgeError::WriteTimeout {
                                target: "Native Messaging stdout",
                                timeout_ms: config.write_timeout.as_millis(),
                            })?
                            .map_err(BridgeError::NativeOutput)?;
                            native_output.flush().await.map_err(|error| {
                                BridgeError::NativeOutput(FrameError::Io(error))
                            })?;
                        }
                        Some(Ok(None)) | None => {
                            eprintln!("[TuGet Native Host] Named Pipe closed; ending Native Messaging session");
                            crate::diagnostics::record("pipe_closed; ending_session");
                            break;
                        }
                        Some(Err(error)) if is_disconnect_frame_error(&error) => {
                            eprintln!("[TuGet Native Host] Named Pipe disconnected; ending Native Messaging session");
                            crate::diagnostics::record("pipe_disconnected; ending_session");
                            break;
                        }
                        Some(Err(error)) => return Err(BridgeError::PipeProtocol(error.to_string())),
                    }
                }
            }
        }
        // Reconnecting just the byte pipe would leave the extension 'ready'
        // while the client waits for HELLO. Chromium must observe Host exit so
        // its existing onDisconnect path creates a new Host/session and HELLO.
        return Err(BridgeError::SessionEnded);
    }
}

fn append_optional_trace(direction: &str, message_type: &str) {
    crate::diagnostics::record(&format!("{direction} {message_type}"));
}

async fn pipe_read_loop<R>(mut reader: R, sender: mpsc::Sender<Result<Option<Vec<u8>>, FrameError>>)
where
    R: AsyncRead + Unpin,
{
    loop {
        let result = read_frame(&mut reader, HOST_TO_EXTENSION_MAX_BYTES).await;
        let terminal = !matches!(result, Ok(Some(_)));
        if sender.send(result).await.is_err() || terminal {
            return;
        }
    }
}

async fn connect_with_input(
    input: &mut mpsc::Receiver<InputEvent>,
    pending: &mut VecDeque<Vec<u8>>,
    pending_bytes: &mut usize,
    config: &HostConfig,
) -> Result<Option<PipeStream>, BridgeError> {
    let deadline = Instant::now() + config.connect_timeout;
    let mut attempts = 0u32;
    loop {
        attempts = attempts.saturating_add(1);
        let last_error = match open_pipe(&config.pipe_name).await {
            Ok(pipe) => return Ok(Some(pipe)),
            Err(error) if is_retryable_open_error(&error) => error,
            Err(error) => return Err(BridgeError::PipeConnect(error.to_string())),
        };
        if attempts == 1 {
            crate::diagnostics::record(&format!(
                "pipe_connect_retry: {} os_error={:?}",
                last_error,
                last_error.raw_os_error()
            ));
        }

        if Instant::now() >= deadline {
            return Err(BridgeError::PipeConnectTimeout {
                pipe_name: config.pipe_name.clone(),
                timeout_ms: config.connect_timeout.as_millis(),
                attempts,
                last_error: last_error.to_string(),
            });
        }

        tokio::select! {
            event = input.recv() => {
                match event {
                    Some(InputEvent::Message(message)) => enqueue(pending, pending_bytes, message)?,
                    Some(InputEvent::End) | None => return Ok(None),
                    Some(InputEvent::Fatal(error)) => return Err(BridgeError::NativeInput(error)),
                }
            }
            _ = sleep(config.retry_delay) => {}
        }
    }
}

fn enqueue(
    pending: &mut VecDeque<Vec<u8>>,
    pending_bytes: &mut usize,
    message: Vec<u8>,
) -> Result<(), BridgeError> {
    if pending.len() >= MAX_PENDING_MESSAGES
        || pending_bytes.saturating_add(message.len()) > MAX_PENDING_BYTES
    {
        return Err(BridgeError::BacklogExceeded);
    }
    *pending_bytes += message.len();
    pending.push_back(message);
    Ok(())
}

#[cfg(windows)]
async fn open_pipe(pipe_name: &str) -> io::Result<PipeStream> {
    // Tokio defaults to SECURITY_IDENTIFICATION for client opens, preventing
    // the server from impersonating this process with elevated privileges.
    ClientOptions::new().open(pipe_name)
}

#[cfg(unix)]
async fn open_pipe(pipe_name: &str) -> io::Result<PipeStream> {
    UnixStream::connect(pipe_name).await
}

#[cfg(windows)]
fn is_retryable_open_error(error: &io::Error) -> bool {
    matches!(error.kind(), io::ErrorKind::NotFound)
        || error.raw_os_error() == Some(ERROR_PIPE_BUSY as i32)
}

#[cfg(unix)]
fn is_retryable_open_error(error: &io::Error) -> bool {
    matches!(
        error.kind(),
        io::ErrorKind::NotFound | io::ErrorKind::ConnectionRefused
    )
}

fn is_disconnect_frame_error(error: &FrameError) -> bool {
    let FrameError::Io(error) = error else {
        return false;
    };
    matches!(
        error.kind(),
        io::ErrorKind::BrokenPipe
            | io::ErrorKind::UnexpectedEof
            | io::ErrorKind::ConnectionAborted
            | io::ErrorKind::ConnectionReset
            | io::ErrorKind::NotConnected
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::frame::write_frame;
    use tokio::io::duplex;
    #[cfg(windows)]
    use tokio::net::windows::named_pipe::ServerOptions;
    #[cfg(unix)]
    use tokio::net::UnixListener;

    #[cfg(windows)]
    fn unique_pipe(label: &str) -> String {
        format!(
            r"\\.\pipe\LOCAL\tuget.desktop.test-{label}-{}",
            std::process::id()
        )
    }

    #[cfg(unix)]
    fn unique_pipe(label: &str) -> String {
        format!("/tmp/tuget.desktop.test-{label}-{}.sock", std::process::id())
    }

    #[tokio::test]
    async fn retries_until_named_pipe_server_appears() {
        let pipe_name = unique_pipe("retry");
        #[cfg(unix)]
        let _ = std::fs::remove_file(&pipe_name);
        let config = HostConfig {
            pipe_name: pipe_name.clone(),
            connect_timeout: Duration::from_secs(2),
            retry_delay: Duration::from_millis(25),
            write_timeout: Duration::from_secs(1),
        };
        let (sender, mut receiver) = mpsc::channel(1);
        let connect = tokio::spawn(async move {
            let mut pending = VecDeque::new();
            let mut pending_bytes = 0;
            connect_with_input(&mut receiver, &mut pending, &mut pending_bytes, &config).await
        });

        sleep(Duration::from_millis(150)).await;
        #[cfg(windows)]
        {
            let server = ServerOptions::new()
                .first_pipe_instance(true)
                .create(&pipe_name)
                .expect("create server");
            server.connect().await.expect("accept client");
            let client = connect
                .await
                .expect("connect task")
                .expect("connect result")
                .expect("client");
            drop(client);
            drop(server);
        }
        #[cfg(unix)]
        {
            let listener = UnixListener::bind(&pipe_name).expect("bind server");
            let (server, _) = listener.accept().await.expect("accept client");
            let client = connect
                .await
                .expect("connect task")
                .expect("connect result")
                .expect("client");
            drop(client);
            drop(server);
            drop(listener);
            let _ = std::fs::remove_file(&pipe_name);
        }
        drop(sender);
    }

    #[test]
    fn bounds_offline_backlog() {
        let mut pending = VecDeque::new();
        let mut pending_bytes = 0;
        for _ in 0..MAX_PENDING_MESSAGES {
            enqueue(&mut pending, &mut pending_bytes, vec![1]).expect("within backlog");
        }
        assert!(matches!(
            enqueue(&mut pending, &mut pending_bytes, vec![1]),
            Err(BridgeError::BacklogExceeded)
        ));
    }

    #[tokio::test]
    async fn unavailable_pipe_timeout_retains_attempts_and_the_os_error() {
        let config = HostConfig {
            pipe_name: unique_pipe("diagnostic-timeout"),
            connect_timeout: Duration::from_millis(40),
            retry_delay: Duration::from_millis(5),
            write_timeout: Duration::from_secs(1),
        };
        let (_sender, mut input) = mpsc::channel(1);
        let result = connect_with_input(&mut input, &mut VecDeque::new(), &mut 0, &config).await;
        match result {
            Err(BridgeError::PipeConnectTimeout { attempts, last_error, .. }) => {
                assert!(attempts > 1);
                assert!(last_error.contains("os error 2"));
            }
            _ => panic!("expected a missing-pipe timeout with its last Windows error"),
        }
    }

    #[tokio::test]
    async fn exits_cleanly_when_native_stdin_closes_before_client_starts() {
        let config = HostConfig {
            pipe_name: unique_pipe("native-eof"),
            connect_timeout: Duration::from_secs(2),
            retry_delay: Duration::from_millis(25),
            write_timeout: Duration::from_secs(1),
        };
        let (sender, mut receiver) = mpsc::channel(1);
        sender.send(InputEvent::End).await.expect("send end");
        drop(sender);
        let mut pending = VecDeque::new();
        let mut pending_bytes = 0;

        let connected =
            connect_with_input(&mut receiver, &mut pending, &mut pending_bytes, &config)
                .await
                .expect("clean native eof");
        assert!(connected.is_none());
    }

    #[tokio::test]
    async fn dedicated_pipe_reader_preserves_back_to_back_frame_boundaries() {
        let (mut writer, reader) = duplex(256);
        let (sender, mut receiver) = mpsc::channel(2);
        let read_task = tokio::spawn(pipe_read_loop(reader, sender));

        write_frame(
            &mut writer,
            br#"{"type":"HELLO_ACK"}"#,
            HOST_TO_EXTENSION_MAX_BYTES,
        )
        .await
        .expect("write first frame");
        write_frame(
            &mut writer,
            br#"{"type":"ENGINE_STATUS"}"#,
            HOST_TO_EXTENSION_MAX_BYTES,
        )
        .await
        .expect("write second frame");
        drop(writer);

        assert_eq!(
            receiver
                .recv()
                .await
                .expect("first result")
                .expect("first frame"),
            Some(br#"{"type":"HELLO_ACK"}"#.to_vec()),
        );
        assert_eq!(
            receiver
                .recv()
                .await
                .expect("second result")
                .expect("second frame"),
            Some(br#"{"type":"ENGINE_STATUS"}"#.to_vec()),
        );
        assert!(
            receiver
                .recv()
                .await
                .expect("eof result")
                .is_ok_and(|frame| frame.is_none())
        );
        read_task.await.expect("reader task");
    }
}
