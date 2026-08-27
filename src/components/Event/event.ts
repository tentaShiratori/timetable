/**
 * @public
 */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const DayOfWeek = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
} as const satisfies Record<string, DayOfWeek>;

/**
 * @public
 */
export type Event = {
  id: string;
  title: string;
  dayOfWeek: DayOfWeek;
  startMinutes: number;
  endMinutes: number;
  note?: string;
};

/**
 * @public
 */
export type EventDraft = {
  title: string;
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
  note?: string;
};

/**
 * @public
 */
export const DAY_MINUTES = 24 * 60;

/**
 * @public
 */
export const DAY_LABELS = {
  [DayOfWeek.SUNDAY]: "日",
  [DayOfWeek.MONDAY]: "月",
  [DayOfWeek.TUESDAY]: "火",
  [DayOfWeek.WEDNESDAY]: "水",
  [DayOfWeek.THURSDAY]: "木",
  [DayOfWeek.FRIDAY]: "金",
  [DayOfWeek.SATURDAY]: "土",
};

/**
 * @public
 */
export const DAY_LABEL_ORDER = [
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
  DayOfWeek.SUNDAY,
] as const;

/**
 * @public
 */
export function isDayOfWeek(value: number): value is DayOfWeek {
  return Object.values(DayOfWeek).includes(value as never);
}

/**
 * @public
 */
export function validateEvent(draft: EventDraft): string[] {
  const errors: string[] = [];
  if (draft.title.trim() === "") {
    errors.push("タイトルを入力してください");
  }
  if (!isDayOfWeek(draft.dayOfWeek)) {
    errors.push("曜日が不正です");
  }
  if (!Number.isFinite(draft.startMinutes) || !Number.isFinite(draft.endMinutes)) {
    errors.push("時刻が不正です");
  } else {
    if (draft.startMinutes < 0 || draft.endMinutes > DAY_MINUTES) {
      errors.push("0:00〜24:00の範囲にしてください");
    }
    if (draft.endMinutes <= draft.startMinutes) {
      errors.push("終了は開始より後にしてください");
    }
  }
  return errors;
}

/**
 * @public
 */
export function formatMinutes(minutes: number): string {
  if (minutes >= DAY_MINUTES) {
    return "24:00";
  }
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${hour}:${String(minute).padStart(2, "0")}`;
}

export function parseEvents(raw: string | null): Event[] {
  if (raw === null || raw === "") {
    return [];
  }
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) {
      return [];
    }
    return data.filter(isStoredEvent);
  } catch {
    return [];
  }
}

function isStoredEvent(value: unknown): value is Event {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || record.id === "") {
    return false;
  }
  const draft: EventDraft = {
    title: typeof record.title === "string" ? record.title : "",
    dayOfWeek: typeof record.dayOfWeek === "number" ? record.dayOfWeek : -1,
    startMinutes: typeof record.startMinutes === "number" ? record.startMinutes : Number.NaN,
    endMinutes: typeof record.endMinutes === "number" ? record.endMinutes : Number.NaN,
    note: typeof record.note === "string" ? record.note : undefined,
  };
  return validateEvent(draft).length === 0;
}
