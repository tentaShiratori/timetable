mod alarm_permission;

use tauri::Manager;

fn app_file_path(app: &tauri::AppHandle, kind: &str) -> Result<std::path::PathBuf, String> {
    if kind.is_empty() || !kind.chars().all(|c| c.is_ascii_alphanumeric() || c == '_') {
        return Err("invalid kind".into());
    }
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(dir.join(format!("{kind}.json")))
}

#[tauri::command]
fn load_app_file(app: tauri::AppHandle, kind: String) -> Result<Option<String>, String> {
    let path = app_file_path(&app, &kind)?;
    match std::fs::read_to_string(path) {
        Ok(contents) => Ok(Some(contents)),
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(err) => Err(err.to_string()),
    }
}

#[tauri::command]
fn save_app_file(app: tauri::AppHandle, kind: String, contents: String) -> Result<(), String> {
    let path = app_file_path(&app, &kind)?;
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    std::fs::write(path, contents).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(alarm_permission::plugin())
        .invoke_handler(tauri::generate_handler![
            load_app_file,
            save_app_file,
            alarm_permission::is_alarm_permission_granted,
            alarm_permission::request_alarm_permission
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
