//! Invoked explicitly by the client before Chromium starts. Never self-register
//! during Native Messaging startup: discovery of the host would be circular.
#[cfg(windows)]
use std::io::Read;
use std::path::Path;
#[cfg(windows)]
use windows_sys::Win32::Foundation::APPMODEL_ERROR_NO_PACKAGE;
#[cfg(windows)]
use windows_sys::Win32::Storage::Packaging::Appx::GetCurrentPackageFullName;
#[cfg(windows)]
use windows_sys::Win32::System::Registry::*;

#[cfg(windows)]
fn wide(value: &std::ffi::OsStr) -> Vec<u16> {
    use std::os::windows::ffi::OsStrExt;
    value.encode_wide().chain(Some(0)).collect()
}

#[cfg(windows)]
pub fn register(manifest_path: &Path) -> Result<(), String> {
    let mut size = 0;
    if unsafe { GetCurrentPackageFullName(&mut size, std::ptr::null_mut()) }
        != APPMODEL_ERROR_NO_PACKAGE
    {
        return Err("[TUGET-REGISTRY-VIEW] registration helper still has package identity; external registry visibility is not verified".into());
    }
    let mut bytes = Vec::new();
    std::fs::File::open(manifest_path)
        .map_err(|e| e.to_string())?
        .take(16_385)
        .read_to_end(&mut bytes)
        .map_err(|e| e.to_string())?;
    if bytes.len() > 16_384 {
        return Err("registration manifest exceeds limit".into());
    }
    let manifest: serde_json::Value =
        serde_json::from_slice(bytes.strip_prefix(&[0xef, 0xbb, 0xbf]).unwrap_or(&bytes))
            .map_err(|e| e.to_string())?;
    let name = validate_manifest(
        &manifest,
        &std::env::current_exe().map_err(|e| e.to_string())?,
    )?;
    let absolute = manifest_path.canonicalize().map_err(|e| e.to_string())?;
    // Strip the extended prefix for Chromium's manifest path reader.
    let absolute = absolute
        .to_string_lossy()
        .trim_start_matches(r"\\?\")
        .to_string();
    let value = wide(absolute.as_ref());
    for browser in ["Google\\Chrome", "Chromium"] {
        let key = wide(format!("Software\\{browser}\\NativeMessagingHosts\\{name}").as_ref());
        unsafe {
            let mut handle = std::ptr::null_mut();
            let status = RegCreateKeyExW(
                HKEY_CURRENT_USER,
                key.as_ptr(),
                0,
                std::ptr::null(),
                REG_OPTION_NON_VOLATILE,
                KEY_SET_VALUE | KEY_QUERY_VALUE,
                std::ptr::null(),
                &mut handle,
                std::ptr::null_mut(),
            );
            if status != 0 {
                return Err(format!("external registry open failed: {status}"));
            }
            let status = RegSetValueExW(
                handle,
                std::ptr::null(),
                0,
                REG_SZ,
                value.as_ptr().cast(),
                (value.len() * 2) as u32,
            );
            let mut readback = vec![0u16; value.len()];
            let mut length = (readback.len() * 2) as u32;
            let read = RegGetValueW(
                handle,
                std::ptr::null(),
                std::ptr::null(),
                RRF_RT_REG_SZ,
                std::ptr::null_mut(),
                readback.as_mut_ptr().cast(),
                &mut length,
            );
            RegCloseKey(handle);
            if status != 0 || read != 0 || readback != value {
                return Err(format!(
                    "external registry write/readback failed: {status}/{read}"
                ));
            }
        }
    }
    eprintln!("[TuGet Native Host] registration verified in unpackaged HKCU view");
    Ok(())
}

#[cfg(not(windows))]
pub fn register(_manifest_path: &Path) -> Result<(), String> {
    Ok(())
}

#[cfg_attr(not(windows), allow(dead_code))]
fn validate_manifest<'a>(
    manifest: &'a serde_json::Value,
    executable: &Path,
) -> Result<&'a str, String> {
    let name = manifest["name"]
        .as_str()
        .ok_or("missing Native Host name")?;
    let probe = cfg!(debug_assertions)
        && name
            .strip_prefix("com.tuget.review.")
            .is_some_and(|suffix| {
                suffix.len() == 32 && suffix.chars().all(|c| c.is_ascii_hexdigit())
            });
    if !matches!(
        name,
        crate::NATIVE_HOST_NAME
            | "com.tuget.desktop.dev"
            | "com.tuget.desktop.exe"
            | "com.tuget.desktop.msix"
    ) && !probe
    {
        return Err("unsupported Native Host name".into());
    }
    if manifest["type"] != "stdio"
        || manifest["allowed_origins"] != serde_json::json!([crate::DESKTOP_EXTENSION_ORIGIN])
    {
        return Err("unexpected Native Host manifest permissions".into());
    }
    let host = Path::new(manifest["path"].as_str().ok_or("missing host executable")?)
        .canonicalize()
        .map_err(|e| e.to_string())?;
    let executable = executable.canonicalize().map_err(|e| e.to_string())?;
    if host.to_string_lossy().to_lowercase() != executable.to_string_lossy().to_lowercase() {
        return Err("manifest must refer to the registration helper itself".into());
    }
    Ok(name)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn registration_rejects_other_names_origins_and_executables_before_writing() {
        let executable = std::env::current_exe().unwrap();
        let manifest = serde_json::json!({"name": crate::NATIVE_HOST_NAME, "type":"stdio",
            "allowed_origins":[crate::DESKTOP_EXTENSION_ORIGIN], "path":executable});
        assert!(validate_manifest(&manifest, &executable).is_ok());
        for name in [
            "com.tuget.desktop.exe",
            "com.tuget.desktop.msix",
            "com.tuget.desktop.dev",
        ] {
            let mut channel = manifest.clone();
            channel["name"] = name.into();
            assert_eq!(validate_manifest(&channel, &executable).unwrap(), name);
        }
        let mut invalid = manifest.clone();
        invalid["name"] = "com.other.product".into();
        assert!(
            validate_manifest(&invalid, &executable)
                .unwrap_err()
                .contains("name")
        );
        invalid = manifest.clone();
        invalid["allowed_origins"] = serde_json::json!(["chrome-extension://other/"]);
        assert!(
            validate_manifest(&invalid, &executable)
                .unwrap_err()
                .contains("permissions")
        );
        invalid = manifest;
        invalid["path"] = executable
            .parent()
            .unwrap()
            .to_string_lossy()
            .into_owned()
            .into();
        assert!(
            validate_manifest(&invalid, &executable)
                .unwrap_err()
                .contains("itself")
        );
    }
}
