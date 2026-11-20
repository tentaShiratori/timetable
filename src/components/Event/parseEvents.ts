import {
  isDayOfWeek,
  sortDaysOfWeek,
  validateEvent,
  type DayOfWeek,
  type Event,
  type EventDraft,
  type EventTodo,
} from "./event";

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
  const daysOfWeek = parseDaysOfWeek(record);
  if (daysOfWeek === null) {
    return null;
  }
  const draft: EventDraft = {
    title: typeof record.title === "string" ? record.title : "",
    daysOfWeek,
    startMinutes: typeof record.startMinutes === "number" ? record.startMinutes : Number.NaN,
    endMinutes: typeof record.endMinutes === "number" ? record.endMinutes : Number.NaN,
    note: typeof record.note === "string" ? record.note : undefined,
  };
  if (validateEvent(draft).length > 0) {
    return null;
  }
  const todos = parseTodos(record.todos);
  return {
    id: record.id,
    title: draft.title,
    daysOfWeek: sortDaysOfWeek(daysOfWeek),
    startMinutes: draft.startMinutes,
    endMinutes: draft.endMinutes,
    ...(draft.note !== undefined ? { note: draft.note } : {}),
    ...(todos !== undefined ? { todos } : {}),
  };
}

function parseDaysOfWeek(record: Record<string, unknown>): DayOfWeek[] | null {
  if (Array.isArray(record.daysOfWeek)) {
    const days: DayOfWeek[] = [];
    const seen = new Set<number>();
    for (const value of record.daysOfWeek) {
      if (typeof value !== "number" || !isDayOfWeek(value)) {
        return null;
      }
      if (seen.has(value)) {
        return null;
      }
      seen.add(value);
      days.push(value);
    }
    if (days.length === 0) {
      return null;
    }
    return days;
  }
  if (typeof record.dayOfWeek === "number" && isDayOfWeek(record.dayOfWeek)) {
    return [record.dayOfWeek];
  }
  return null;
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
