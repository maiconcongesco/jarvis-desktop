//! Janela flutuante (Ctrl+Espaço): sem moldura, sempre no topo, fora da barra de tarefas.

use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

const LABEL: &str = "floating";

#[tauri::command]
pub fn toggle_janela_flutuante(app: AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window(LABEL) {
        let visivel = w.is_visible().unwrap_or(false);
        if visivel {
            w.hide().map_err(|e| e.to_string())?;
        } else {
            w.show().map_err(|e| e.to_string())?;
            let _ = w.set_focus();
        }
        return Ok(());
    }

    let win = WebviewWindowBuilder::new(&app, LABEL, WebviewUrl::App("/flutuante".into()))
        .title("Jarvis")
        .inner_size(440.0, 580.0)
        .min_inner_size(320.0, 360.0)
        .resizable(true)
        .decorations(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .visible(true)
        .build()
        .map_err(|e| e.to_string())?;
    let _ = win.set_focus();
    Ok(())
}

#[tauri::command]
pub fn fechar_janela_flutuante(app: AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window(LABEL) {
        w.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}
