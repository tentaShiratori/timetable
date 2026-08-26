import {
  cancelAll,
  createChannel,
  Importance,
  isPermissionGranted,
  requestPermission,
  Schedule,
  sendNotification,
  Visibility,
} from "@tauri-apps/plugin-notification";
import type { Event } from "../Event/event";
import { REMINDER_CHANNEL_ID, reminderBody, reminderFireAt, reminderNotificationId } from "./reminder";

let syncToken = 0;

export async function syncReminders(events: Event[]): Promise<void> {
  if (!("__TAURI_INTERNALS__" in window)) {
    return;
  }
  const token = ++syncToken;
  try {
    await applyReminders(events, token);
  } catch {
    // ブラウザの `pnpm dev` やネイティブ側の失敗は無視する
  }
}

async function applyReminders(events: Event[], token: number): Promise<void> {
  if (events.length === 0) {
    await cancelAll();
    return;
  }
  let granted = await isPermissionGranted();
  if (!granted) {
    granted = (await requestPermission()) === "granted";
  }
  if (!granted || token !== syncToken) {
    return;
  }
  await createChannel({
    id: REMINDER_CHANNEL_ID,
    name: "予定のリマインド",
    description: "予定の10分前に知らせます",
    importance: Importance.High,
    visibility: Visibility.Private,
    vibration: true,
  });
  await cancelAll();
  for (const event of events) {
    const fireAt = reminderFireAt(event);
    sendNotification({
      id: reminderNotificationId(event.id),
      title: event.title,
      body: reminderBody(event),
      channelId: REMINDER_CHANNEL_ID,
      autoCancel: true,
      schedule: Schedule.interval(
        {
          weekday: fireAt.weekday,
          hour: fireAt.hour,
          minute: fireAt.minute,
        },
        true,
      ),
    });
  }
}
