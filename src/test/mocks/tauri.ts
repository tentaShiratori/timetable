import { vi } from "vitest";

const { appFiles } = vi.hoisted(() => ({
  appFiles: new Map<string, string>(),
}));

export { appFiles };

vi.mock("@tauri-apps/api/core", () => ({
  invoke: async (cmd: string, args?: { kind: string; contents?: string }) => {
    if (cmd === "load_app_file") {
      return appFiles.get(args!.kind) ?? null;
    }
    throw new Error(`unknown command: ${cmd}`);
  },
}));
