import { SubmitEvent, useState } from "react";
import {
  DAY_MINUTES,
  formatMinutes,
  sortDaysOfWeek,
  validateEvent,
  type DayOfWeek,
  type Event,
  type EventTodo,
} from "../../components/Event/event";
import { useEvents } from "../../components/Event/useEvents";
import { useRouter } from "../../components/Route/useRouter";
import { DayOfWeekPicker } from "./DayOfWeekPicker";
import { parseEventRoute, type ParsedEventRoute } from "./eventRoute";

/**
 * @public
 */
export function EventEditScreen() {
  const { path } = useRouter();
  const parsed = parseEventRoute(path);
  if (!parsed) {
    return null;
  }
  return <EventEditForm key={path} parsed={parsed} />;
}

function defaultEnd(startMinutes: number): number {
  return Math.min(startMinutes + 60, DAY_MINUTES);
}

function timeChoices(kind: "start" | "end"): number[] {
  const first = kind === "start" ? 0 : 30;
  const last = kind === "start" ? DAY_MINUTES - 30 : DAY_MINUTES;
  const values: number[] = [];
  for (let minutes = first; minutes <= last; minutes += 30) {
    values.push(minutes);
  }
  return values;
}

function withCurrent(choices: number[], current: number): number[] {
  if (choices.includes(current)) {
    return choices;
  }
  return [...choices, current].sort((a, b) => a - b);
}

function EventEditForm({ parsed }: { parsed: ParsedEventRoute }) {
  const { events, addEvent, updateEvent, removeEvent } = useEvents();
  const router = useRouter();
  const existing = parsed.mode === "edit" ? events.find((event) => event.id === parsed.id) : undefined;

  const [title, setTitle] = useState(existing?.title ?? "");
  const [daysOfWeek, setDaysOfWeek] = useState<DayOfWeek[]>(
    parsed.mode === "create" ? [parsed.dayOfWeek] : sortDaysOfWeek(existing?.daysOfWeek ?? []),
  );
  const [startMinutes, setStartMinutes] = useState(
    parsed.mode === "create" ? parsed.startMinutes : (existing?.startMinutes ?? 8 * 60),
  );
  const [endMinutes, setEndMinutes] = useState(
    parsed.mode === "create" ? defaultEnd(parsed.startMinutes) : (existing?.endMinutes ?? 9 * 60),
  );
  const [note, setNote] = useState(existing?.note ?? "");
  const [todos, setTodos] = useState<EventTodo[]>(existing?.todos ?? []);
  const [errors, setErrors] = useState<string[]>([]);

  if (parsed.mode === "edit" && !existing) {
    return (
      <section className="event-edit">
        <h1>予定を編集</h1>
        <p>予定が見つかりません</p>
        <button type="button" onClick={() => router.back()}>
          戻る
        </button>
      </section>
    );
  }

  const isEdit = parsed.mode === "edit";

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const draft = {
      title,
      daysOfWeek,
      startMinutes,
      endMinutes,
      note: note.trim() === "" ? undefined : note,
      todos,
    };
    const nextErrors = validateEvent(draft);
    if (nextErrors.length > 0) {
      setErrors(nextErrors);
      return;
    }
    const trimmedTodos = todos.map((todo) => ({
      ...todo,
      title: todo.title.trim(),
    }));
    const nextEvent: Event = {
      id: existing?.id ?? crypto.randomUUID(),
      title: title.trim(),
      daysOfWeek: sortDaysOfWeek(daysOfWeek),
      startMinutes,
      endMinutes,
      note: draft.note,
      ...(trimmedTodos.length > 0 ? { todos: trimmedTodos } : {}),
    };
    if (isEdit) {
      updateEvent(nextEvent);
    } else {
      addEvent(nextEvent);
    }
    router.back();
  }

  return (
    <section className="event-edit">
      <h1>{isEdit ? "予定を編集" : "予定を追加"}</h1>
      <form className="event-edit-form" onSubmit={onSubmit}>
        {errors.length > 0 ? (
          <ul className="event-edit-errors" role="alert">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : null}
        <label>
          タイトル
          <input value={title} onChange={(change) => setTitle(change.target.value)} autoComplete="off" />
        </label>
        <DayOfWeekPicker value={daysOfWeek} onChange={setDaysOfWeek} />
        <label>
          開始
          <select value={startMinutes} onChange={(change) => setStartMinutes(Number(change.target.value))}>
            {withCurrent(timeChoices("start"), startMinutes).map((minutes) => (
              <option key={minutes} value={minutes}>
                {formatMinutes(minutes)}
              </option>
            ))}
          </select>
        </label>
        <label>
          終了
          <select value={endMinutes} onChange={(change) => setEndMinutes(Number(change.target.value))}>
            {withCurrent(timeChoices("end"), endMinutes).map((minutes) => (
              <option key={minutes} value={minutes}>
                {formatMinutes(minutes)}
              </option>
            ))}
          </select>
        </label>
        <label>
          メモ
          <textarea value={note} onChange={(change) => setNote(change.target.value)} rows={3} />
        </label>
        <TodoEditor todos={todos} onChange={setTodos} />
        <div className="event-edit-actions">
          <button type="submit">保存</button>
          {isEdit ? (
            <button
              type="button"
              className="event-edit-delete"
              onClick={() => {
                removeEvent(parsed.id);
                router.home();
              }}
            >
              削除
            </button>
          ) : null}
          <button type="button" onClick={() => router.back()}>
            戻る
          </button>
        </div>
      </form>
    </section>
  );
}

function TodoEditor({ todos, onChange }: { todos: EventTodo[]; onChange: (todos: EventTodo[]) => void }) {
  return (
    <fieldset className="event-edit-todos">
      <legend>やること</legend>
      <ul className="event-edit-todo-list">
        {todos.map((todo, index) => (
          <li key={todo.id} className="event-edit-todo-row">
            <label>
              項目 {index + 1}
              <input
                value={todo.title}
                onChange={(change) => {
                  const nextTitle = change.target.value;
                  onChange(todos.map((item) => (item.id === todo.id ? { ...item, title: nextTitle } : item)));
                }}
                autoComplete="off"
              />
            </label>
            <button
              type="button"
              className="event-edit-todo-remove"
              onClick={() => {
                onChange(todos.filter((item) => item.id !== todo.id));
              }}
            >
              削除
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => {
          onChange([...todos, { id: crypto.randomUUID(), title: "" }]);
        }}
      >
        やることを追加
      </button>
    </fieldset>
  );
}
