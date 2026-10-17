//! Jarvis Desktop — casca Tauri.
//!
//! Sem sidecar, sem shell e sem boot de backend local: o cérebro fica na API
//! da VM. F6: bandeja, autostart (--hidden), janela flutuante e notificações
//! (plugins). Cofre (keyring) na F4.

mod flutuante;
mod tray;
mod vault;

use tauri::{Manager, WindowEvent};

#[tauri::command]
fn get_api_base() -> String {
    "http://192.168.20.210:8000".into()
}

#[tauri::command]
fn app_version(app: tauri::AppHandle) -> String {
    app.package_info().version.to_string()
}

fn iniciar_oculto() -> bool {
    std::env::args().any(|a| a == "--hidden")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            tray::mostrar_principal(app);
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_process::init())
        // tauri-plugin-http: ligar pós-reboot (cargo update + capability); até lá o
        // front usa fetch (Vite proxy no dev / webview na LAN).
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]),
        ))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            if let Err(e) = tray::instalar(app.handle()) {
                eprintln!("bandeja: {e}");
            }
            if iniciar_oculto() {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.hide();
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() != "main" {
                return;
            }
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_api_base,
            app_version,
            vault::get_desktop_token,
            vault::set_desktop_token,
            vault::clear_desktop_token,
            tray::atualizar_status_cerebro,
            tray::mostrar_janela_principal,
            flutuante::toggle_janela_flutuante,
            flutuante::fechar_janela_flutuante,
        ])
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

    #[test]
    fn iniciar_oculto_detecta_flag() {
        // A função lê args do processo; só garante que compila e retorna bool.
        let _ = super::iniciar_oculto();
    }
}
