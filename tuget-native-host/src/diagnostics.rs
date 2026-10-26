//! Optional bounded bridge trace. Never write native-message payloads to this log.
use std::fs::OpenOptions;
use std::io::Write;
use std::path::Path;
use std::sync::Mutex;

const MAX_LOG_BYTES: u64 = 1024 * 1024;
static LOG_LOCK: Mutex<()> = Mutex::new(());

pub fn record(message: &str) {
    if let Some(path) = std::env::var_os("TUGET_NATIVE_LOG") {
        append(Path::new(&path), message);
    }
}

fn append(path: &Path, message: &str) {
    let Ok(_guard) = LOG_LOCK.lock() else {
        return;
    };
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let oversized = std::fs::metadata(path).is_ok_and(|metadata| metadata.len() >= MAX_LOG_BYTES);
    let mut options = OpenOptions::new();
    options.create(true).write(true);
    if oversized {
        options.truncate(true);
    } else {
        options.append(true);
    }
    if let Ok(mut file) = options.open(path) {
        if oversized {
            let _ = writeln!(file, "[旧诊断日志超过 1 MiB，已轮换]");
        }
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_or(0, |duration| duration.as_millis());
        let message: String = message
            .chars()
            .take(2048)
            .map(|ch| if ch == '\n' || ch == '\r' { ' ' } else { ch })
            .collect();
        let launch = std::env::var("TUGET_DIAGNOSTIC_LAUNCH_ID").unwrap_or_default();
        let launch = if launch.len() == 36
            && launch.bytes().enumerate().all(|(i, c)| {
                if matches!(i, 8 | 13 | 18 | 23) {
                    c == b'-'
                } else {
                    c.is_ascii_hexdigit()
                }
            }) {
            launch.as_str()
        } else {
            "unknown"
        };
        let _ = writeln!(
            file,
            "{timestamp} pid={} launch_id={launch} {message}",
            std::process::id()
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rotates_trace_and_bounds_each_entry() {
        let path = std::env::temp_dir().join(format!(
            "tuget-host-log-test-{}-{}.log",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let file = std::fs::File::create(&path).unwrap();
        file.set_len(MAX_LOG_BYTES).unwrap();
        drop(file);
        append(&path, &format!("pipe_connected\n{}", "中".repeat(4000)));
        let text = std::fs::read_to_string(&path).unwrap();
        assert!(text.contains("已轮换"));
        assert!(text.contains("pipe_connected "));
        assert!(text.len() < 10_000);
        assert_eq!(text.lines().count(), 2);
        std::fs::remove_file(path).unwrap();
    }
}
