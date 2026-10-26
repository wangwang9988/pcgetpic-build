use std::io::Write;
use std::process::{Child, Command, ExitStatus, Stdio};
use std::thread::sleep;
use std::time::{Duration, Instant};

use tuget_native_host::DESKTOP_EXTENSION_ORIGIN;

#[cfg(windows)]
fn test_pipe_name(label: &str) -> String {
    format!(
        r"\\.\pipe\LOCAL\tuget.desktop.process-test-{label}-{}",
        std::process::id()
    )
}

#[cfg(unix)]
fn test_pipe_name(label: &str) -> String {
    format!(
        "/tmp/tuget.desktop.process-test-{label}-{}.sock",
        std::process::id()
    )
}

#[tokio::test]
async fn server_disconnect_ends_host_with_stdin_open_and_next_host_sends_a_fresh_hello() {
    #[cfg(windows)]
    use tokio::net::windows::named_pipe::ServerOptions;
    #[cfg(unix)]
    use tokio::net::UnixListener;
    let label = "server-disconnect";
    let pipe_name = test_pipe_name(label);
    for round in 0..2 {
        #[cfg(windows)]
        let mut server = {
            let s = ServerOptions::new()
                .first_pipe_instance(true)
                .create(&pipe_name)
                .unwrap();
            let child = spawn_host(label);
            tokio::time::timeout(Duration::from_secs(10), s.connect())
                .await
                .unwrap()
                .unwrap();
            (s, child)
        };
        #[cfg(unix)]
        let mut server = {
            let _ = std::fs::remove_file(&pipe_name);
            let listener = UnixListener::bind(&pipe_name).unwrap();
            let child = spawn_host(label);
            let (s, _) = tokio::time::timeout(Duration::from_secs(10), listener.accept())
                .await
                .unwrap()
                .unwrap();
            (s, child)
        };
        let (ref mut stream, ref mut child) = server;
        let mut stdin = child.stdin.take().unwrap();
        let hello = serde_json::json!({
            "version":1, "messageId":format!("hello-{round}"), "type":"HELLO",
            "sessionId":format!("fresh-session-{round}"), "timestamp":1,
            "payload":{"extensionId":tuget_native_host::DESKTOP_EXTENSION_ID,
                "extensionVersion":"1.0.0", "supportedProtocolVersions":[1], "capabilities":[]}
        });
        let bytes = serde_json::to_vec(&hello).unwrap();
        stdin
            .write_all(&(bytes.len() as u32).to_le_bytes())
            .unwrap();
        stdin.write_all(&bytes).unwrap();
        let received = tokio::time::timeout(
            Duration::from_secs(10),
            tuget_native_host::frame::read_frame(
                stream,
                tuget_native_host::EXTENSION_TO_HOST_MAX_BYTES,
            ),
        )
        .await
        .unwrap()
        .unwrap()
        .unwrap();
        assert_eq!(
            serde_json::from_slice::<serde_json::Value>(&received).unwrap(),
            hello
        );
        if round == 0 {
            // Keep Chromium's input pipe open: the old #[tokio::main] teardown
            // could hang forever on stdin even if bridge_loop returned.
            let (stream_owned, mut child_owned) = server;
            drop(stream_owned);
            assert!(
                !wait_async(&mut child_owned, Duration::from_secs(10))
                    .await
                    .success()
            );
            drop(stdin);
            let output = child_owned.wait_with_output().unwrap();
            assert!(output.stdout.is_empty());
            assert!(String::from_utf8_lossy(&output.stderr).contains("session ended"));
        } else {
            let (stream_owned, mut child_owned) = server;
            drop(stdin);
            assert!(
                wait_async(&mut child_owned, Duration::from_secs(10))
                    .await
                    .success()
            );
            drop(stream_owned);
        }
    }
    #[cfg(unix)]
    let _ = std::fs::remove_file(&pipe_name);
}

async fn wait_async(child: &mut Child, timeout: Duration) -> ExitStatus {
    let deadline = Instant::now() + timeout;
    loop {
        if let Some(status) = child.try_wait().unwrap() {
            return status;
        }
        if Instant::now() >= deadline {
            let _ = child.kill();
            let _ = child.wait();
            let mut diagnostic = String::new();
            if let Some(stderr) = child.stderr.as_mut() {
                let _ = std::io::Read::read_to_string(stderr, &mut diagnostic);
            }
            panic!("Host did not exit: {diagnostic}");
        }
        // Let Tokio finish cancelling/dropping the test server's overlapped I/O.
        tokio::time::sleep(Duration::from_millis(25)).await;
    }
}

fn spawn_host(label: &str) -> Child {
    Command::new(env!("CARGO_BIN_EXE_tuget-native-host"))
        .arg(DESKTOP_EXTENSION_ORIGIN)
        .env("TUGET_NATIVE_PIPE", test_pipe_name(label))
        .env("TUGET_PIPE_CONNECT_TIMEOUT_MS", "5000")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .expect("spawn Native Host")
}

fn wait_with_timeout(child: &mut Child, timeout: Duration) -> ExitStatus {
    let deadline = Instant::now() + timeout;
    loop {
        if let Some(status) = child.try_wait().expect("poll child") {
            return status;
        }
        if Instant::now() >= deadline {
            let _ = child.kill();
            panic!("Native Host did not exit within {timeout:?}");
        }
        sleep(Duration::from_millis(25));
    }
}

#[test]
fn exits_successfully_when_chromium_closes_stdin() {
    let mut child = spawn_host("clean-eof");
    drop(child.stdin.take());
    let status = wait_with_timeout(&mut child, Duration::from_secs(10));
    assert!(status.success(), "clean stdin EOF should be a normal exit");
    let output = child.wait_with_output().expect("collect child output");
    assert!(
        output.stdout.is_empty(),
        "stdout must contain only framed JSON"
    );
}

#[test]
fn rejects_invalid_json_without_writing_unframed_stdout() {
    let mut child = spawn_host("invalid-json");
    let mut stdin = child.stdin.take().expect("child stdin");
    stdin.write_all(&1_u32.to_le_bytes()).expect("write length");
    stdin.write_all(b"{").expect("write invalid json");
    drop(stdin);

    let status = wait_with_timeout(&mut child, Duration::from_secs(10));
    assert!(!status.success(), "invalid JSON must fail the Host process");
    let output = child.wait_with_output().expect("collect child output");
    assert!(
        output.stdout.is_empty(),
        "diagnostics must not corrupt stdout"
    );
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(
        stderr.contains("not valid JSON"),
        "unexpected stderr: {stderr}"
    );
}
