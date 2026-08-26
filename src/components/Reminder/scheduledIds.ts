import { invoke } from "@tauri-apps/api/core";

const KIND = "reminder_ids";

export async function loadScheduledIds(): Promise<number[]> {
  try {
    const raw = await invoke<string | null>("load_app_file", { kind: KIND });
    return parseScheduledIds(raw);
  } catch {
    return [];
  }
}

export async function saveScheduledIds(ids: number[]): Promise<void> {
  try {
    await invoke("save_app_file", {
      kind: KIND,
      contents: JSON.stringify([...new Set(ids)]),
    });
  } catch {
    // ブラウザの `pnpm dev` では Tauri が無いので保存しない
  }
}

function parseScheduledIds(raw: string | null): number[] {
  if (raw === null || raw === "") {
    return [];
  }
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) {
      return [];
    }
    return data.filter((id): id is number => Number.isInteger(id));
  } catch {
    return [];
  }
}
