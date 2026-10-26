//! Shared Native Host/client rejection diagnostics. Never format the rejected payload.
use jsonschema::error::ValidationErrorKind;
use serde_json::{Value, json};
use sha2::{Digest, Sha256};

fn safe_path(value: &str) -> String {
    value
        .chars()
        .take(160)
        .map(|c| {
            if c.is_ascii_alphanumeric() || "/._-~".contains(c) {
                c
            } else {
                '_'
            }
        })
        .collect()
}

pub fn rejection(schema_text: &str, message: &Value) -> String {
    let fingerprint = format!(
        "{:x}",
        Sha256::digest(schema_text.replace("\r\n", "\n").as_bytes())
    );
    let mut schema: Value = serde_json::from_str(schema_text).expect("validated embedded schema");
    let candidate = message.get("type").and_then(Value::as_str).unwrap_or("");
    let known = schema["oneOf"].as_array().is_some_and(|branches| {
        branches
            .iter()
            .any(|branch| branch["$ref"].as_str() == Some(format!("#/$defs/{candidate}").as_str()))
    });
    let mut details = Vec::new();
    if known {
        schema.as_object_mut().unwrap().remove("oneOf");
        schema["$ref"] = json!(format!("#/$defs/{candidate}"));
        if let Ok(validator) = jsonschema::draft202012::new(&schema) {
            for error in validator.iter_errors(message).take(3) {
                let mut item = json!({
                    "path": safe_path(error.instance_path().as_str()),
                    "keyword": error.kind().keyword(),
                });
                match error.kind() {
                    ValidationErrorKind::MaxLength { limit }
                    | ValidationErrorKind::MinLength { limit }
                    | ValidationErrorKind::MaxItems { limit }
                    | ValidationErrorKind::MinItems { limit } => {
                        item["limit"] = json!(limit);
                    }
                    _ => {}
                }
                match error.instance().as_ref() {
                    Value::String(value) => item["actual_length"] = json!(value.chars().count()),
                    Value::Array(value) => item["actual_length"] = json!(value.len()),
                    _ => {}
                }
                details.push(item);
            }
        }
    } else {
        details.push(json!({"path": "/type", "keyword": "enum"}));
    }
    json!({"type": if known { candidate } else { "UNKNOWN" },
        "schema_sha256": fingerprint, "errors": details})
    .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    const SCHEMA: &str = include_str!("../schema/protocol.schema.json");

    #[test]
    fn identifies_url_constraint_without_logging_payload_and_ignores_other_oneof_branches() {
        let message = json!({"version":1, "messageId":"event-test", "sessionId":"session-test",
            "timestamp":1, "type":"TASK_STARTED", "taskId":"task-test",
            "payload":{"url":format!("https://private.example/?token={}", "x".repeat(35000)), "tabId":42}});
        let output = rejection(SCHEMA, &message);
        let details: Value = serde_json::from_str(&output).unwrap();
        assert_eq!(details["type"], "TASK_STARTED");
        assert_eq!(details["errors"][0]["path"], "/payload/url");
        assert_eq!(details["errors"][0]["keyword"], "maxLength");
        assert_eq!(details["errors"][0]["limit"], 32768);
        assert_eq!(details["schema_sha256"].as_str().unwrap().len(), 64);
        assert!(
            !output.contains("private.example")
                && !output.contains("token")
                && !output.contains("xxxx")
        );
        assert!(output.len() < 1000);
    }

    #[test]
    fn reports_nested_status_failure_and_unknown_types_without_raw_values() {
        let message = json!({"version":1,"messageId":"event-test","sessionId":"session-test",
        "timestamp":1,"type":"ENGINE_STATUS","payload":{"profileId":"test","tasks":[{
            "taskId":"task-test","url":format!("https://{}", "x".repeat(35000)),
            "channel":"generic-media","captureDepth":"light","keepTabOpen":true,
            "status":"capturing","paused":false,"createdAt":1,"updatedAt":1,
            "discoveredResourceCount":0,"deliveredResourceCount":0
        }]}});
        assert!(rejection(SCHEMA, &message).contains("/payload/tasks/0/url"));
        assert!(!rejection(SCHEMA, &json!({"type":"PRIVATE_TOKEN"})).contains("PRIVATE_TOKEN"));
    }
}
