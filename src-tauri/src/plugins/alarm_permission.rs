use tauri::{plugin::TauriPlugin, Runtime};

#[cfg(target_os = "android")]
struct AlarmPermissionApi<R: Runtime>(tauri::plugin::PluginHandle<R>);

#[cfg(target_os = "android")]
#[derive(serde::Deserialize)]
struct AlarmPermissionResult {
    granted: bool,
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    tauri::plugin::Builder::new("alarm-permission")
        .setup(|app, api| {
            #[cfg(target_os = "android")]
            {
                use tauri::Manager;
                let handle =
                    api.register_android_plugin("com.tenta.timetable", "AlarmPermissionPlugin")?;
                app.manage(AlarmPermissionApi(handle));
            }
            #[cfg(not(target_os = "android"))]
            {
                let _ = (app, api);
            }
            Ok(())
        })
        .build()
}

#[tauri::command]
pub fn is_alarm_permission_granted<R: Runtime>(app: tauri::AppHandle<R>) -> Result<bool, String> {
    #[cfg(target_os = "android")]
    {
        let result: AlarmPermissionResult = run_android_plugin(&app, "isPermissionGranted")?;
        Ok(result.granted)
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = app;
        Ok(true)
    }
}

#[tauri::command]
pub fn request_alarm_permission<R: Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    #[cfg(target_os = "android")]
    {
        run_android_plugin::<R, ()>(&app, "requestPermission")
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = app;
        Ok(())
    }
}

#[cfg(target_os = "android")]
fn run_android_plugin<R: Runtime, T: serde::de::DeserializeOwned>(
    app: &tauri::AppHandle<R>,
    command: &str,
) -> Result<T, String> {
    use tauri::Manager;
    app.state::<AlarmPermissionApi<R>>()
        .0
        .run_mobile_plugin(command, ())
        .map_err(|e| e.to_string())
}
