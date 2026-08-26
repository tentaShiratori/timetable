import {
  cancel,
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
import { loadScheduledIds, saveScheduledIds } from "./scheduledIds";

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
  const storedIds = await loadScheduledIds();
  if (token !== syncToken) {
    return;
  }
  const currentIds = events.map((event) => reminderNotificationId(event.id));
  const currentIdSet = new Set(currentIds);
  const deletedIds = storedIds.filter((id) => !currentIdSet.has(id));
  // 削除されたイベントの通知をcancelし、cancelに失敗したらidを残しておく
  const leftoverDeleted = await cancelDeletedIds(deletedIds);
  if (token !== syncToken) {
    return;
  }

  if (events.length === 0) {
    await saveScheduledIds(leftoverDeleted);
    return;
  }

  let granted = await isPermissionGranted();
  if (!granted) {
    granted = (await requestPermission()) === "granted";
  }
  if (!granted || token !== syncToken) {
    await saveScheduledIds([...leftoverDeleted, ...storedIds.filter((id) => currentIdSet.has(id))]);
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
  if (token !== syncToken) {
    return;
  }
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
  // 通知に登録してあるイベントをidを保存する
  await saveScheduledIds([...leftoverDeleted, ...currentIds]);
}

async function cancelDeletedIds(deletedIds: number[]): Promise<number[]> {
  if (deletedIds.length === 0) {
    return [];
  }
  try {
    await cancel(deletedIds);
    return [];
  } catch {
    // cancel できなければ id を残し、次の同期でやり直す
    return deletedIds;
  }
}
