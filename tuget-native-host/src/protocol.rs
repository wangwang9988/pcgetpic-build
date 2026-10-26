use jsonschema::Validator;
use serde_json::Value;
use thiserror::Error;

#[path = "../../tuget-protocol/rust/diagnostics.rs"]
mod diagnostics;

const PROTOCOL_SCHEMA: &str = include_str!(concat!(env!("OUT_DIR"), "/protocol.schema.json"));

pub const CLIENT_COMMAND_TYPES: &[&str] = &[
    "HELLO_ACK",
    "START_CAPTURE",
    "PAUSE_TASK",
    "RESUME_TASK",
    "CANCEL_TASK",
    "FOCUS_TASK_TAB",
    "RELOAD_TASK_TAB",
    "CLOSE_TASK_TAB",
    "GET_ENGINE_STATUS",
    "ACK_BATCH",
    "DOWNLOAD_RESOURCE_IN_BROWSER",
    "RESET_ENGINE_STATE",
    "SHUTDOWN_ENGINE",
];

pub const ENGINE_EVENT_TYPES: &[&str] = &[
    "HELLO",
    "ENGINE_READY",
    "ENGINE_STATUS",
    "HEARTBEAT",
    "TASK_STARTED",
    "TASK_PROGRESS",
    "RESOURCE_BATCH",
    "INTERACTION_REQUIRED",
    "INTERACTION_RESOLVED",
    "TASK_COMPLETED",
    "TASK_FAILED",
    "TASK_CANCELLED",
    "BROWSER_DOWNLOAD_STARTED",
    "BROWSER_DOWNLOAD_COMPLETED",
    "BROWSER_DOWNLOAD_FAILED",
    "ENGINE_STATE_RESET",
    "ENGINE_WARNING",
];

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MessageDirection {
    ExtensionToClient,
    ClientToExtension,
}

#[derive(Debug)]
pub struct ValidatedMessage<'a> {
    pub bytes: &'a [u8],
    pub message_type: String,
}

pub struct ProtocolValidator {
    validator: Validator,
}

impl ProtocolValidator {
    pub fn new() -> Result<Self, ProtocolError> {
        let schema: Value = serde_json::from_str(PROTOCOL_SCHEMA)
            .map_err(|error| ProtocolError::EmbeddedSchema(error.to_string()))?;
        let validator = jsonschema::draft202012::new(&schema)
            .map_err(|error| ProtocolError::EmbeddedSchema(error.to_string()))?;
        Ok(Self { validator })
    }

    pub fn validate<'a>(
        &self,
        bytes: &'a [u8],
        direction: MessageDirection,
    ) -> Result<ValidatedMessage<'a>, ProtocolError> {
        let message: Value = serde_json::from_slice(bytes)
            .map_err(|error| ProtocolError::InvalidJson(error.to_string()))?;
        self.validator.validate(&message).map_err(|_| {
            ProtocolError::Schema(diagnostics::rejection(PROTOCOL_SCHEMA, &message))
        })?;

        let message_type = message
            .get("type")
            .and_then(Value::as_str)
            .ok_or_else(|| ProtocolError::Schema("message type is missing".to_string()))?;
        let allowed_types = match direction {
            MessageDirection::ExtensionToClient => ENGINE_EVENT_TYPES,
            MessageDirection::ClientToExtension => CLIENT_COMMAND_TYPES,
        };
        if !allowed_types.contains(&message_type) {
            return Err(ProtocolError::WrongDirection {
                message_type: message_type.to_string(),
                direction,
            });
        }

        Ok(ValidatedMessage {
            bytes,
            message_type: message_type.to_string(),
        })
    }
}

#[derive(Debug, Error)]
pub enum ProtocolError {
    #[error("embedded @tuget/protocol schema cannot be compiled: {0}")]
    EmbeddedSchema(String),
    #[error("message is not valid JSON: {0}")]
    InvalidJson(String),
    #[error("message does not satisfy @tuget/protocol v1: {0}")]
    Schema(String),
    #[error("message type {message_type} is not allowed for {direction:?}")]
    WrongDirection {
        message_type: String,
        direction: MessageDirection,
    },
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn direction_allowlists_cover_every_shared_protocol_message() {
        let schema: Value = serde_json::from_str(PROTOCOL_SCHEMA).unwrap();
        let mut declared: Vec<_> = schema["oneOf"]
            .as_array()
            .unwrap()
            .iter()
            .map(|branch| branch["$ref"].as_str().unwrap().rsplit('/').next().unwrap())
            .collect();
        let mut allowed: Vec<_> = CLIENT_COMMAND_TYPES
            .iter()
            .chain(ENGINE_EVENT_TYPES.iter())
            .copied()
            .collect();
        declared.sort();
        allowed.sort();
        assert_eq!(allowed, declared);
    }

