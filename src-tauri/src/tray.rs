//! Bandeja do sistema: Mostrar/Ocultar, estado do cérebro e Sair.

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, Runtime,
};

pub struct StatusBandeja<R: Runtime>(pub MenuItem<R>);

pub fn instalar(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let mostrar = MenuItem::with_id(app, "mostrar", "Mostrar", true, None::<&str>)?;
    let ocultar = MenuItem::with_id(app, "ocultar", "Ocultar", true, None::<&str>)?;
    let status = MenuItem::with_id(app, "status", "JARVIS…", false, None::<&str>)?;
    let sair = MenuItem::with_id(app, "sair", "Sair", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&mostrar, &ocultar, &status, &sair])?;

    app.manage(StatusBandeja(status));

    let icon = app
        .default_window_icon()
        .cloned()
        .ok_or("ícone padrão ausente")?;

    let _tray = TrayIconBuilder::with_id("jarvis")
        .icon(icon)
        .menu(&menu)
        .tooltip("Jarvis")
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "mostrar" => mostrar_principal(app),
            "ocultar" => {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.hide();
                }
            }
            "sair" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                mostrar_principal(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

pub fn mostrar_principal(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

#[tauri::command]
pub fn atualizar_status_cerebro(app: AppHandle, no_ar: bool) -> Result<(), String> {
    let texto = if no_ar {
        "JARVIS no ar"
    } else {
        "JARVIS inacessível"
    };
    if let Some(state) = app.try_state::<StatusBandeja<tauri::Wry>>() {
        state.0.set_text(texto).map_err(|e| e.to_string())?;
    }
    if let Some(tray) = app.tray_by_id("jarvis") {
        let _ = tray.set_tooltip(Some(texto));
    }
    Ok(())
}

#[tauri::command]
pub fn mostrar_janela_principal(app: AppHandle) {
    mostrar_principal(&app);
}
