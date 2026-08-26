import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancel,
  createChannel,
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import type { Event } from "../Event/event";
import { REMINDER_CHANNEL_ID, reminderNotificationId } from "./reminder";
import { loadScheduledIds } from "./scheduledIds";
import { syncReminders } from "./syncReminders";

const math: Event = {
  id: "math",
  title: "数学",
  dayOfWeek: 0,
  startMinutes: 9 * 60,
  endMinutes: 10 * 60,
};

const english: Event = {
  id: "english",
  title: "英語",
  dayOfWeek: 1,
  startMinutes: 10 * 60,
  endMinutes: 11 * 60,
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

  it("予定が空で保持している id も無ければ cancel しない", async () => {
    await syncReminders([]);
    expect(vi.mocked(cancel)).not.toHaveBeenCalled();
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
    expect(vi.mocked(cancel)).not.toHaveBeenCalled();
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
    expect(await loadScheduledIds()).toEqual([reminderNotificationId("math")]);
  });

  it("消した予定の通知は id 指定で cancel する", async () => {
    vi.mocked(isPermissionGranted).mockResolvedValue(true);
    await syncReminders([math, english]);
    await syncReminders([english]);
    expect(vi.mocked(cancel)).toHaveBeenCalledWith([reminderNotificationId("math")]);
    expect(await loadScheduledIds()).toEqual([reminderNotificationId("english")]);
  });

  it("cancel に失敗したら消した予定の id を残す", async () => {
    vi.mocked(isPermissionGranted).mockResolvedValue(true);
    await syncReminders([math]);
    vi.mocked(cancel).mockRejectedValueOnce(new Error("lateinit"));
    await syncReminders([]);
    expect(await loadScheduledIds()).toEqual([reminderNotificationId("math")]);
    vi.mocked(cancel).mockResolvedValueOnce(undefined);
    await syncReminders([]);
    expect(vi.mocked(cancel)).toHaveBeenLastCalledWith([reminderNotificationId("math")]);
    expect(await loadScheduledIds()).toEqual([]);
  });
});