    fn event(message_type: &str, payload: Value) -> Vec<u8> {
        serde_json::to_vec(&json!({
            "version": 1,
            "messageId": "message-1",
            "type": message_type,
            "sessionId": "session-1",
            "timestamp": 1,
            "payload": payload
        }))
        .expect("serialize event")
    }

    #[test]
    fn validates_engine_events_against_the_shared_schema() {
        let validator = ProtocolValidator::new().expect("validator");
        let hello = event(
            "HELLO",
            json!({
                "extensionId": crate::DESKTOP_EXTENSION_ID,
                "extensionVersion": "1.0.0",
                "supportedProtocolVersions": [1],
                "capabilities": []
            }),
        );
        let validated = validator
            .validate(&hello, MessageDirection::ExtensionToClient)
            .expect("valid hello");
        assert_eq!(validated.message_type, "HELLO");
    }

    #[test]
    fn validates_the_clients_handshake_acknowledgement() {
        let validator = ProtocolValidator::new().expect("validator");
        let acknowledgement = event(
            "HELLO_ACK",
            json!({
                "acceptedProtocolVersion": 1,
                "clientVersion": "0.1.0",
                "capabilities": [
                    "capture.specialized",
                    "capture.generic-media",
                    "capture.backup-one",
                    "task.cancel",
                    "task.pause",
                    "task.focus-tab",
                    "interaction.login",
                    "interaction.captcha",
                    "resource.batch-ack",
                    "resource.browser-download-fallback"
                ]
            }),
        );
        let validated = validator
            .validate(&acknowledgement, MessageDirection::ClientToExtension)
            .expect("valid HELLO_ACK");
        assert_eq!(validated.message_type, "HELLO_ACK");
    }

    #[test]
    fn rejects_invalid_json_and_unknown_fields() {
        let validator = ProtocolValidator::new().expect("validator");
        assert!(matches!(
            validator.validate(b"{", MessageDirection::ExtensionToClient),
            Err(ProtocolError::InvalidJson(_))
        ));

        let mut heartbeat: Value = serde_json::from_slice(&event(
            "HEARTBEAT",
            json!({"sequence": 1, "activeTaskCount": 0}),
        ))
        .expect("heartbeat json");
        heartbeat["unexpected"] = json!(true);
        let bytes = serde_json::to_vec(&heartbeat).expect("heartbeat bytes");
        assert!(matches!(
            validator.validate(&bytes, MessageDirection::ExtensionToClient),
            Err(ProtocolError::Schema(_))
        ));
    }

    #[test]
    fn validates_task_reload_and_rejects_unscoped_or_injected_tab_ids() {
        let validator = ProtocolValidator::new().expect("validator");
        let mut message: Value =
            serde_json::from_slice(&event("RELOAD_TASK_TAB", json!({}))).unwrap();
        assert!(
            validator
                .validate(
                    &serde_json::to_vec(&message).unwrap(),
                    MessageDirection::ClientToExtension
                )
                .is_err()
        );
        message["taskId"] = json!("task-1");
        assert!(
            validator
                .validate(
                    &serde_json::to_vec(&message).unwrap(),
                    MessageDirection::ClientToExtension
                )
                .is_ok()
        );
        assert!(
            validator
                .validate(
                    &serde_json::to_vec(&message).unwrap(),
                    MessageDirection::ExtensionToClient
                )
                .is_err()
        );
        message["payload"] = json!({"tabId": 42});
        assert!(
            validator
                .validate(
                    &serde_json::to_vec(&message).unwrap(),
                    MessageDirection::ClientToExtension
                )
                .is_err()
        );
    }

    #[test]
    fn rejects_a_valid_message_in_the_wrong_direction() {
        let validator = ProtocolValidator::new().expect("validator");
        let status = event("GET_ENGINE_STATUS", json!({}));
        assert!(matches!(
            validator.validate(&status, MessageDirection::ExtensionToClient),
            Err(ProtocolError::WrongDirection { .. })
        ));
    }
}
