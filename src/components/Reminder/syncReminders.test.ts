import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancel,
  createChannel,
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { alarmPermission } from "../../test/mocks/tauri";
import type { Event } from "../Event/event";
import { REMINDER_CHANNEL_ID, reminderNotificationId } from "./reminder";
import { loadScheduledIds } from "./scheduledIds";
import { syncReminders } from "./syncReminders";

const math: Event = {
  id: "math",
  title: "数学",
  daysOfWeek: [1],
  startMinutes: 9 * 60,
  endMinutes: 10 * 60,
};

const english: Event = {
  id: "english",
  title: "英語",
  daysOfWeek: [2],
  startMinutes: 10 * 60,
  endMinutes: 11 * 60,
};

const club: Event = {
  id: "club",
  title: "部活",
  daysOfWeek: [1, 2],
  startMinutes: 18 * 60,
  endMinutes: 19 * 60,
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
    expect(alarmPermission.checked).toBe(false);
    expect(alarmPermission.requested).toBe(false);
  });

  it("許可があれば開始10分前の毎週通知を組む", async () => {
    vi.mocked(isPermissionGranted).mockResolvedValue(true);
    await syncReminders([math]);
    expect(vi.mocked(createChannel)).toHaveBeenCalledWith(expect.objectContaining({ id: REMINDER_CHANNEL_ID }));
    expect(vi.mocked(cancel)).not.toHaveBeenCalled();
    expect(vi.mocked(sendNotification)).toHaveBeenCalledWith({
      id: reminderNotificationId("math", 1),
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
    expect(await loadScheduledIds()).toEqual([reminderNotificationId("math", 1)]);
    expect(alarmPermission.checked).toBe(true);
    expect(alarmPermission.requested).toBe(false);
  });

  it("選んだ曜日それぞれに通知を登録する", async () => {
    vi.mocked(isPermissionGranted).mockResolvedValue(true);
    await syncReminders([club]);
    expect(vi.mocked(sendNotification)).toHaveBeenCalledTimes(2);
    expect(await loadScheduledIds()).toEqual([
      reminderNotificationId("club", 1),
      reminderNotificationId("club", 2),
    ]);
  });

  it("アラーム許可が無ければ設定画面を開き、通知は組む", async () => {
    vi.mocked(isPermissionGranted).mockResolvedValue(true);
    alarmPermission.granted = false;
    await syncReminders([math]);
    expect(alarmPermission.checked).toBe(true);
    expect(alarmPermission.requested).toBe(true);
    expect(vi.mocked(sendNotification)).toHaveBeenCalledOnce();
  });

  it("消した予定の通知は id 指定で cancel する", async () => {
    vi.mocked(isPermissionGranted).mockResolvedValue(true);
    await syncReminders([math, english]);
    await syncReminders([english]);
    expect(vi.mocked(cancel)).toHaveBeenCalledWith([reminderNotificationId("math", 1)]);
    expect(await loadScheduledIds()).toEqual([reminderNotificationId("english", 2)]);
  });

  it("曜日を外したときはその分の通知を取り消す", async () => {
    vi.mocked(isPermissionGranted).mockResolvedValue(true);
    await syncReminders([club]);
    await syncReminders([{ ...club, daysOfWeek: [1] }]);
    expect(vi.mocked(cancel)).toHaveBeenCalledWith([reminderNotificationId("club", 2)]);
    expect(await loadScheduledIds()).toEqual([reminderNotificationId("club", 1)]);
  });

  it("cancel に失敗したら消した予定の id を残す", async () => {
    vi.mocked(isPermissionGranted).mockResolvedValue(true);
    await syncReminders([math]);
    vi.mocked(cancel).mockRejectedValueOnce(new Error("lateinit"));
    await syncReminders([]);
    expect(await loadScheduledIds()).toEqual([reminderNotificationId("math", 1)]);
    vi.mocked(cancel).mockResolvedValueOnce(undefined);
    await syncReminders([]);
    expect(vi.mocked(cancel)).toHaveBeenLastCalledWith([reminderNotificationId("math", 1)]);
    expect(await loadScheduledIds()).toEqual([]);
  });
});
