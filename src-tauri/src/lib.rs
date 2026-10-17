//! Jarvis Desktop — casca Tauri (F3).
//!
//! Sem sidecar, sem shell e sem boot de backend local: o cérebro fica na API
//! da VM. Cofre (keyring), bandeja e atalho entram nas fases seguintes.

use tauri::Manager;

#[tauri::command]
fn get_api_base() -> String {
    // Preferência do usuário vive no front (localStorage); este comando só
    // devolve o padrão da LAN para quem ainda não configurou.
    "http://192.168.20.210:8000".into()
}

#[tauri::command]
fn app_version(app: tauri::AppHandle) -> String {
    app.package_info().version.to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]),
        ))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        // Updater desligado até a esteira própria (spec §9 / F7).
        .invoke_handler(tauri::generate_handler![get_api_base, app_version])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o Jarvis Desktop");
}

#[cfg(test)]
mod tests {
    use super::get_api_base;

    #[test]
    fn api_base_padrao_e_a_vm() {
        assert_eq!(get_api_base(), "http://192.168.20.210:8000");
    }
}
