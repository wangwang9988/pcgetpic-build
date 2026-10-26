use std::env;
use std::fs;
use std::path::{Path, PathBuf};

fn main() {
    let manifest_dir = PathBuf::from(env::var_os("CARGO_MANIFEST_DIR").expect("manifest dir"));
    let schema_path = env::var_os("TUGET_PROTOCOL_SCHEMA")
        .map(PathBuf::from)
        .unwrap_or_else(|| {
            manifest_dir
                .join("..")
                .join("tuget-protocol")
                .join("schema")
                .join("protocol.schema.json")
        });

    println!("cargo:rerun-if-env-changed=TUGET_PROTOCOL_SCHEMA");
    println!("cargo:rerun-if-changed={}", schema_path.display());

    let schema = fs::read_to_string(&schema_path).unwrap_or_else(|error| {
        panic!(
            "failed to read shared @tuget/protocol schema at {}: {error}",
            schema_path.display()
        )
    });
    let value: serde_json::Value = serde_json::from_str(&schema).unwrap_or_else(|error| {
        panic!(
            "shared @tuget/protocol schema is invalid JSON at {}: {error}",
            schema_path.display()
        )
    });
    let schema_id = value.get("$id").and_then(serde_json::Value::as_str);
    if schema_id != Some("https://schemas.tuget.local/protocol/v1/protocol.schema.json") {
        panic!(
            "unexpected @tuget/protocol schema id at {}: {:?}",
            schema_path.display(),
            schema_id
        );
    }

    let out_dir = PathBuf::from(env::var_os("OUT_DIR").expect("out dir"));
    write_if_changed(&out_dir.join("protocol.schema.json"), schema.as_bytes());
}

fn write_if_changed(path: &Path, content: &[u8]) {
    if fs::read(path).ok().as_deref() == Some(content) {
        return;
    }
    fs::write(path, content)
        .unwrap_or_else(|error| panic!("failed to write {}: {error}", path.display()));
}
