import { DAY_MINUTES, formatMinutes, type DayOfWeek, type Event } from "../Event/event";

const REMINDER_OFFSET_MINUTES = 10;
export const REMINDER_CHANNEL_ID = "reminders";

export function reminderFireAt(event: Event): { weekday: number; hour: number; minute: number } {
  let minutes = event.startMinutes - REMINDER_OFFSET_MINUTES;
  let dayOfWeek: DayOfWeek = event.dayOfWeek;
  if (minutes < 0) {
    minutes += DAY_MINUTES;
    dayOfWeek = ((dayOfWeek + 6) % 7) as DayOfWeek;
  }
  return {
    weekday: toTauriWeekday(dayOfWeek),
    hour: Math.floor(minutes / 60),
    minute: minutes % 60,
  };
}

export function reminderNotificationId(eventId: string): number {
  // Tauri の通知 id は 32bit 整数だけ受け付ける。予定の UUID を毎回同じ数字に畳む。
  // Java の String.hashCode と同じ: hash = hash * 31 + 次の文字コード
  let hash = 0;
  for (const char of eventId) {
    // Math.imul は JS の * と違い、32bit の乗算として溢れた桁を捨てる
    // | 0 は加算の結果も 32bit 符号付き整数に切り詰める（プラグインの i32 に合わせる）
    hash = (Math.imul(31, hash) + char.charCodeAt(0)) | 0;
  }
  // 0 は「id 未指定」と区別がつかないので 1 にする
  return hash === 0 ? 1 : hash;
}

export function reminderBody(event: Event): string {
  return `10分後に開始（${formatMinutes(event.startMinutes)}〜${formatMinutes(event.endMinutes)}）`;
}

function toTauriWeekday(dayOfWeek: DayOfWeek): number {
  return dayOfWeek + 1;
}
