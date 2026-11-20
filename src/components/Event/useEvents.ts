import { invoke } from "@tauri-apps/api/core";
import { atom, useAtom } from "jotai";
import { useEffect } from "react";
import { resetExpiredTodos, type Event } from "./event";
import { parseEvents } from "./parseEvents";

const EVENTS_KIND = "events";

const eventsAtom = atom<Event[]>([]);
const readyAtom = atom(false);

async function loadEventsFile(): Promise<Event[]> {
  try {
    const raw = await invoke<string | null>("load_app_file", {
      kind: EVENTS_KIND,
    });
    return parseEvents(raw);
  } catch {
    return [];
  }
}

async function saveEventsFile(events: Event[]): Promise<void> {
  try {
    await invoke("save_app_file", {
      kind: EVENTS_KIND,
      contents: JSON.stringify(events),
    });
  } catch {
    // ブラウザの `pnpm dev` では Tauri が無いので保存しない
  }
}

function applyTodoResets(events: Event[], now: number): { events: Event[]; changed: boolean } {
  let changed = false;
  const next = events.map((event) => {
    const todos = event.todos;
    if (!todos || todos.length === 0) {
      return event;
    }
    const reset = resetExpiredTodos(todos, now);
    const same = reset.every((todo, index) => todo.completedAt === todos[index]?.completedAt);
    if (same) {
      return event;
    }
    changed = true;
    return { ...event, todos: reset };
  });
  return { events: next, changed };
}

type UseEvents = {
  events: Event[];
  ready: boolean;
  addEvent: (event: Event) => void;
  updateEvent: (event: Event) => void;
  removeEvent: (id: string) => void;
};

/**
 * @public
 */
export function useEvents(): UseEvents {
  const [events, setEvents] = useAtom(eventsAtom);
  const [ready, setReady] = useAtom(readyAtom);

  useEffect(() => {
    if (ready) {
      return;
    }
    let cancelled = false;
    void loadEventsFile().then((data) => {
      if (cancelled) {
        return;
      }
      const { events: next, changed } = applyTodoResets(data, Date.now());
      setEvents(next);
      setReady(true);
      if (changed) {
        void saveEventsFile(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [ready, setEvents, setReady]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    function onVisibilityChange() {
      if (document.visibilityState !== "visible") {
        return;
      }
      setEvents((current) => {
        const { events: next, changed } = applyTodoResets(current, Date.now());
        if (!changed) {
          return current;
        }
        void saveEventsFile(next);
        return next;
      });
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [ready, setEvents]);

  return {
    events,
    ready,
    addEvent: async (event) => {
      const next = [...events, event];
      setEvents(next);
      await saveEventsFile(next);
    },
    updateEvent: (event) => {
      const next = events.map((item) => (item.id === event.id ? event : item));
      setEvents(next);
      void saveEventsFile(next);
    },
    removeEvent: (id) => {
      const next = events.filter((item) => item.id !== id);
      setEvents(next);
      void saveEventsFile(next);
    },
  };
}
