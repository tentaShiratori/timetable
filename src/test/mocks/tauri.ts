import { vi } from "vitest";

const { appFiles, alarmPermission } = vi.hoisted(() => ({
  appFiles: new Map<string, string>(),
  alarmPermission: { granted: true, checked: false, requested: false },
}));

export { appFiles, alarmPermission };

vi.mock("@tauri-apps/api/core", () => ({
  invoke: async (cmd: string, args?: { kind: string; contents?: string }) => {
    if (cmd === "load_app_file") {
      return appFiles.get(args!.kind) ?? null;
    }
    if (cmd === "save_app_file") {
      appFiles.set(args!.kind, args!.contents!);
      return;
    }
    if (cmd === "is_alarm_permission_granted") {
      alarmPermission.checked = true;
      return alarmPermission.granted;
    }
    if (cmd === "request_alarm_permission") {
      alarmPermission.requested = true;
      return;
    }
    throw new Error(`unknown command: ${cmd}`);
  },
}));
