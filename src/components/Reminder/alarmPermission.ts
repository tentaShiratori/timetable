import { invoke } from "@tauri-apps/api/core";

export async function isAlarmPermissionGranted(): Promise<boolean> {
  return await invoke<boolean>("is_alarm_permission_granted");
}

export async function requestAlarmPermission(): Promise<void> {
  await invoke("request_alarm_permission");
}
