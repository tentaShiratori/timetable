import { invoke } from "@tauri-apps/api/core";
import { atom, useAtom } from "jotai";
import { useEffect } from "react";
import { parseEvents, type Event } from "./event";

const EVENTS_KIND = "events";

const eventsAtom = atom<Event[]>([]);
const readyAtom = atom(false);

async function loadEventsFile(): Promise<Event[]> {
  try {
    const raw = await invoke<string | null>("load_app_file", { kind: EVENTS_KIND });
    return parseEvents(raw);
  } catch {
    return [];
  }
}

async function saveEventsFile(events: Event[]): Promise<void> {
  try {
    await invoke("save_app_file", { kind: EVENTS_KIND, contents: JSON.stringify(events) });
  } catch {
    // ブラウザの `pnpm dev` では Tauri が無いので保存しない
  }
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
      setEvents(data);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [ready, setEvents, setReady]);

  return {
    events,
    ready,
    addEvent: (event) => {
      const next = [...events, event];
      setEvents(next);
      void saveEventsFile(next);
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
