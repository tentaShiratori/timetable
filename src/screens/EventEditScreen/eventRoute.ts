import { isDayOfWeek, type DayOfWeek } from "../../components/Event/event";

/**
 * @public
 */
export function newEventPath(dayOfWeek: DayOfWeek, startMinutes: number): string {
  return `/event/new/${dayOfWeek}/${startMinutes}`;
}

/**
 * @public
 */
export function editEventPath(id: string): string {
  return `/event/${encodeURIComponent(id)}`;
}

export type ParsedEventRoute =
  | { mode: "create"; dayOfWeek: DayOfWeek; startMinutes: number }
  | { mode: "edit"; id: string };

export function parseEventRoute(path: string): ParsedEventRoute | null {
  const createMatch = /^\/event\/new\/(\d+)\/(\d+)$/.exec(path);
  if (createMatch) {
    const dayOfWeek = Number(createMatch[1]);
    const startMinutes = Number(createMatch[2]);
    if (isDayOfWeek(dayOfWeek) && Number.isFinite(startMinutes)) {
      return { mode: "create", dayOfWeek, startMinutes };
    }
    return null;
  }
  const editMatch = /^\/event\/([^/]+)$/.exec(path);
  if (editMatch && editMatch[1] !== "new") {
    return { mode: "edit", id: decodeURIComponent(editMatch[1]) };
  }
  return null;
}
