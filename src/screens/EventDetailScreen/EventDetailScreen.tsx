import { formatDaysOfWeek, formatMinutes, type EventTodo } from "../../components/Event/event";
import { useEvents } from "../../components/Event/useEvents";
import { useRouter } from "../../components/Route/useRouter";
import { editEventPath, parseDetailEventRoute } from "../EventEditScreen/eventRoute";

/**
 * @public
 */
export function EventDetailScreen() {
  const { path } = useRouter();
  const parsed = parseDetailEventRoute(path);
  if (!parsed) {
    return null;
  }
  return <EventDetailBody key={parsed.id} id={parsed.id} />;
}

function EventDetailBody({ id }: { id: string }) {
  const { events, updateEvent } = useEvents();
  const router = useRouter();
  const event = events.find((item) => item.id === id);

  if (!event) {
    return (
      <section className="event-detail">
        <h1>予定の詳細</h1>
        <p>予定が見つかりません</p>
        <button type="button" onClick={() => router.back()}>
          戻る
        </button>
      </section>
    );
  }

  const current = event;
  const todos = current.todos ?? [];

  function toggleTodo(todoId: string) {
    const nextTodos = todos.map((todo) => toggleCompleted(todo, todoId));
    updateEvent({ ...current, todos: nextTodos });
  }

  return (
    <section className="event-detail">
      <h1>{current.title}</h1>
      <p className="event-detail-when">
        {`${formatDaysOfWeek(current.daysOfWeek)} ${formatMinutes(current.startMinutes)}〜${formatMinutes(current.endMinutes)}`}
      </p>
      {current.note ? <p className="event-detail-note">{current.note}</p> : null}
      <TodoChecklist todos={todos} onToggle={toggleTodo} />
      <div className="event-detail-actions">
        <button type="button" onClick={() => router.push(editEventPath(current.id))}>
          編集
        </button>
        <button type="button" onClick={() => router.back()}>
          戻る
        </button>
      </div>
    </section>
  );
}

function TodoChecklist({ todos, onToggle }: { todos: EventTodo[]; onToggle: (todoId: string) => void }) {
  if (todos.length === 0) {
    return <p className="event-detail-todos-empty">やることはありません</p>;
  }
  return (
    <ul className="event-detail-todos">
      {todos.map((todo) => {
        const checked = todo.completedAt !== undefined;
        return (
          <li key={todo.id}>
            <label className={checked ? "event-detail-todo-done" : undefined}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => {
                  onToggle(todo.id);
                }}
              />
              {todo.title}
            </label>
          </li>
        );
      })}
    </ul>
  );
}

function toggleCompleted(todo: EventTodo, todoId: string): EventTodo {
  if (todo.id !== todoId) {
    return todo;
  }
  if (todo.completedAt !== undefined) {
    return { id: todo.id, title: todo.title };
  }
  return { ...todo, completedAt: Date.now() };
}
