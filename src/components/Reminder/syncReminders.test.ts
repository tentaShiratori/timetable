import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelAll,
  createChannel,
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import type { Event } from "../Event/event";
import { REMINDER_CHANNEL_ID, reminderNotificationId } from "./reminder";
import { syncReminders } from "./syncReminders";

const math: Event = {
  id: "math",
  title: "数学",
  dayOfWeek: 0,
  startMinutes: 9 * 60,
  endMinutes: 10 * 60,
};

function enableTauri(): void {
  Object.defineProperty(window, "__TAURI_INTERNALS__", { value: {}, configurable: true });
}

describe("syncReminders", () => {
  beforeEach(() => {
    enableTauri();
  });

  afterEach(() => {
    Reflect.deleteProperty(window, "__TAURI_INTERNALS__");
  });

  it("Tauri が無いときはプラグインを呼ばない", async () => {
    Reflect.deleteProperty(window, "__TAURI_INTERNALS__");
    await syncReminders([math]);
    expect(vi.mocked(isPermissionGranted)).not.toHaveBeenCalled();
    expect(vi.mocked(sendNotification)).not.toHaveBeenCalled();
  });

  it("予定が空なら pending を全部取り消す", async () => {
    await syncReminders([]);
    expect(vi.mocked(cancelAll)).toHaveBeenCalledOnce();
    expect(vi.mocked(sendNotification)).not.toHaveBeenCalled();
  });

  it("許可が無ければ通知を組まない", async () => {
    vi.mocked(isPermissionGranted).mockResolvedValue(false);
    vi.mocked(requestPermission).mockResolvedValue("denied");
    await syncReminders([math]);
    expect(vi.mocked(requestPermission)).toHaveBeenCalledOnce();
    expect(vi.mocked(sendNotification)).not.toHaveBeenCalled();
  });

  it("許可があれば開始10分前の毎週通知を組む", async () => {
    vi.mocked(isPermissionGranted).mockResolvedValue(true);
    await syncReminders([math]);
    expect(vi.mocked(createChannel)).toHaveBeenCalledWith(expect.objectContaining({ id: REMINDER_CHANNEL_ID }));
    expect(vi.mocked(cancelAll)).toHaveBeenCalledOnce();
    expect(vi.mocked(sendNotification)).toHaveBeenCalledWith({
      id: reminderNotificationId("math"),
      title: "数学",
      body: "10分後に開始（9:00〜10:00）",
      channelId: REMINDER_CHANNEL_ID,
      autoCancel: true,
      schedule: {
        at: undefined,
        interval: {
          interval: { weekday: 2, hour: 8, minute: 50 },
          allowWhileIdle: true,
        },
        every: undefined,
      },
    });
  });
});
