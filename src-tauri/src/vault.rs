//! Cofre do token desktop (Windows Credential Manager / keyring).

use keyring::Entry;

const SERVICE: &str = "com.prokapa.jarvis-desktop";
const ACCOUNT: &str = "JARVIS_DESKTOP_TOKEN";

fn entry() -> Result<Entry, String> {
    Entry::new(SERVICE, ACCOUNT).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_desktop_token() -> Result<Option<String>, String> {
    match entry()?.get_password() {
        Ok(p) if !p.trim().is_empty() => Ok(Some(p)),
        Ok(_) => Ok(None),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn set_desktop_token(token: String) -> Result<(), String> {
    let limpo = token.trim();
    if limpo.is_empty() {
        return clear_desktop_token();
    }
    entry()?.set_password(limpo).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clear_desktop_token() -> Result<(), String> {
    match entry()?.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn service_e_account_fixos() {
        assert_eq!(SERVICE, "com.prokapa.jarvis-desktop");
        assert_eq!(ACCOUNT, "JARVIS_DESKTOP_TOKEN");
    }
}
