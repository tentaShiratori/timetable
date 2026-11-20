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
export type EventTodo = {
  id: string;
  title: string;
  completedAt?: number;
};

/**
 * @public
 */
export type Event = {
  id: string;
  title: string;
  daysOfWeek: DayOfWeek[];
  startMinutes: number;
  endMinutes: number;
  note?: string;
  todos?: EventTodo[];
};

/**
 * @public
 */
export type EventDraft = {
  title: string;
  daysOfWeek: number[];
  startMinutes: number;
  endMinutes: number;
  note?: string;
  todos?: EventTodo[];
};

/**
 * @public
 */
export type Occurrence = {
  eventId: string;
  dayOfWeek: DayOfWeek;
  startMinutes: number;
  endMinutes: number;
  title: string;
};

/**
 * @public
 */
export const DAY_MINUTES = 24 * 60;

const TODO_RESET_MS = 24 * 60 * 60 * 1000;

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
export const WEEKDAY_DAYS: DayOfWeek[] = [
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
];

/**
 * @public
 */
export const WEEKEND_DAYS: DayOfWeek[] = [DayOfWeek.SUNDAY, DayOfWeek.SATURDAY];

/**
 * @public
 */
export const EVERY_DAY: DayOfWeek[] = [
  DayOfWeek.SUNDAY,
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
];

/**
 * @public
 */
export function isDayOfWeek(value: number): value is DayOfWeek {
  return Object.values(DayOfWeek).includes(value as never);
}

/**
 * @public
 */
export function sortDaysOfWeek(days: DayOfWeek[]): DayOfWeek[] {
  return [...days].sort((a, b) => a - b);
}

/**
 * @public
 */
export function validateEvent(draft: EventDraft): string[] {
  const errors: string[] = [];
  if (draft.title.trim() === "") {
    errors.push("タイトルを入力してください");
  }
  if (draft.daysOfWeek.length === 0) {
    errors.push("曜日を選んでください");
  } else {
    const seen = new Set<number>();
    for (const day of draft.daysOfWeek) {
      if (!isDayOfWeek(day)) {
        errors.push("曜日が不正です");
        break;
      }
      if (seen.has(day)) {
        errors.push("曜日が重複しています");
        break;
      }
      seen.add(day);
    }
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
  if (draft.todos?.some((todo) => todo.title.trim() === "")) {
    errors.push("やることの名前を入力してください");
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

/**
 * @public
 */
export function formatDaysOfWeek(days: DayOfWeek[]): string {
  return sortDaysOfWeek(days)
    .map((day) => `${DAY_LABELS[day]}曜`)
    .join("・");
}

/**
 * @public
 */
export function resetExpiredTodos(todos: EventTodo[], now: number): EventTodo[] {
  return todos.map((todo) => {
    if (todo.completedAt === undefined) {
      return todo;
    }
    if (now - todo.completedAt >= TODO_RESET_MS) {
      return { id: todo.id, title: todo.title };
    }
    return todo;
  });
}

/**
 * @public
 */
export function toOccurrences(events: Event[]): Occurrence[] {
  return events.flatMap((event) =>
    event.daysOfWeek.map((dayOfWeek) => ({
      eventId: event.id,
      dayOfWeek,
      startMinutes: event.startMinutes,
      endMinutes: event.endMinutes,
      title: event.title,
    })),
  );
}
