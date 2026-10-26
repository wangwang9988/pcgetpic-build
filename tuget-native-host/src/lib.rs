pub mod config;
pub mod diagnostics;
pub mod frame;
pub mod pipe;
pub mod protocol;
pub mod registration;

pub const NATIVE_HOST_NAME: &str = "com.tuget.desktop";
pub const DESKTOP_EXTENSION_ID: &str = "dojjjgfogfhepmnoejgaofgooohddlcm";
pub const DESKTOP_EXTENSION_ORIGIN: &str = "chrome-extension://dojjjgfogfhepmnoejgaofgooohddlcm/";
pub const PROTOCOL_VERSION: u64 = 1;

/// Chrome permits up to 64 MiB from an extension to a Native Host.
pub const EXTENSION_TO_HOST_MAX_BYTES: usize = 64 * 1024 * 1024;
/// Chrome accepts at most 1 MiB from a Native Host to an extension.
pub const HOST_TO_EXTENSION_MAX_BYTES: usize = 1024 * 1024;
