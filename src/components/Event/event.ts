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
  dayOfWeek: DayOfWeek;
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
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
  note?: string;
  todos?: EventTodo[];
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
export function parseEvents(raw: string | null): Event[] {
  if (raw === null || raw === "") {
    return [];
  }
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) {
      return [];
    }
    return data.flatMap((item) => {
      const event = toStoredEvent(item);
      return event ? [event] : [];
    });
  } catch {
    return [];
  }
}

function toStoredEvent(value: unknown): Event | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || record.id === "") {
    return null;
  }
  const draft: EventDraft = {
    title: typeof record.title === "string" ? record.title : "",
    dayOfWeek: typeof record.dayOfWeek === "number" ? record.dayOfWeek : -1,
    startMinutes: typeof record.startMinutes === "number" ? record.startMinutes : Number.NaN,
    endMinutes: typeof record.endMinutes === "number" ? record.endMinutes : Number.NaN,
    note: typeof record.note === "string" ? record.note : undefined,
  };
  if (validateEvent(draft).length > 0 || !isDayOfWeek(draft.dayOfWeek)) {
    return null;
  }
  const todos = parseTodos(record.todos);
  return {
    id: record.id,
    title: draft.title,
    dayOfWeek: draft.dayOfWeek,
    startMinutes: draft.startMinutes,
    endMinutes: draft.endMinutes,
    ...(draft.note !== undefined ? { note: draft.note } : {}),
    ...(todos !== undefined ? { todos } : {}),
  };
}

function parseTodos(value: unknown): EventTodo[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    return undefined;
  }
  const todos: EventTodo[] = [];
  for (const item of value) {
    const todo = toStoredTodo(item);
    if (todo) {
      todos.push(todo);
    }
  }
  return todos;
}

function toStoredTodo(value: unknown): EventTodo | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || record.id === "") {
    return null;
  }
  if (typeof record.title !== "string" || record.title.trim() === "") {
    return null;
  }
  if (record.completedAt === undefined) {
    return { id: record.id, title: record.title };
  }
  if (typeof record.completedAt !== "number" || !Number.isFinite(record.completedAt)) {
    return { id: record.id, title: record.title };
  }
  return { id: record.id, title: record.title, completedAt: record.completedAt };
}
